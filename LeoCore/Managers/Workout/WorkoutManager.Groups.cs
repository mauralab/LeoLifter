using LeoCore.Models.Workout;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class WorkoutManager
{
    public Task<WorkoutGroup> AddGroupAsync(
        long userId, long workoutId, WorkoutGroupDetails details, CancellationToken cancellationToken = default)
    {
        ValidateGroup(details);
        return WriteAsync(userId, workoutId, async _ =>
        {


            await CheckGroupPositionAsync(userId, workoutId, null, details, cancellationToken);
            var entity = new WorkoutGroup() { WorkoutId = workoutId };
            ApplyGroup(entity, details);
            database.WorkoutGroups.Add(entity);
            return entity;
        }, cancellationToken);
    }

    public async Task<WorkoutGroup?> GetGroupAsync(
        long userId, long workoutId, long groupId, CancellationToken cancellationToken = default)
    {
        Positive(groupId, nameof(groupId));
        await RequireWorkoutAsync(userId, workoutId, cancellationToken);
        return await Groups(userId, workoutId).AsNoTracking().SingleOrDefaultAsync(x => x.Id == groupId, cancellationToken);
    }

    public async Task<List<WorkoutGroup>> ListGroupsAsync(
        long userId, long workoutId, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        await RequireWorkoutAsync(userId, workoutId, cancellationToken);

        return await Groups(userId, workoutId).AsNoTracking()
            .OrderBy(x => x.Position).ThenBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public Task<WorkoutGroup> EditGroupAsync(
        long userId, long workoutId, long groupId, WorkoutGroupDetails details, CancellationToken cancellationToken = default)
    {
        ValidateGroup(details);
        return WriteAsync(userId, workoutId, async _ =>
        {
            var entity = await RequireGroupAsync(userId, workoutId, groupId, cancellationToken);


            await CheckGroupPositionAsync(userId, workoutId, groupId, details, cancellationToken);
            ApplyGroup(entity, details);
            return entity;
        }, cancellationToken);
    }

    public async Task DeleteGroupAsync(
        long userId, long workoutId, long groupId, CancellationToken cancellationToken = default)
    {
        await WriteAsync(userId, workoutId, async _ =>
        {
            var entity = await RequireGroupAsync(userId, workoutId, groupId, cancellationToken);
            database.WorkoutGroups.Remove(entity);
            return true;
        }, cancellationToken);
    }

    private IQueryable<WorkoutGroup> Groups(long userId, long workoutId) =>
        database.WorkoutGroups.Where(x => x.WorkoutId == workoutId && x.Workout.UserId == userId);

    private async Task<WorkoutGroup> RequireGroupAsync(
        long userId, long workoutId, long groupId, CancellationToken cancellationToken)
    {
        Positive(groupId, nameof(groupId));
        return await Groups(userId, workoutId).SingleOrDefaultAsync(x => x.Id == groupId, cancellationToken)
            ?? throw new KeyNotFoundException("Group was not found in this user's workout.");
    }

    private async Task CheckGroupPositionAsync(
        long userId, long workoutId, long? id, WorkoutGroupDetails details, CancellationToken cancellationToken)
    {
        if (await Groups(userId, workoutId).AnyAsync(x => x.Id != id &&
                x.Position == details.Position, cancellationToken))
            throw new InvalidOperationException("This position is already occupied within the parent.");
    }

    private static void ValidateGroup(WorkoutGroupDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);
        Positive(details.Position, nameof(details.Position));
        Positive(details.RepeatCount, nameof(details.RepeatCount));
    }

    private static void ApplyGroup(WorkoutGroup entity, WorkoutGroupDetails details)
    {
        entity.Position = details.Position;
        entity.Name = OptionalText(details.Name);
        entity.RepeatCount = details.RepeatCount;
    }
}
