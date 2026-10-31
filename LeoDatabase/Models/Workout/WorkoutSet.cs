#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Workout;

public class WorkoutSet
{
    public long Id { get; set; }
    public long WorkoutGroupId { get; set; }
    public int Position { get; set; } = 1;
    public long ExerciseId { get; set; }
    public WorkoutGroup WorkoutGroup { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
    public ICollection<WorkoutSetExercise> SetExercises { get; set; } = new List<WorkoutSetExercise>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
