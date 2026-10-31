using LeoCore.Models.Personal;
using LeoDatabase.Models.Personal;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class UserManager
{
    /// <summary>Ensures an existing user has a profile, preserving any existing profile data.</summary>
    public async Task<UserProfile> InitializeProfileAsync(
        long userId, CancellationToken cancellationToken = default)
    {
        await RequireUserAsync(userId, cancellationToken);
        var profile = await database.UserProfiles.SingleOrDefaultAsync(
            x => x.UserId == userId, cancellationToken);
        if (profile is not null)
            return profile;

        profile = new UserProfile { UserId = userId };
        database.UserProfiles.Add(profile);
        await database.SaveChangesAsync(cancellationToken);
        return profile;
    }

    /// <summary>Replaces all editable profile fields; null values clear fields. Creates a missing profile.</summary>
    public async Task<UserProfile> EditProfileAsync(
        long userId, ProfileDetails details, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(details);
        if (details.Height.HasValue != details.HeightUnit.HasValue)
            throw new ArgumentException("Height and height unit must be supplied or cleared together.", nameof(details));
        if (details.Height is { } height &&
            (height <= 0 || height > 99999.99m || decimal.Round(height, 2) != height))
            throw new ArgumentOutOfRangeException(nameof(details), "Height must be positive, at most 99999.99, with at most two decimal places.");
        if (details.HeightUnit is { } unit && !Enum.IsDefined(unit))
            throw new ArgumentOutOfRangeException(nameof(details), "Unknown height unit.");
        if (details.BirthDate > DateOnly.FromDateTime(DateTime.UtcNow))
            throw new ArgumentException("Birth date cannot be in the future.", nameof(details));

        var country = Normalize(details.Country)?.ToUpperInvariant();
        if (country is not null && (country.Length != 2 || country.Any(c => c is < 'A' or > 'Z')))
            throw new ArgumentException("Country must be a two-letter country code, such as UA.", nameof(details));

        await RequireUserAsync(userId, cancellationToken);
        var profile = await database.UserProfiles.SingleOrDefaultAsync(
            x => x.UserId == userId, cancellationToken);
        if (profile is null)
        {
            profile = new UserProfile { UserId = userId };
            database.UserProfiles.Add(profile);
        }

        profile.Sex = Normalize(details.Sex);
        profile.BirthDate = details.BirthDate;
        profile.Height = details.Height;
        profile.HeightUnit = details.HeightUnit;
        profile.Country = country;
        profile.City = Normalize(details.City);
        profile.Timezone = Normalize(details.Timezone);
        await database.SaveChangesAsync(cancellationToken);
        return profile;
    }

    private async Task RequireUserAsync(long userId, CancellationToken cancellationToken)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(userId);
        if (!await database.Users.AnyAsync(x => x.Id == userId, cancellationToken))
            throw new KeyNotFoundException($"User {userId} was not found.");
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
