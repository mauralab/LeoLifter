using LeoCore.Models.Users;
using LeoDatabase.Models.Users;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class UserManager
{
    public async Task<UserTelegram?> GetTelegramAsync(long userId, CancellationToken cancellationToken = default)
    {
        await RequireUserAsync(userId, cancellationToken);
        return await database.UserTelegramAccounts.AsNoTracking()
            .SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
    }

    public Task<UserTelegram> AddTelegramAsync(
        long userId, TelegramDetails details, CancellationToken cancellationToken = default)
        => SaveTelegramAsync(userId, details, false, cancellationToken);

    public Task<UserTelegram> EditTelegramAsync(
        long userId, TelegramDetails details, CancellationToken cancellationToken = default)
        => SaveTelegramAsync(userId, details, true, cancellationToken);

    public async Task<bool> DeleteTelegramAsync(long userId, CancellationToken cancellationToken = default)
    {
        await RequireUserAsync(userId, cancellationToken);
        var link = await database.UserTelegramAccounts.SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (link is null) return false;
        database.UserTelegramAccounts.Remove(link);
        await database.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<User?> FindByTelegramIdAsync(long telegramId, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(telegramId);
        return await UserQuery().SingleOrDefaultAsync(x => x.Telegram != null && x.Telegram.TelegramId == telegramId, cancellationToken);
    }

    private async Task<UserTelegram> SaveTelegramAsync(
        long userId, TelegramDetails details, bool editing, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(details);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(details.TelegramId);
        if (details.ChatId == 0) throw new ArgumentOutOfRangeException(nameof(details), "Chat ID cannot be zero.");
        await RequireUserAsync(userId, cancellationToken);
        var link = await database.UserTelegramAccounts.SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (!editing && link is not null) throw new InvalidOperationException("This user already has a Telegram account.");
        if (editing && link is null) throw new KeyNotFoundException("Telegram account was not found.");
        if (await database.UserTelegramAccounts.AnyAsync(
                x => x.TelegramId == details.TelegramId && x.UserId != userId, cancellationToken))
            throw new InvalidOperationException("This Telegram account belongs to another user.");
        if (link is null)
        {
            link = new UserTelegram { UserId = userId };
            database.UserTelegramAccounts.Add(link);
        }
        link.TelegramId = details.TelegramId;
        link.ChatId = details.ChatId;
        await database.SaveChangesAsync(cancellationToken);
        return link;
    }
}
