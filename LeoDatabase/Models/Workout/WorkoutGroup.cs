#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Workout;

public class WorkoutGroup
{
    public long Id { get; set; }
    public long WorkoutId { get; set; }
    public int Position { get; set; } = 1;
    public string? Name { get; set; }
    public int RepeatCount { get; set; } = 1;
    public Workout Workout { get; set; } = null!;
    public ICollection<WorkoutSet> Sets { get; set; } = new List<WorkoutSet>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
