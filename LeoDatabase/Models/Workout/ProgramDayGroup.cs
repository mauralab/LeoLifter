#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Workout;

public class ProgramDayGroup
{
    public long Id { get; set; }
    public long ProgramDayId { get; set; }
    public int Position { get; set; } = 1;
    public string? Name { get; set; }
    public int RepeatCount { get; set; } = 1;
    public ProgramDay ProgramDay { get; set; } = null!;
    public ICollection<ProgramDaySet> Sets { get; set; } = new List<ProgramDaySet>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
