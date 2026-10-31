using LeoCore.Models.Workout;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class WorkoutManager
{
    private async Task<Exercise> RequireExerciseAsync(long exerciseId, CancellationToken cancellationToken)
    {
        Positive(exerciseId, nameof(exerciseId));
        return await database.Exercises.AsNoTracking().SingleOrDefaultAsync(x => x.Id == exerciseId, cancellationToken)
            ?? throw new KeyNotFoundException("Exercise was not found.");
    }

    private async Task ValidateResultReferencesAsync(
        long userId, WorkoutResultDetails details, CancellationToken cancellationToken)
    {
        var exerciseId = await database.WorkoutSets.Where(x => x.Id == details.WorkoutSetId)
            .Select(x => x.ExerciseId).SingleAsync(cancellationToken);
        var exercise = await RequireExerciseAsync(exerciseId, cancellationToken);
        ValidateExerciseUnit(exercise.Type, details.ValueUnit);
        if (details.BodyWeightMeasurementId is { } id)
        {
            Positive(id, nameof(details.BodyWeightMeasurementId));
            if (!await database.WeightMeasurements.AnyAsync(x => x.Id == id && x.UserId == userId, cancellationToken))
                throw new KeyNotFoundException("Body-weight measurement was not found for this user.");
        }
    }

    private static void ValidateExerciseUnit(ExerciseType exerciseType, WorkoutValueUnit unit)
    {
        var matches = exerciseType switch
        {
            ExerciseType.Repetitions => unit == WorkoutValueUnit.Rep,
            ExerciseType.Distance => unit is WorkoutValueUnit.Km or WorkoutValueUnit.Mi,
            ExerciseType.Duration => unit == WorkoutValueUnit.S,
            _ => false
        };
        if (!matches) throw new ArgumentException("Result unit must match the exercise type.");
    }

    private static void ValidateResult(WorkoutResultDetails details)
    {
        Positive(details.WorkoutSetId, nameof(details.WorkoutSetId));
        Positive(details.Position, nameof(details.Position));
        ValidateDecimal(details.Value, 999999999.999m, 3, nameof(details.Value));
        if (!Enum.IsDefined(details.ValueUnit)) throw new ArgumentOutOfRangeException(nameof(details.ValueUnit));
        if (details.ValueUnit == WorkoutValueUnit.Rep && decimal.Truncate(details.Value) != details.Value)
            throw new ArgumentException("Repetitions must be a whole number.", nameof(details));
        if (details.AdditionalWeight.HasValue != details.WeightUnit.HasValue)
            throw new ArgumentException("Additional weight and weight unit must be supplied or cleared together.", nameof(details));
        if (details.WeightUnit is { } unit && !Enum.IsDefined(unit))
            throw new ArgumentOutOfRangeException(nameof(details.WeightUnit));
        if (details.AdditionalWeight is { } weight)
            ValidateDecimal(weight, 999999999.999m, 3, nameof(details.AdditionalWeight));
        if (details.TimeSpent is { } time)
            ValidateDecimal(time, 999999999.999m, 3, nameof(details.TimeSpent));
        if (details.Rir is { } rir) ValidateDecimal(rir, 999.9m, 1, nameof(details.Rir));
    }

    private static void ValidateDecimal(decimal value, decimal maximum, int scale, string parameterName)
    {
        if (value < 0 || value > maximum || decimal.Round(value, scale) != value)
            throw new ArgumentOutOfRangeException(parameterName,
                $"Value must be between 0 and {maximum} with at most {scale} decimal places.");
    }
}
