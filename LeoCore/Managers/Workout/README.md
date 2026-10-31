# WorkoutManager

Registered by `services.AddLeoCore()` as a scoped `LeoCore.Managers.WorkoutManager`. Input records are in `LeoCore.Models.Workout`; database models/enums remain in `LeoDatabase.Models.Workout` and `LeoDatabase.Models.Personal`.

| Entity | Create | Read | Update | Delete | Reorder |
| --- | --- | --- | --- | --- | --- |
| Workout | `CreateAsync` | `FindAsync`, `ListAsync`, `GetStructureAsync` | `EditAsync` | `DeleteAsync` | — |
| Group | `AddGroupAsync` | `GetGroupAsync`, `ListGroupsAsync` | `EditGroupAsync` | `DeleteGroupAsync` | `MoveGroupAsync` |
| Set | `AddSetAsync` | `GetSetAsync`, `ListSetsAsync` | `EditSetAsync` | `DeleteSetAsync` | `MoveSetAsync` |
| Recorded result | `AddSetExerciseAsync` | `GetSetExerciseAsync`, `ListSetExercisesAsync` | `EditSetExerciseAsync` | `DeleteSetExerciseAsync` | `MoveSetExerciseAsync` |

All methods take `userId`. Operations on an existing workout also take `workoutId`, and nested operations take the child ID. All support cancellation. The manager checks ownership and parent membership; the application must still authenticate the caller and derive the correct user ID from that identity. Reading another user's workout returns null or raises KeyNotFoundException for a required parent; writes require ownership.

```csharp
var workout = await workouts.CreateAsync(userId,
    new WorkoutDetails(ScheduledAt: DateTime.UtcNow));
var group = await workouts.AddGroupAsync(userId, workout.Id,
    new WorkoutGroupDetails(Position: 1, Name: "Main"));
var set = await workouts.AddSetAsync(userId, workout.Id,
    new WorkoutSetDetails(group.Id, Position: 1, ExerciseId: exerciseId));
await workouts.AddSetExerciseAsync(userId, workout.Id,
    new WorkoutResultDetails(set.Id, Position: 1, Value: 10,
        ValueUnit: WorkoutValueUnit.Rep, AdditionalWeight: 20, WeightUnit: WeightUnit.Kg));

await workouts.MoveGroupAsync(userId, workout.Id, groupId, newPosition: 2);
await workouts.MoveSetAsync(userId, workout.Id, setId, newPosition: 2);
await workouts.MoveSetExerciseAsync(userId, workout.Id, resultId, newPosition: 2);
```

## Behavior

- Workout creation inserts the header. Setting ProgramDayId links an existing template day; it does not instantiate/copy the template. The host must enforce access to that source program. ScheduledAt and CompletedAt are optional UTC timestamps. Setting CompletedAt through EditAsync records completion; null clears it.
- Input records replace all editable fields. Owner ID is immutable. Sets can move between groups and results between sets within the same workout through Edit methods; moving between workouts is not supported.
- Positions/repeat counts start at 1. Lists are paginated (`skip`, `take`, default 50, maximum 100); groups, sets and results are ordered by position, workouts by ID descending. GetStructureAsync returns the complete graph including exercise and body-weight details. Navigation back-references may exist; map to response DTOs before API serialization.
- A recorded result requires Value and ValueUnit. Repetitions must be whole numbers; their unit must match a repetition exercise. Distance exercises accept km/mi, and duration exercises accept seconds. Values, additional weight and TimeSpent are nonnegative numeric(12,3); RIR is nonnegative numeric(4,1). TimeSpent is seconds.
- AdditionalWeight and WeightUnit must be supplied or cleared together. BodyWeightMeasurementId is optional; if supplied, the measurement must belong to the workout owner. Changing a set's exercise rejects units incompatible with results already recorded in that set.
- Ordinary Edit methods reject occupied positions. Move methods shift intervening siblings automatically: position 4 to 2 changes old positions 2/3 to 3/4. Moves stay within the current parent. Positions are 1-based stored indexes, and the destination must be between 1 and the highest current sibling index. Existing gaps are not globally compacted.
- ProgramManager and WorkoutManager share `Managers/Shared/SiblingOrdering.cs`. Reordering uses unused positive temporary positions to avoid immediate unique/check constraint violations, then writes final positions in the same transaction. PostgreSQL writes lock the owned workout row; a savepoint protects the operation when the caller owns the outer transaction. Direct writers must follow equivalent locking rules.
- Each write saves immediately. A frontend draft editor should keep pending edits locally until Save. Multiple calls are separate transactions unless the host groups them in a transaction. Every save also includes pending changes on the scope's shared context, so use one scope per unit of work. Do not invoke parallel operations on one context. After a failed write, discard that context before retrying.
- Deleting a workout/group/set cascades through its owned descendants. It does not delete the shared exercise catalog, body-weight measurements or source program day. Find/get returns null for absent children in an owned existing workout; required parent/child writes raise KeyNotFoundException. Validation raises argument exceptions; position conflicts raise InvalidOperationException. Database constraints remain authoritative during concurrent changes and can raise DbUpdateException.

The shared exercise catalog is managed by ProgramManager's exercise methods. No new schema or migrations are needed for WorkoutManager.
