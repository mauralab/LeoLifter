#nullable enable

using System;
using System.Collections.Generic;
using LeoDatabase.Models.Users;

namespace LeoDatabase.Models.Workout;

public class Program
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public long? AuthorId { get; set; }
    public bool IsPublic { get; set; }
    public User? Author { get; set; }
    public ICollection<ProgramCycle> Cycles { get; set; } = new List<ProgramCycle>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
