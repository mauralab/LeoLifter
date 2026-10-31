#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Workout;

public class ProgramDay
{
    public long Id { get; set; }
    public long ProgramCycleId { get; set; }
    public int DayIndex { get; set; } = 1;
    public ProgramCycle ProgramCycle { get; set; } = null!;
    public ICollection<ProgramDayGroup> Groups { get; set; } = new List<ProgramDayGroup>();
    public ICollection<Workout> Workouts { get; set; } = new List<Workout>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
