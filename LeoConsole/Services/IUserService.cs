using LeoConsole.Models;

namespace LeoConsole.Services;

public sealed record UserRow(long Id, string Nickname, DateTime CreatedAt, DateTime UpdatedAt);
public interface IUserService
{
    Task<PageResult<UserRow>> GetPageAsync(string? search, int page, int size, CancellationToken cancellationToken);
    Task<UserRow?> FindAsync(long id, CancellationToken cancellationToken);
    Task CreateAsync(string nickname, CancellationToken cancellationToken);
    Task EditAsync(long id, string nickname, CancellationToken cancellationToken);
    Task DeleteAsync(long id, CancellationToken cancellationToken);
}
public sealed record DatabaseAvailability(bool IsConfigured);
