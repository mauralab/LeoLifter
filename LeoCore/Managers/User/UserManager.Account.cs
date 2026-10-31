using LeoCore.Models.Personal;
using LeoDatabase.Models.Personal;
using LeoDatabase.Models.Users;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class UserManager
{
    /// <summary>Creates or updates User, Profile and Settings in one atomic database save.</summary>
    public async Task<long> SaveAccountAsync(long? userId, string nickname, ProfileDetails profile,
        SettingsDetails settings, CancellationToken cancellationToken = default)
    {
        nickname = ValidateNickname(nickname);
        ValidateProfile(profile);
        ArgumentNullException.ThrowIfNull(settings);
        ArgumentException.ThrowIfNullOrWhiteSpace(settings.Language);
        if (!Enum.IsDefined(settings.WeightMeasureUnit) || !Enum.IsDefined(settings.LengthMeasureUnit))
            throw new ArgumentException("Unknown measurement unit.");
        User user;
        if (userId is { } id)
            user = await database.Users.Include(x => x.Profile).Include(x => x.Settings)
                .SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
                ?? throw new KeyNotFoundException("User no longer exists.");
        else { user = new User(); database.Users.Add(user); }
        user.Nickname = nickname;
        user.Profile ??= new UserProfile { User = user };
        user.Profile.Sex = Normalize(profile.Sex);
        user.Profile.BirthDate = profile.BirthDate;
        user.Profile.Height = profile.Height;
        user.Profile.HeightUnit = profile.HeightUnit;
        user.Profile.Country = Normalize(profile.Country)?.ToUpperInvariant();
        user.Profile.City = Normalize(profile.City);
        user.Profile.Timezone = Normalize(profile.Timezone);
        user.Settings ??= new UserSettings { User = user };
        user.Settings.Language = settings.Language.Trim();
        user.Settings.WeightMeasureUnit = settings.WeightMeasureUnit;
        user.Settings.LengthMeasureUnit = settings.LengthMeasureUnit;
        await database.SaveChangesAsync(cancellationToken);
        return user.Id;
    }
}
