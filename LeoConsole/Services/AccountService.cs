using LeoCore.Managers;
using LeoDatabase.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace LeoConsole.Services;

public sealed class DatabaseWork(IServiceScopeFactory scopes, DatabaseAvailability availability)
{
    public async Task<T> Run<T>(Func<LeoDbContext, UserManager, Task<T>> operation)
    {
        if (!availability.IsConfigured) throw new InvalidOperationException("Set ConnectionStrings__LeoDatabase, then restart.");
        await using var scope = scopes.CreateAsyncScope();
        try
        {
            return await operation(scope.ServiceProvider.GetRequiredService<LeoDbContext>(),
                scope.ServiceProvider.GetRequiredService<UserManager>());
        }
        catch (DbUpdateException) { throw new InvalidOperationException("Cannot save: check required fields, duplicate keys and related records. No changes were saved."); }
        catch (PostgresException error) { throw new InvalidOperationException($"PostgreSQL rejected the operation (code {error.SqlState}). Check the schema and permissions."); }
        catch (NpgsqlException) { throw new InvalidOperationException("PostgreSQL is unavailable. Check the connection settings."); }
    }
}

public sealed class AccountService(DatabaseWork work) : IAccountService
{
    public Task<AccountDraft> LoadAsync(long userId, CancellationToken ct) => work.Run(async (_, manager) =>
    {
        var user = await manager.FindAsync(userId, ct) ?? throw new KeyNotFoundException("User no longer exists.");
        return new AccountDraft(user.Nickname, new()
        {
            Sex = user.Profile?.Sex, BirthDate = user.Profile?.BirthDate, Height = user.Profile?.Height,
            HeightUnit = user.Profile?.HeightUnit, Country = user.Profile?.Country,
            City = user.Profile?.City, Timezone = user.Profile?.Timezone
        }, new()
        {
            Language = user.Settings?.Language ?? "en", WeightMeasureUnit = user.Settings?.WeightMeasureUnit ?? LeoDatabase.Models.Personal.WeightUnit.Kg,
            LengthMeasureUnit = user.Settings?.LengthMeasureUnit ?? LeoDatabase.Models.Personal.LengthUnit.Cm
        });
    });
    public Task<long> SaveAsync(long? userId, AccountDraft draft, CancellationToken ct) =>
        work.Run((_, manager) => manager.SaveAccountAsync(userId, draft.Nickname, draft.Profile, draft.Settings, ct));
}
