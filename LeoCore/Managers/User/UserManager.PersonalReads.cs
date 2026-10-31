using LeoCore.Models.Personal;
using LeoDatabase.Models.Personal;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class UserManager
{
    public async Task<UserProfile?> GetProfileAsync(long userId, CancellationToken cancellationToken = default)
    {
        await RequireUserAsync(userId, cancellationToken);
        return await database.UserProfiles.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
    }

    public async Task<bool> DeleteProfileAsync(long userId, CancellationToken cancellationToken = default)
    {
        await RequireUserAsync(userId, cancellationToken);
        var profile = await database.UserProfiles.SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (profile is null) return false;
        database.UserProfiles.Remove(profile);
        await database.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<UserSettings> InitializeSettingsAsync(long userId, CancellationToken cancellationToken = default)
    {
        await RequireUserAsync(userId, cancellationToken);
        var settings = await database.UserSettings.SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (settings is not null) return settings;
        settings = new UserSettings { UserId = userId };
        database.UserSettings.Add(settings);
        await database.SaveChangesAsync(cancellationToken);
        return settings;
    }

    public async Task<UserSettings?> GetSettingsAsync(long userId, CancellationToken cancellationToken = default)
    {
        await RequireUserAsync(userId, cancellationToken);
        return await database.UserSettings.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
    }

    /// <summary>Replaces preferences, creating missing settings.</summary>
    public async Task<UserSettings> EditSettingsAsync(
        long userId, SettingsDetails details, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(details);
        ArgumentException.ThrowIfNullOrWhiteSpace(details.Language);
        if (!Enum.IsDefined(details.WeightMeasureUnit) || !Enum.IsDefined(details.LengthMeasureUnit))
            throw new ArgumentException("Unknown measurement unit.", nameof(details));
        await RequireUserAsync(userId, cancellationToken);
        var settings = await database.UserSettings.SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (settings is null)
        {
            settings = new UserSettings { UserId = userId };
            database.UserSettings.Add(settings);
        }
        settings.Language = details.Language.Trim();
        settings.WeightMeasureUnit = details.WeightMeasureUnit;
        settings.LengthMeasureUnit = details.LengthMeasureUnit;
        await database.SaveChangesAsync(cancellationToken);
        return settings;
    }

    public async Task<bool> DeleteSettingsAsync(long userId, CancellationToken cancellationToken = default)
    {
        await RequireUserAsync(userId, cancellationToken);
        var settings = await database.UserSettings.SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (settings is null) return false;
        database.UserSettings.Remove(settings);
        await database.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<WeightMeasurement?> GetWeightAsync(
        long userId, long measurementId, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(measurementId);
        await RequireUserAsync(userId, cancellationToken);
        return await database.WeightMeasurements.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == measurementId && x.UserId == userId, cancellationToken);
    }

    public async Task<List<WeightMeasurement>> ListWeightsAsync(
        long userId, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        await RequireUserAsync(userId, cancellationToken);
        return await database.WeightMeasurements.AsNoTracking().Where(x => x.UserId == userId)
            .OrderByDescending(x => x.MeasuredAt).ThenByDescending(x => x.Id)
            .Skip(skip).Take(take).ToListAsync(cancellationToken);
    }
}
