using LeoConsole.Models;
using LeoCore.Managers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using UserEntity = LeoDatabase.Models.Users.User;

namespace LeoConsole.Services;

public sealed class UserService(IServiceScopeFactory scopes, DatabaseAvailability availability) : IUserService
{
    public Task<PageResult<UserRow>> GetPageAsync(string? search, int page, int size, CancellationToken cancellationToken) =>
        Run(async manager =>
        {
            if (page < 1 || size is < 1 or > 100) throw new ArgumentOutOfRangeException(nameof(page));
            var count = await manager.CountAsync(search, cancellationToken);
            var last = Math.Max(1, (int)Math.Ceiling((double)count / size));
            page = Math.Min(page, last);
            var skip = checked((page - 1) * size);
            var users = string.IsNullOrWhiteSpace(search)
                ? await manager.ListAsync(skip, size, cancellationToken)
                : await manager.SearchAsync(search, skip, size, cancellationToken);
            return new PageResult<UserRow>(users.Select(Map).ToArray(), page, size, count);
        });

    public Task<UserRow?> FindAsync(long id, CancellationToken cancellationToken) =>
        Run(async manager => (await manager.FindAsync(id, cancellationToken)) is { } user ? Map(user) : null);

    public async Task CreateAsync(string nickname, CancellationToken cancellationToken) =>
        await Run(async manager => { await manager.CreateAsync(nickname, cancellationToken); return true; });

    public async Task EditAsync(long id, string nickname, CancellationToken cancellationToken) =>
        await Run(async manager => { await manager.EditAsync(id, nickname, cancellationToken); return true; });

    public async Task DeleteAsync(long id, CancellationToken cancellationToken) =>
        await Run(async manager => { await manager.DeleteAsync(id, cancellationToken); return true; });

    private async Task<T> Run<T>(Func<UserManager, Task<T>> operation)
    {
        if (!availability.IsConfigured)
            throw new InvalidOperationException("Set ConnectionStrings__LeoDatabase in your run configuration, then restart.");
        await using var scope = scopes.CreateAsyncScope();
        try { return await operation(scope.ServiceProvider.GetRequiredService<UserManager>()); }
        catch (OperationCanceledException) { throw; }
        catch (DbUpdateException) { throw new InvalidOperationException("Changes could not be saved. A related record or a concurrent change may prevent this operation."); }
        catch (PostgresException error)
        {
            var message = error.SqlState switch
            {
                "28P01" => "PostgreSQL rejected the username/password. Check the credentials in ConnectionStrings__LeoDatabase, then restart the app.",
                "28000" => "PostgreSQL denied this login. Check the database user and server authentication configuration.",
                "3D000" => "The configured PostgreSQL database does not exist. Check the Database value in the connection string.",
                "42P01" or "42703" or "42704" => "Connected to PostgreSQL, but the expected tables, columns or types are missing. Check the schema and migration baseline.",
                "42501" => "Connected to PostgreSQL, but this database user lacks permission for the requested operation.",
                _ => $"PostgreSQL rejected the operation (code {error.SqlState}). Check the database schema and configuration."
            };
            throw new InvalidOperationException(message);
        }
        catch (NpgsqlException) { throw new InvalidOperationException("PostgreSQL is unavailable or its schema is not ready. Check the connection and migrations."); }
        catch (TimeoutException) { throw new InvalidOperationException("The database request timed out. Retry when PostgreSQL is available."); }
    }

    private static UserRow Map(UserEntity user) => new(user.Id, user.Nickname, user.CreatedAt, user.UpdatedAt);
}
