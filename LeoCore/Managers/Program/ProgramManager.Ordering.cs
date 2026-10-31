using LeoCore.Managers.Shared;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class ProgramManager
{

    /// <summary>Moves within the current parent and shifts intervening siblings by one.</summary>
    public Task<ProgramCycle> MoveCycleAsync(
        long programId, long cycleId, int newPosition, CancellationToken cancellationToken = default)
    {
        Positive(newPosition, nameof(newPosition));
        return WriteAsync(programId, async _ =>
        {
            var entity = await RequireCycleAsync(programId, cycleId, cancellationToken);
            await SiblingOrdering.MoveAsync(database, entity, Cycles(programId).Where(x => x.ParentCycleId == entity.ParentCycleId),
                nameof(ProgramCycle.Position), newPosition, cancellationToken);
            return entity;
        }, cancellationToken);
    }

    /// <summary>Moves within the current parent and shifts intervening siblings by one.</summary>
    public Task<ProgramDay> MoveDayAsync(
        long programId, long dayId, int newPosition, CancellationToken cancellationToken = default)
    {
        Positive(newPosition, nameof(newPosition));
        return WriteAsync(programId, async _ =>
        {
            var entity = await RequireDayAsync(programId, dayId, cancellationToken);
            await SiblingOrdering.MoveAsync(database, entity, Days(programId).Where(x => x.ProgramCycleId == entity.ProgramCycleId),
                nameof(ProgramDay.DayIndex), newPosition, cancellationToken);
            return entity;
        }, cancellationToken);
    }

    /// <summary>Moves within the current parent and shifts intervening siblings by one.</summary>
    public Task<ProgramDayGroup> MoveGroupAsync(
        long programId, long groupId, int newPosition, CancellationToken cancellationToken = default)
    {
        Positive(newPosition, nameof(newPosition));
        return WriteAsync(programId, async _ =>
        {
            var entity = await RequireGroupAsync(programId, groupId, cancellationToken);
            await SiblingOrdering.MoveAsync(database, entity, Groups(programId).Where(x => x.ProgramDayId == entity.ProgramDayId),
                nameof(ProgramDayGroup.Position), newPosition, cancellationToken);
            return entity;
        }, cancellationToken);
    }

    /// <summary>Moves within the current parent and shifts intervening siblings by one.</summary>
    public Task<ProgramDaySet> MoveSetAsync(
        long programId, long setId, int newPosition, CancellationToken cancellationToken = default)
    {
        Positive(newPosition, nameof(newPosition));
        return WriteAsync(programId, async _ =>
        {
            var entity = await RequireSetAsync(programId, setId, cancellationToken);
            await SiblingOrdering.MoveAsync(database, entity, Sets(programId).Where(x => x.ProgramGroupId == entity.ProgramGroupId),
                nameof(ProgramDaySet.Position), newPosition, cancellationToken);
            return entity;
        }, cancellationToken);
    }

    /// <summary>Moves within the current parent and shifts intervening siblings by one.</summary>
    public Task<ProgramSetExercise> MoveSetExerciseAsync(
        long programId, long setExerciseId, int newPosition, CancellationToken cancellationToken = default)
    {
        Positive(newPosition, nameof(newPosition));
        return WriteAsync(programId, async _ =>
        {
            var entity = await RequireSetExerciseAsync(programId, setExerciseId, cancellationToken);
            await SiblingOrdering.MoveAsync(database, entity, SetExercises(programId).Where(x => x.ProgramDaySetId == entity.ProgramDaySetId),
                nameof(ProgramSetExercise.Position), newPosition, cancellationToken);
            return entity;
        }, cancellationToken);
    }
}
