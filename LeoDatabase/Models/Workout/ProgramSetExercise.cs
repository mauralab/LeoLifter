#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Workout;

public class ProgramSetExercise
{
    public long Id { get; set; }
    public long ProgramDaySetId { get; set; }
    public int Position { get; set; } = 1;
    public int? TargetRepsMin { get; set; }
    public int? TargetRepsMax { get; set; }
    public decimal? ValueMin { get; set; }
    public decimal? ValueMax { get; set; }
    public ProgramValueUnit? ValueUnit { get; set; }
    public ProgramDaySet ProgramDaySet { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
