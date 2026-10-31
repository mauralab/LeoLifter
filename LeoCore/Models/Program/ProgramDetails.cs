using LeoDatabase.Models.Workout;

namespace LeoCore.Models.Program;

public sealed record ProgramDetails(string Name, long? AuthorId = null, bool IsPublic = false);
public sealed record CycleDetails(
    string Name, int Position, long? ParentCycleId = null, int RepeatCount = 1, string? Description = null);
public sealed record DayDetails(long ProgramCycleId, int DayIndex);
public sealed record GroupDetails(
    long ProgramDayId, int Position, string? Name = null, int RepeatCount = 1);
public sealed record SetDetails(long ProgramGroupId, int Position, long ExerciseId);
public sealed record SetExerciseDetails(
    long ProgramDaySetId, int Position,
    int? TargetRepsMin = null, int? TargetRepsMax = null,
    decimal? ValueMin = null, decimal? ValueMax = null, ProgramValueUnit? ValueUnit = null);
public sealed record ExerciseDetails(
    string Name, ExerciseType Type, bool IncludesOwnWeight = false,
    bool IncludesAdditionalWeight = false, string? Description = null);
