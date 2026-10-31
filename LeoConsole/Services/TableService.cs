using System.Linq.Expressions;
using System.Reflection;
using LeoConsole.Models;
using LeoCore.Managers;
using LeoCore.Models.Personal;
using LeoCore.Models.Users;
using LeoDatabase.Context;
using LeoDatabase.Models.Personal;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace LeoConsole.Services;

public sealed record TableField(string Name, string Column, Type Type, bool Nullable, bool Key, bool Generated,
    bool ReadOnly, bool Secret, string Default, int? MaxLength)
{
    public string[]? Choices => (System.Nullable.GetUnderlyingType(Type) ?? Type) is { IsEnum: true } type
        ? (Nullable ? new[] { "" }.Concat(Enum.GetNames(type)).ToArray() : Enum.GetNames(type))
        : Type == typeof(bool) ? ["False", "True"] : null;
}
public sealed record TableDefinition(string Name, Type EntityType, IReadOnlyList<TableField> Fields);
public sealed record TableRecord(IReadOnlyDictionary<string, string> Values);
public interface ITableService
{
    Task<IReadOnlyList<TableDefinition>> CatalogAsync(CancellationToken ct);
    Task<PageResult<TableRecord>> PageAsync(string table, int page, string? search, long? owner, CancellationToken ct);
    Task SaveAsync(string table, TableRecord? original, IReadOnlyDictionary<string, string> values, long? owner, CancellationToken ct);
    Task DeleteAsync(string table, TableRecord original, long? owner, CancellationToken ct);
    Task RevokeAsync(long userId, long sessionId, CancellationToken ct);
}

/// <summary>Record-level editor over EF's mapped tables. Never executes arbitrary SQL or changes schema.</summary>
public sealed class TableService(DatabaseWork work) : ITableService
{
    public Task<IReadOnlyList<TableDefinition>> CatalogAsync(CancellationToken ct) => work.Run((db, _) =>
        Task.FromResult<IReadOnlyList<TableDefinition>>(db.Model.GetEntityTypes().Select(Describe).OrderBy(x => x.Name).ToArray()));

    private static TableDefinition Describe(IEntityType entity)
    {
        var instance = Activator.CreateInstance(entity.ClrType)!;
        return new(entity.GetTableName()!, entity.ClrType, entity.GetProperties().OrderByDescending(x => x.IsPrimaryKey())
            .ThenBy(x => x.Name).Select(p => new TableField(p.Name, p.GetColumnName(), p.ClrType, p.IsNullable, p.IsPrimaryKey(),
                p.IsPrimaryKey() && p.ValueGenerated == ValueGenerated.OnAdd,
                p.Name is "CreatedAt" or "UpdatedAt", p.Name.Contains("Hash", StringComparison.OrdinalIgnoreCase),
                FieldValue.Format(p.PropertyInfo?.GetValue(instance)), p.GetMaxLength())).ToArray());
    }
    private static IEntityType Entity(LeoDbContext db, string table) => db.Model.GetEntityTypes()
        .SingleOrDefault(x => x.GetTableName() == table) ?? throw new ArgumentException("Unknown mapped table.");

    public Task<PageResult<TableRecord>> PageAsync(string table, int page, string? search, long? owner, CancellationToken ct) =>
        work.Run(async (db, _) =>
        {
            var entity = Entity(db, table);
            var method = typeof(TableService).GetMethod(nameof(QueryPage), BindingFlags.NonPublic | BindingFlags.Static)!
                .MakeGenericMethod(entity.ClrType);
            return await (Task<PageResult<TableRecord>>)method.Invoke(null, [db, Describe(entity), page, search, owner, ct])!;
        });

    private static async Task<PageResult<TableRecord>> QueryPage<T>(LeoDbContext db, TableDefinition definition,
        int page, string? search, long? owner, CancellationToken ct) where T : class
    {
        IQueryable<T> query = db.Set<T>().AsNoTracking();
        if (owner is { } userId) query = query.Where(x => EF.Property<long>(x, "UserId") == userId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var parameter = Expression.Parameter(typeof(T), "row");
            Expression body = Expression.Constant(false);
            foreach (var field in definition.Fields.Where(f => f.Type == typeof(string) && !f.Secret))
            {
                var property = Expression.Property(parameter, field.Name);
                var match = Expression.Call(Expression.Call(property, nameof(string.ToLower), Type.EmptyTypes),
                    nameof(string.Contains), Type.EmptyTypes, Expression.Constant(search.Trim().ToLowerInvariant()));
                body = Expression.OrElse(body, Expression.AndAlso(Expression.NotEqual(property, Expression.Constant(null)), match));
            }
            foreach (var field in definition.Fields.Where(f => f.Key && f.Type == typeof(long)))
                if (long.TryParse(search, out var id)) body = Expression.OrElse(body,
                    Expression.Equal(Expression.Property(parameter, field.Name), Expression.Constant(id)));
            query = query.Where(Expression.Lambda<Func<T, bool>>(body, parameter));
        }
        IOrderedQueryable<T>? ordered = null;
        foreach (var key in definition.Fields.Where(f => f.Key))
            ordered = ordered is null ? query.OrderBy(x => EF.Property<object>(x, key.Name))
                : ordered.ThenBy(x => EF.Property<object>(x, key.Name));
        var count = await query.CountAsync(ct);
        page = Math.Clamp(page, 1, Math.Max(1, (count + 9) / 10));
        var rows = await (ordered ?? query).Skip((page - 1) * 10).Take(10).ToListAsync(ct);
        return new(rows.Select(row => new TableRecord(definition.Fields.ToDictionary(f => f.Name,
            f => FieldValue.Format(typeof(T).GetProperty(f.Name)!.GetValue(row))))).ToArray(), page, 10, count);
    }

    public async Task SaveAsync(string table, TableRecord? original, IReadOnlyDictionary<string, string> values,
        long? owner, CancellationToken ct) => await work.Run(async (db, manager) =>
    {
        if (owner is { } userId)
        {
            if (table == "weight_measurements")
            {
                var details = new WeightMeasurementDetails
                {
                    Weight = (decimal)FieldValue.Parse(values["Weight"], typeof(decimal), false)!,
                    WeightUnit = (WeightUnit)FieldValue.Parse(values["WeightUnit"], typeof(WeightUnit), false)!,
                    MeasuredAt = (DateTime)FieldValue.Parse(values["MeasuredAt"], typeof(DateTime), false)!
                };
                if (original is null) await manager.AddWeightAsync(userId, details, ct);
                else await manager.EditWeightAsync(userId, long.Parse(original.Values["Id"]), details, ct);
            }
            else if (table == "user_sessions")
            {
                var details = new SessionDetails((DateTime)FieldValue.Parse(values["ExpiresAt"], typeof(DateTime), false)!, values["Device"]);
                if (original is null) await manager.AddSessionAsync(userId, details, ct);
                else await manager.EditSessionAsync(userId, long.Parse(original.Values["Id"]), details, ct);
            }
            else throw new ArgumentException("Unsupported user collection.");
            return true;
        }
        var entity = Entity(db, table);
        var definition = Describe(entity);
        var row = original is null ? Activator.CreateInstance(entity.ClrType)!
            : await Find(db, entity, original, ct);
        // Parse all values before changing the tracked entity.
        var changes = definition.Fields.Where(f => !f.ReadOnly && !(original is not null && f.Key) &&
            !(original is null && f.Generated)).Select(f => (Field: f,
                Value: ParseField(f, values.GetValueOrDefault(f.Name) ?? ""))).ToArray();
        foreach (var change in changes) entity.ClrType.GetProperty(change.Field.Name)!.SetValue(row, change.Value);
        if (original is null) db.Add(row);
        await db.SaveChangesAsync(ct);
        return true;
    });

    private static object? ParseField(TableField field, string value)
    {
        if (field.MaxLength is { } length && value.Length > length)
            throw new ArgumentException($"{field.Column} must contain at most {length} characters.");
        try { return FieldValue.Parse(value, field.Type, field.Nullable); }
        catch (ArgumentException error) { throw new ArgumentException($"{field.Column}: {error.Message}"); }
    }
    private static async Task<object> Find(LeoDbContext db, IEntityType entity, TableRecord original, CancellationToken ct)
    {
        var keys = entity.FindPrimaryKey()!.Properties.Select(p => FieldValue.Parse(original.Values[p.Name], p.ClrType, false)).ToArray();
        return await db.FindAsync(entity.ClrType, keys, ct) ?? throw new KeyNotFoundException("Record no longer exists.");
    }
    public async Task DeleteAsync(string table, TableRecord original, long? owner, CancellationToken ct) =>
        await work.Run(async (db, manager) =>
        {
            if (owner is { } id)
            {
                var rowId = long.Parse(original.Values["Id"]);
                if (table == "weight_measurements") await manager.DeleteWeightAsync(id, rowId, ct);
                else if (table == "user_sessions") await manager.DeleteSessionAsync(id, rowId, ct);
                else throw new ArgumentException("Unsupported user collection.");
            }
            else { db.Remove(await Find(db, Entity(db, table), original, ct)); await db.SaveChangesAsync(ct); }
            return true;
        });
    public async Task RevokeAsync(long userId, long sessionId, CancellationToken ct) => await work.Run(async (_, manager) =>
    { await manager.RevokeSessionAsync(userId, sessionId, ct); return true; });
}
