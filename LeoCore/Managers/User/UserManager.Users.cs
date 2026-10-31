using LeoDatabase.Models.Users;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class UserManager
{
    public Task<List<User>> ListAsync(int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        return UserQuery().OrderBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    /// <summary>Case-insensitive exact nickname matches. Nicknames are not unique.</summary>
    public Task<List<User>> FindByUsernameAsync(
        string username, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(username);
        ValidatePage(skip, take);
        var name = username.Trim().ToLowerInvariant();
        return UserQuery().Where(x => x.Nickname.ToLower() == name)
            .OrderBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    /// <summary>Searches nickname substrings, or an exact ID when the input is numeric.</summary>
    public Task<List<User>> SearchAsync(
        string query, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);
        ValidatePage(skip, take);
        var text = query.Trim().ToLowerInvariant();
        var numeric = long.TryParse(text, out var id);
        return UserQuery().Where(x => x.Nickname.ToLower().Contains(text) || (numeric && x.Id == id))
            .OrderBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public async Task<User> EditAsync(long userId, string nickname, CancellationToken cancellationToken = default)
    {
        nickname = ValidateNickname(nickname);
        var user = await RequireUserEntityAsync(userId, cancellationToken);
        user.Nickname = nickname;
        await database.SaveChangesAsync(cancellationToken);
        return user;
    }

    /// <summary>Deletes the account and its dependent records. Authored programs must be reassigned or deleted first.</summary>
    public async Task DeleteAsync(long userId, CancellationToken cancellationToken = default)
    {
        var user = await RequireUserEntityAsync(userId, cancellationToken);
        if (await database.Programs.AnyAsync(x => x.AuthorId == userId, cancellationToken))
            throw new InvalidOperationException("Reassign or delete this user's authored programs before deleting the account.");
        // Track both sides of the history -> measurement reference so EF orders
        // dependent deletes before weight measurements with restrictive foreign keys.
        await database.Entry(user).Collection(x => x.Workouts).Query()
            .Include(x => x.Groups).ThenInclude(x => x.Sets).ThenInclude(x => x.SetExercises)
            .AsSplitQuery().LoadAsync(cancellationToken);
        await database.Entry(user).Collection(x => x.WeightMeasurements).LoadAsync(cancellationToken);
        database.Users.Remove(user);
        await database.SaveChangesAsync(cancellationToken);
    }

    private IQueryable<User> UserQuery() => database.Users.AsNoTracking()
        .Include(x => x.Profile).Include(x => x.Settings);

    private async Task<User> RequireUserEntityAsync(long userId, CancellationToken cancellationToken)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(userId);
        return await database.Users.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new KeyNotFoundException($"User {userId} was not found.");
    }

    private static string ValidateNickname(string nickname)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nickname);
        nickname = nickname.Trim();
        if (nickname.Length > 100)
            throw new ArgumentException("Nickname must contain at most 100 characters.", nameof(nickname));
        return nickname;
    }

    private static void ValidatePage(int skip, int take)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(skip);
        if (take is < 1 or > 100)
            throw new ArgumentOutOfRangeException(nameof(take), "Page size must be between 1 and 100.");
    }
}
