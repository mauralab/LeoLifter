#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Workout;

public class ProgramCycle
{
    public long Id { get; set; }
    public long ProgramId { get; set; }
    public int Position { get; set; } = 1;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long? ParentCycleId { get; set; }
    public int RepeatCount { get; set; } = 1;
    public Program Program { get; set; } = null!;
    public ProgramCycle? ParentCycle { get; set; }
    public ICollection<ProgramCycle> ChildCycles { get; set; } = new List<ProgramCycle>();
    public ICollection<ProgramDay> Days { get; set; } = new List<ProgramDay>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
