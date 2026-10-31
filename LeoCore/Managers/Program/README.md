# ProgramManager

`ProgramManager` is registered as a scoped service by `services.AddLeoCore()`. Inject `LeoCore.Managers.ProgramManager`. User-related managers now live in the sibling `Managers/User` folder. Public manager namespaces remain `LeoCore.Managers`, so existing imports continue to work.

## Operations

| Entity | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| Program | `CreateAsync` | `FindAsync`, `ListAsync`, `SearchAsync`, `GetStructureAsync` | `EditAsync` | `DeleteAsync` |
| Cycle | `AddCycleAsync` | `GetCycleAsync`, `ListCyclesAsync` | `EditCycleAsync` | `DeleteCycleAsync` |
| Day | `AddDayAsync` | `GetDayAsync`, `ListDaysAsync` | `EditDayAsync` | `DeleteDayAsync` |
| Group | `AddGroupAsync` | `GetGroupAsync`, `ListGroupsAsync` | `EditGroupAsync` | `DeleteGroupAsync` |
| Set | `AddSetAsync` | `GetSetAsync`, `ListSetsAsync` | `EditSetAsync` | `DeleteSetAsync` |
| Exercise target | `AddSetExerciseAsync` | `GetSetExerciseAsync`, `ListSetExercisesAsync` | `EditSetExerciseAsync` | `DeleteSetExerciseAsync` |
| Shared exercise catalog | `AddExerciseAsync` | `GetExerciseAsync`, `ListExercisesAsync` | `EditExerciseAsync` | `DeleteExerciseAsync` |

Input records are in `LeoCore.Models.Program`. Lists use `skip`/`take` (default 50, maximum 100). Cycle lists include every cycle in the program, ordered by parent, position and ID. Other nested lists take their parent ID and order by position/day index. All operations support cancellation.

```csharp
using LeoCore.Models.Program;
using LeoDatabase.Models.Workout;

var program = await programs.CreateAsync(new ProgramDetails("Beginner", AuthorId: userId));
var cycle = await programs.AddCycleAsync(program.Id, new CycleDetails("Week 1", Position: 1));
var day = await programs.AddDayAsync(program.Id, new DayDetails(cycle.Id, DayIndex: 1));
var group = await programs.AddGroupAsync(program.Id, new GroupDetails(day.Id, Position: 1, Name: "Main"));
var exercise = await programs.AddExerciseAsync(new ExerciseDetails("Squat", ExerciseType.Repetitions, IncludesAdditionalWeight: true));
var set = await programs.AddSetAsync(program.Id, new SetDetails(group.Id, Position: 1, ExerciseId: exercise.Id));
await programs.AddSetExerciseAsync(program.Id, new SetExerciseDetails(
    set.Id, Position: 1, TargetRepsMin: 5, TargetRepsMax: 8,
    ValueMin: 40, ValueMax: 50, ValueUnit: ProgramValueUnit.Kg));
var template = await programs.GetStructureAsync(program.Id);
```

## Rules

- A null author denotes a default program; a supplied author ID must exist. Edit records replace all editable fields, so omitted optional fields reset to their defaults/null values.
- Nested reads and writes include `programId` and check that the entity and its new parent belong to that program. Reparenting days/groups/sets/targets is supported within one program. Moving between programs is not supported.
- Cycle parents must be in the same program. A cycle cannot be its own parent or become a descendant of itself. Repeat counts, positions and day indexes start at 1. Positions must be unique among siblings. Ordinary Edit methods do not shift other items; use the Move methods below to reorder them.
- Target repetition bounds must both be present or both null, and be positive/ordered. Value bounds and units must all be present or all null; values must be ordered/nonnegative, with at most three decimal places and fit numeric(12,3).
- PostgreSQL structural writes acquire a lock on the program row inside a transaction before validating and saving. This serializes calls through ProgramManager, including concurrent cycle reparenting. Other code that modifies structure directly must follow the same locking protocol or enforce equivalent rules in the database. Exercise catalog writes are global and do not take a program lock.
- Deleting a program or cycle cascades through its contained template structure. Deleting a group/set deletes its descendants. Recorded workouts are preserved, with their source ProgramDayId set to null when that day is deleted. Exercises referenced by any program or recorded workout cannot be deleted.
- Single find/get methods return null for absent records within an existing program. A missing parent program or a missing/out-of-program target on edits/deletes raises KeyNotFoundException. Invalid inputs raise argument exceptions and known position/history conflicts raise InvalidOperationException. Database constraints remain authoritative for concurrent changes and can raise DbUpdateException.
- The host app must authorize program ownership, visibility and administrative exercise changes before calling this manager. Supplying programId is a scope check, not authorization.

GetStructureAsync returns the complete graph, with all cycles in Program.Cycles. Use ParentCycleId and Position to build a nested view. Entity navigation properties may contain back-references; map them to response DTOs before serializing an API response.

Each write saves the shared context's pending changes. Use one DI scope/context per unit of work, and do not run concurrent methods on the same context. If the caller owns an existing transaction, ProgramManager uses it but leaves commit/rollback to the caller. No database schema changes or migrations are required for these methods.

## Move an item within its current parent

```csharp
await programs.MoveCycleAsync(programId, cycleId, newPosition: 2);
await programs.MoveDayAsync(programId, dayId, newPosition: 2);
await programs.MoveGroupAsync(programId, groupId, newPosition: 2);
await programs.MoveSetAsync(programId, setId, newPosition: 2);
await programs.MoveSetExerciseAsync(programId, setExerciseId, newPosition: 2);
```

Each method returns the moved entity after saving. Moving from position 4 to 2 shifts old positions 2 and 3 to 3 and 4. Moving from 2 to 4 shifts old positions 3 and 4 to 2 and 3. Other parents, sibling groups and programs are untouched. Root cycles are siblings only with other roots; child cycles are siblings only with children of the same parent.

Positions are 1-based stored indexes (DayIndex for days). A destination must be between 1 and the highest current sibling index, inclusive. Moving to the current index is a no-op. Existing gaps are preserved except for the affected interval; the methods do not compact all indexes or remove rest-day gaps. These operations change ordering within a parent, not parent membership.

The implementation temporarily parks changed items at unused positive indexes, saves that phase, then saves the final positions inside the same transaction. This avoids transient violations of the immediate unique indexes and positive-position checks, without schema changes. A savepoint protects the entire operation when the caller supplies a transaction. If saving fails, dispose that unit-of-work scope/context before retrying so tracked temporary values cannot be reused.

Every Move call persists immediately. To offer a frontend Save button, keep draft changes locally and invoke moves on Save. Multiple independent calls are separate transactions unless the host explicitly groups them in one transaction; batch-save APIs can be added when the editor needs them.
