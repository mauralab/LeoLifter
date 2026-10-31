using LeoCore.Models.Workout;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class WorkoutManager
{
    public Task<WorkoutSetExercise> AddSetExerciseAsync(
        long userId, long workoutId, WorkoutResultDetails details, CancellationToken cancellationToken = default)
    {
        ValidateSetExercise(details);
        return WriteAsync(userId, workoutId, async _ =>
        {
            await RequireSetAsync(userId, workoutId, details.WorkoutSetId, cancellationToken);
            await ValidateResultReferencesAsync(userId, details, cancellationToken);
            await CheckSetExercisePositionAsync(userId, workoutId, null, details, cancellationToken);
            var entity = new WorkoutSetExercise();
            ApplySetExercise(entity, details);
            database.WorkoutSetExercises.Add(entity);
            return entity;
        }, cancellationToken);
    }

    public async Task<WorkoutSetExercise?> GetSetExerciseAsync(
        long userId, long workoutId, long setExerciseId, CancellationToken cancellationToken = default)
    {
        Positive(setExerciseId, nameof(setExerciseId));
        await RequireWorkoutAsync(userId, workoutId, cancellationToken);
        return await SetExercises(userId, workoutId).AsNoTracking().SingleOrDefaultAsync(x => x.Id == setExerciseId, cancellationToken);
    }

    public async Task<List<WorkoutSetExercise>> ListSetExercisesAsync(
        long userId, long workoutId, long setId, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        await RequireWorkoutAsync(userId, workoutId, cancellationToken);
        await RequireSetAsync(userId, workoutId, setId, cancellationToken);
        return await SetExercises(userId, workoutId).AsNoTracking().Where(x => x.WorkoutSetId == setId)
            .OrderBy(x => x.Position).ThenBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public Task<WorkoutSetExercise> EditSetExerciseAsync(
        long userId, long workoutId, long setExerciseId, WorkoutResultDetails details, CancellationToken cancellationToken = default)
    {
        ValidateSetExercise(details);
        return WriteAsync(userId, workoutId, async _ =>
        {
            var entity = await RequireSetExerciseAsync(userId, workoutId, setExerciseId, cancellationToken);
            await RequireSetAsync(userId, workoutId, details.WorkoutSetId, cancellationToken);
            await ValidateResultReferencesAsync(userId, details, cancellationToken);
            await CheckSetExercisePositionAsync(userId, workoutId, setExerciseId, details, cancellationToken);
            ApplySetExercise(entity, details);
            return entity;
        }, cancellationToken);
    }

    public async Task DeleteSetExerciseAsync(
        long userId, long workoutId, long setExerciseId, CancellationToken cancellationToken = default)
    {
        await WriteAsync(userId, workoutId, async _ =>
        {
            var entity = await RequireSetExerciseAsync(userId, workoutId, setExerciseId, cancellationToken);
            database.WorkoutSetExercises.Remove(entity);
            return true;
        }, cancellationToken);
    }

    private IQueryable<WorkoutSetExercise> SetExercises(long userId, long workoutId) =>
        database.WorkoutSetExercises.Where(x => x.WorkoutSet.WorkoutGroup.WorkoutId == workoutId && x.WorkoutSet.WorkoutGroup.Workout.UserId == userId);

    private async Task<WorkoutSetExercise> RequireSetExerciseAsync(
        long userId, long workoutId, long setExerciseId, CancellationToken cancellationToken)
    {
        Positive(setExerciseId, nameof(setExerciseId));
        return await SetExercises(userId, workoutId).SingleOrDefaultAsync(x => x.Id == setExerciseId, cancellationToken)
            ?? throw new KeyNotFoundException("SetExercise was not found in this user's workout.");
    }

    private async Task CheckSetExercisePositionAsync(
        long userId, long workoutId, long? id, WorkoutResultDetails details, CancellationToken cancellationToken)
    {
        if (await SetExercises(userId, workoutId).AnyAsync(x => x.Id != id &&
                x.WorkoutSetId == details.WorkoutSetId && x.Position == details.Position, cancellationToken))
            throw new InvalidOperationException("This position is already occupied within the parent.");
    }

    private static void ValidateSetExercise(WorkoutResultDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);
        ValidateResult(details);
    }

    private static void ApplySetExercise(WorkoutSetExercise entity, WorkoutResultDetails details)
    {
        entity.WorkoutSetId = details.WorkoutSetId;
        entity.Position = details.Position;
        entity.Value = details.Value;
        entity.ValueUnit = details.ValueUnit;
        entity.BodyWeightMeasurementId = details.BodyWeightMeasurementId;
        entity.AdditionalWeight = details.AdditionalWeight;
        entity.WeightUnit = details.WeightUnit;
        entity.TimeSpent = details.TimeSpent;
        entity.Rir = details.Rir;
    }
}
