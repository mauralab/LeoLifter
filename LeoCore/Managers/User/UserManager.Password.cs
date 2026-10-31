using LeoDatabase.Models.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class UserManager
{
    // These operations are for trusted application services. Never return a password/hash to clients.
    public async Task<bool> HasPasswordAsync(long userId, CancellationToken cancellationToken = default)
    {
        await RequireUserAsync(userId, cancellationToken);
        return await database.UserPasswords.AsNoTracking().AnyAsync(x => x.UserId == userId, cancellationToken);
    }

    public Task AddPasswordAsync(long userId, string password, CancellationToken cancellationToken = default)
        => SavePasswordAsync(userId, password, false, cancellationToken);

    public Task EditPasswordAsync(long userId, string password, CancellationToken cancellationToken = default)
        => SavePasswordAsync(userId, password, true, cancellationToken);

    public async Task<bool> VerifyPasswordAsync(long userId, string password, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);
        var user = await RequireUserEntityAsync(userId, cancellationToken);
        var stored = await database.UserPasswords.SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (stored is null) return false;
        var result = passwordHasher.VerifyHashedPassword(user, stored.PasswordHash, password);
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            stored.PasswordHash = passwordHasher.HashPassword(user, password);
            await database.SaveChangesAsync(cancellationToken);
        }
        return result != PasswordVerificationResult.Failed;
    }

    public async Task<bool> DeletePasswordAsync(long userId, CancellationToken cancellationToken = default)
    {
        await RequireUserAsync(userId, cancellationToken);
        var stored = await database.UserPasswords.SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (stored is null) return false;
        await MarkSessionsRevokedAsync(userId, cancellationToken);
        database.UserPasswords.Remove(stored);
        await database.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task SavePasswordAsync(long userId, string password, bool editing, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);
        var user = await RequireUserEntityAsync(userId, cancellationToken);
        var stored = await database.UserPasswords.SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (!editing && stored is not null) throw new InvalidOperationException("This user already has a password.");
        if (editing && stored is null) throw new KeyNotFoundException("Password was not found.");
        var hash = passwordHasher.HashPassword(user, password);
        await MarkSessionsRevokedAsync(userId, cancellationToken);
        if (stored is null)
        {
            stored = new UserPassword { UserId = userId };
            database.UserPasswords.Add(stored);
        }
        stored.PasswordHash = hash;
        await database.SaveChangesAsync(cancellationToken);
    }
}
