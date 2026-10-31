using LeoCore.Models.Workout;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class WorkoutManager
{
    public Task<WorkoutSet> AddSetAsync(
        long userId, long workoutId, WorkoutSetDetails details, CancellationToken cancellationToken = default)
    {
        ValidateSet(details);
        return WriteAsync(userId, workoutId, async _ =>
        {
            await RequireGroupAsync(userId, workoutId, details.WorkoutGroupId, cancellationToken);
            await RequireExerciseAsync(details.ExerciseId, cancellationToken);
            await CheckSetPositionAsync(userId, workoutId, null, details, cancellationToken);
            var entity = new WorkoutSet();
            ApplySet(entity, details);
            database.WorkoutSets.Add(entity);
            return entity;
        }, cancellationToken);
    }

    public async Task<WorkoutSet?> GetSetAsync(
        long userId, long workoutId, long setId, CancellationToken cancellationToken = default)
    {
        Positive(setId, nameof(setId));
        await RequireWorkoutAsync(userId, workoutId, cancellationToken);
        return await Sets(userId, workoutId).AsNoTracking().SingleOrDefaultAsync(x => x.Id == setId, cancellationToken);
    }

    public async Task<List<WorkoutSet>> ListSetsAsync(
        long userId, long workoutId, long groupId, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        await RequireWorkoutAsync(userId, workoutId, cancellationToken);
        await RequireGroupAsync(userId, workoutId, groupId, cancellationToken);
        return await Sets(userId, workoutId).AsNoTracking().Where(x => x.WorkoutGroupId == groupId)
            .OrderBy(x => x.Position).ThenBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public Task<WorkoutSet> EditSetAsync(
        long userId, long workoutId, long setId, WorkoutSetDetails details, CancellationToken cancellationToken = default)
    {
        ValidateSet(details);
        return WriteAsync(userId, workoutId, async _ =>
        {
            var entity = await RequireSetAsync(userId, workoutId, setId, cancellationToken);
            await RequireGroupAsync(userId, workoutId, details.WorkoutGroupId, cancellationToken);
            var exercise = await RequireExerciseAsync(details.ExerciseId, cancellationToken);
            var resultUnits = await database.WorkoutSetExercises.AsNoTracking().Where(x => x.WorkoutSetId == entity.Id)
                .Select(x => x.ValueUnit).ToListAsync(cancellationToken);
            foreach (var unit in resultUnits) ValidateExerciseUnit(exercise.Type, unit);
            await CheckSetPositionAsync(userId, workoutId, setId, details, cancellationToken);
            ApplySet(entity, details);
            return entity;
        }, cancellationToken);
    }

    public async Task DeleteSetAsync(
        long userId, long workoutId, long setId, CancellationToken cancellationToken = default)
    {
        await WriteAsync(userId, workoutId, async _ =>
        {
            var entity = await RequireSetAsync(userId, workoutId, setId, cancellationToken);
            database.WorkoutSets.Remove(entity);
            return true;
        }, cancellationToken);
    }

    private IQueryable<WorkoutSet> Sets(long userId, long workoutId) =>
        database.WorkoutSets.Where(x => x.WorkoutGroup.WorkoutId == workoutId && x.WorkoutGroup.Workout.UserId == userId);

    private async Task<WorkoutSet> RequireSetAsync(
        long userId, long workoutId, long setId, CancellationToken cancellationToken)
    {
        Positive(setId, nameof(setId));
        return await Sets(userId, workoutId).SingleOrDefaultAsync(x => x.Id == setId, cancellationToken)
            ?? throw new KeyNotFoundException("Set was not found in this user's workout.");
    }

    private async Task CheckSetPositionAsync(
        long userId, long workoutId, long? id, WorkoutSetDetails details, CancellationToken cancellationToken)
    {
        if (await Sets(userId, workoutId).AnyAsync(x => x.Id != id &&
                x.WorkoutGroupId == details.WorkoutGroupId && x.Position == details.Position, cancellationToken))
            throw new InvalidOperationException("This position is already occupied within the parent.");
    }

    private static void ValidateSet(WorkoutSetDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);
        Positive(details.WorkoutGroupId, nameof(details.WorkoutGroupId));
        Positive(details.Position, nameof(details.Position));
        Positive(details.ExerciseId, nameof(details.ExerciseId));
    }

    private static void ApplySet(WorkoutSet entity, WorkoutSetDetails details)
    {
        entity.WorkoutGroupId = details.WorkoutGroupId;
        entity.Position = details.Position;
        entity.ExerciseId = details.ExerciseId;
    }
}
