using LeoDatabase.Models.Personal;
using LeoDatabase.Models.Workout;

namespace LeoCore.Models.Workout;

public sealed record WorkoutDetails(
    long? ProgramDayId = null, DateTime? ScheduledAt = null, DateTime? CompletedAt = null);
public sealed record WorkoutGroupDetails(int Position, string? Name = null, int RepeatCount = 1);
public sealed record WorkoutSetDetails(long WorkoutGroupId, int Position, long ExerciseId);
public sealed record WorkoutResultDetails(
    long WorkoutSetId, int Position, decimal Value, WorkoutValueUnit ValueUnit,
    long? BodyWeightMeasurementId = null, decimal? AdditionalWeight = null, WeightUnit? WeightUnit = null,
    decimal? TimeSpent = null, decimal? Rir = null);
