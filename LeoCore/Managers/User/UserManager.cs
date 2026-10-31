using LeoDatabase.Context;
using LeoDatabase.Models.Personal;
using LeoDatabase.Models.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

namespace LeoCore.Managers;

public sealed partial class UserManager(LeoDbContext database, IPasswordHasher<User> passwordHasher)
{
    /// <summary>Creates a user with an empty profile and default preferences.</summary>
    public async Task<User> CreateAsync(string nickname, CancellationToken cancellationToken = default)
    {
        nickname = ValidateNickname(nickname);

        var user = new User
        {
            Nickname = nickname,
            Profile = new UserProfile(),
            Settings = new UserSettings()
        };

        database.Users.Add(user);
        await database.SaveChangesAsync(cancellationToken);
        return user;
    }

    /// <summary>Returns a user by ID, or null when no such user exists.</summary>
    public Task<User?> FindAsync(long id, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(id);

        return database.Users
            .AsNoTracking()
            .Include(user => user.Profile)
            .Include(user => user.Settings)
            .SingleOrDefaultAsync(user => user.Id == id, cancellationToken);
    }
}
