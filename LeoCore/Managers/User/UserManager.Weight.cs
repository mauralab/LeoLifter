using LeoCore.Models.Personal;
using LeoDatabase.Models.Personal;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class UserManager
{
    public async Task<WeightMeasurement> AddWeightAsync(
        long userId, WeightMeasurementDetails details, CancellationToken cancellationToken = default)
    {
        ValidateWeight(details);
        await RequireUserAsync(userId, cancellationToken);
        var measurement = new WeightMeasurement
        {
            UserId = userId,
            Weight = details.Weight,
            WeightUnit = details.WeightUnit,
            MeasuredAt = details.MeasuredAt
        };
        database.WeightMeasurements.Add(measurement);
        await database.SaveChangesAsync(cancellationToken);
        return measurement;
    }

    public async Task<WeightMeasurement> EditWeightAsync(
        long userId, long measurementId, WeightMeasurementDetails details,
        CancellationToken cancellationToken = default)
    {
        ValidateWeight(details);
        var measurement = await RequireMeasurementAsync(userId, measurementId, cancellationToken);
        measurement.Weight = details.Weight;
        measurement.WeightUnit = details.WeightUnit;
        measurement.MeasuredAt = details.MeasuredAt;
        await database.SaveChangesAsync(cancellationToken);
        return measurement;
    }

    /// <summary>Deletes an owned measurement unless workout history references it.</summary>
    public async Task DeleteWeightAsync(
        long userId, long measurementId, CancellationToken cancellationToken = default)
    {
        var measurement = await RequireMeasurementAsync(userId, measurementId, cancellationToken);
        if (await database.WorkoutSetExercises.AnyAsync(
                x => x.BodyWeightMeasurementId == measurementId, cancellationToken))
            throw new InvalidOperationException("This measurement is referenced by workout history and cannot be deleted.");

        // The restrictive database foreign key also protects against concurrent references.
        database.WeightMeasurements.Remove(measurement);
        await database.SaveChangesAsync(cancellationToken);
    }

    private async Task<WeightMeasurement> RequireMeasurementAsync(
        long userId, long measurementId, CancellationToken cancellationToken)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(userId);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(measurementId);
        return await database.WeightMeasurements.SingleOrDefaultAsync(
                   x => x.Id == measurementId && x.UserId == userId, cancellationToken)
               ?? throw new KeyNotFoundException("Weight measurement was not found for this user.");
    }

    private static void ValidateWeight(WeightMeasurementDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);
        if (details.Weight <= 0 || details.Weight > 99999.999m || decimal.Round(details.Weight, 3) != details.Weight)
            throw new ArgumentOutOfRangeException(nameof(details), "Weight must be positive, at most 99999.999, with at most three decimal places.");
        if (!Enum.IsDefined(details.WeightUnit))
            throw new ArgumentOutOfRangeException(nameof(details), "Unknown weight unit.");
        if (details.MeasuredAt.Kind != DateTimeKind.Utc)
            throw new ArgumentException("MeasuredAt must be a UTC DateTime.", nameof(details));
    }
}
