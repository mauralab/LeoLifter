#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Workout;

public class Exercise
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ExerciseType Type { get; set; }
    public bool IncludesOwnWeight { get; set; }
    public bool IncludesAdditionalWeight { get; set; }
    public string? Description { get; set; }
    public ICollection<ProgramDaySet> ProgramDaySets { get; set; } = new List<ProgramDaySet>();
    public ICollection<WorkoutSet> WorkoutSets { get; set; } = new List<WorkoutSet>();
}
