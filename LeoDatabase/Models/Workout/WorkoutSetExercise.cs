#nullable enable

using System;
using System.Collections.Generic;
using LeoDatabase.Models.Personal;

namespace LeoDatabase.Models.Workout;

public class WorkoutSetExercise
{
    public long Id { get; set; }
    public long WorkoutSetId { get; set; }
    public int Position { get; set; } = 1;
    public decimal Value { get; set; }
    public WorkoutValueUnit ValueUnit { get; set; }
    public long? BodyWeightMeasurementId { get; set; }
    public decimal? AdditionalWeight { get; set; }
    public WeightUnit? WeightUnit { get; set; }
    public decimal? TimeSpent { get; set; }
    public decimal? Rir { get; set; }
    public WorkoutSet WorkoutSet { get; set; } = null!;
    public WeightMeasurement? BodyWeightMeasurement { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
