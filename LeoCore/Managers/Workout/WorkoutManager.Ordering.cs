using LeoCore.Managers.Shared;
using LeoDatabase.Models.Workout;

namespace LeoCore.Managers;

public sealed partial class WorkoutManager
{

    public Task<WorkoutGroup> MoveGroupAsync(
        long userId, long workoutId, long groupId, int newPosition, CancellationToken cancellationToken = default)
    {
        Positive(newPosition, nameof(newPosition));
        return WriteAsync(userId, workoutId, async _ =>
        {
            var entity = await RequireGroupAsync(userId, workoutId, groupId, cancellationToken);
            await SiblingOrdering.MoveAsync(database, entity,
                Groups(userId, workoutId),
                nameof(WorkoutGroup.Position), newPosition, cancellationToken);
            return entity;
        }, cancellationToken);
    }

    public Task<WorkoutSet> MoveSetAsync(
        long userId, long workoutId, long setId, int newPosition, CancellationToken cancellationToken = default)
    {
        Positive(newPosition, nameof(newPosition));
        return WriteAsync(userId, workoutId, async _ =>
        {
            var entity = await RequireSetAsync(userId, workoutId, setId, cancellationToken);
            await SiblingOrdering.MoveAsync(database, entity,
                Sets(userId, workoutId).Where(x => x.WorkoutGroupId == entity.WorkoutGroupId),
                nameof(WorkoutSet.Position), newPosition, cancellationToken);
            return entity;
        }, cancellationToken);
    }

    public Task<WorkoutSetExercise> MoveSetExerciseAsync(
        long userId, long workoutId, long setExerciseId, int newPosition, CancellationToken cancellationToken = default)
    {
        Positive(newPosition, nameof(newPosition));
        return WriteAsync(userId, workoutId, async _ =>
        {
            var entity = await RequireSetExerciseAsync(userId, workoutId, setExerciseId, cancellationToken);
            await SiblingOrdering.MoveAsync(database, entity,
                SetExercises(userId, workoutId).Where(x => x.WorkoutSetId == entity.WorkoutSetId),
                nameof(WorkoutSetExercise.Position), newPosition, cancellationToken);
            return entity;
        }, cancellationToken);
    }
}
