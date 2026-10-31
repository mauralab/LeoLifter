#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Workout;

public class ProgramDaySet
{
    public long Id { get; set; }
    public long ProgramGroupId { get; set; }
    public int Position { get; set; } = 1;
    public long ExerciseId { get; set; }
    public ProgramDayGroup ProgramGroup { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
    public ICollection<ProgramSetExercise> SetExercises { get; set; } = new List<ProgramSetExercise>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
