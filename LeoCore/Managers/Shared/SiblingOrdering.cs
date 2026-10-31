using LeoDatabase.Context;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers.Shared;

internal static class SiblingOrdering
{
    public static async Task MoveAsync<T>(
        LeoDbContext database, T entity, IQueryable<T> siblingsQuery, string positionProperty,
        int newPosition, CancellationToken cancellationToken) where T : class
    {
        // Refresh position values after acquiring the parent lock; the same
        // context may have tracked siblings before another editor changed them.
        var positions = await siblingsQuery.AsNoTracking()
            .Select(x => new
            {
                Id = EF.Property<long>(x, "Id"),
                Position = EF.Property<int>(x, positionProperty)
            }).ToListAsync(cancellationToken);
        var originalPositions = positions.ToDictionary(x => x.Id, x => x.Position);
        var id = database.Entry(entity).Property<long>("Id").CurrentValue;
        var current = positions.Single(x => x.Id == id);
        var maxPosition = positions.Max(x => x.Position);
        if (newPosition > maxPosition)
            throw new ArgumentOutOfRangeException(nameof(newPosition),
                $"Position must be between 1 and {maxPosition}.");
        if (newPosition == current.Position)
        {
            var unchanged = database.Entry(entity).Property<int>(positionProperty);
            unchanged.OriginalValue = current.Position;
            unchanged.CurrentValue = current.Position;
            unchanged.IsModified = false;
            return;
        }

        var changes = positions
            .Where(x => x.Id == id ||
                (newPosition < current.Position
                    ? x.Position >= newPosition && x.Position < current.Position
                    : x.Position > current.Position && x.Position <= newPosition))
            .ToDictionary(x => x.Id, x => x.Id == id
                ? newPosition
                : x.Position + (newPosition < current.Position ? 1 : -1));
        var affected = await siblingsQuery.Where(x => changes.Keys.Contains(EF.Property<long>(x, "Id")))
            .ToListAsync(cancellationToken);

        // First park every changed row at a distinct, unused positive position.
        // Temporary positions must also avoid all final destinations. This works
        // with immediate unique indexes and position >= 1 check constraints.
        var reserved = positions.Select(x => x.Position).Concat(changes.Values).ToHashSet();
        var temporary = new Dictionary<long, int>();
        var candidate = 1L;
        foreach (var changedId in changes.Keys)
        {
            while (candidate <= int.MaxValue && reserved.Contains((int)candidate)) candidate++;
            if (candidate > int.MaxValue)
                throw new InvalidOperationException("No temporary position is available for reordering.");
            temporary.Add(changedId, (int)candidate);
            reserved.Add((int)candidate++);
        }
        foreach (var item in affected)
        {
            var itemId = database.Entry(item).Property<long>("Id").CurrentValue;
            var position = database.Entry(item).Property<int>(positionProperty);
            position.OriginalValue = originalPositions[itemId];
            position.CurrentValue = temporary[itemId];
            position.IsModified = true;
        }
        await database.SaveChangesAsync(cancellationToken);

        // WriteAsync saves these final values before committing the transaction.
        foreach (var item in affected)
        {
            var itemId = database.Entry(item).Property<long>("Id").CurrentValue;
            database.Entry(item).Property<int>(positionProperty).CurrentValue = changes[itemId];
        }
    }
}
