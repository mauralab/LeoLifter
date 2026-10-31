#nullable enable

using System;
using System.Collections.Generic;
using LeoDatabase.Models.Users;

namespace LeoDatabase.Models.Workout;

public class Workout
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public long? ProgramDayId { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public User User { get; set; } = null!;
    public ProgramDay? ProgramDay { get; set; }
    public ICollection<WorkoutGroup> Groups { get; set; } = new List<WorkoutGroup>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
