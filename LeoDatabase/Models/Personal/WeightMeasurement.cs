#nullable enable

using System;
using System.Collections.Generic;
using LeoDatabase.Models.Users;
using LeoDatabase.Models.Workout;

namespace LeoDatabase.Models.Personal;

public class WeightMeasurement
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public decimal Weight { get; set; }
    public WeightUnit WeightUnit { get; set; }
    public DateTime MeasuredAt { get; set; }
    public User User { get; set; } = null!;
    public ICollection<WorkoutSetExercise> WorkoutSetExercises { get; set; } = new List<WorkoutSetExercise>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
