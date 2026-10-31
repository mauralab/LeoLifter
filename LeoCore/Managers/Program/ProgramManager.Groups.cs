using LeoCore.Models.Program;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class ProgramManager
{
    public Task<ProgramDayGroup> AddGroupAsync(
        long programId, GroupDetails details, CancellationToken cancellationToken = default)
    {
        ValidateGroup(details);
        return WriteAsync(programId, async _ =>
        {
            await RequireDayAsync(programId, details.ProgramDayId, cancellationToken);

            await CheckGroupPositionAsync(programId, null, details, cancellationToken);
            var entity = new ProgramDayGroup();
            ApplyGroup(entity, details);
            database.ProgramDayGroups.Add(entity);
            return entity;
        }, cancellationToken);
    }

    public async Task<ProgramDayGroup?> GetGroupAsync(
        long programId, long groupId, CancellationToken cancellationToken = default)
    {
        Positive(groupId, nameof(groupId));
        await RequireProgramAsync(programId, cancellationToken);
        return await Groups(programId).AsNoTracking().SingleOrDefaultAsync(x => x.Id == groupId, cancellationToken);
    }

    public async Task<List<ProgramDayGroup>> ListGroupsAsync(
        long programId, long dayId, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        await RequireProgramAsync(programId, cancellationToken);
        await RequireDayAsync(programId, dayId, cancellationToken);
        return await Groups(programId).AsNoTracking().Where(x => x.ProgramDayId == dayId)
            .OrderBy(x => x.Position).ThenBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public Task<ProgramDayGroup> EditGroupAsync(
        long programId, long groupId, GroupDetails details, CancellationToken cancellationToken = default)
    {
        ValidateGroup(details);
        return WriteAsync(programId, async _ =>
        {
            var entity = await RequireGroupAsync(programId, groupId, cancellationToken);
            await RequireDayAsync(programId, details.ProgramDayId, cancellationToken);

            await CheckGroupPositionAsync(programId, groupId, details, cancellationToken);
            ApplyGroup(entity, details);
            return entity;
        }, cancellationToken);
    }

    public async Task DeleteGroupAsync(long programId, long groupId, CancellationToken cancellationToken = default)
    {
        await WriteAsync(programId, async _ =>
        {
            var entity = await RequireGroupAsync(programId, groupId, cancellationToken);
            database.ProgramDayGroups.Remove(entity);
            return true;
        }, cancellationToken);
    }

    private IQueryable<ProgramDayGroup> Groups(long programId) => database.ProgramDayGroups.Where(x => x.ProgramDay.ProgramCycle.ProgramId == programId);

    private async Task<ProgramDayGroup> RequireGroupAsync(long programId, long groupId, CancellationToken cancellationToken)
    {
        Positive(groupId, nameof(groupId));
        return await Groups(programId).SingleOrDefaultAsync(x => x.Id == groupId, cancellationToken)
            ?? throw new KeyNotFoundException("Group was not found in this program.");
    }

    private async Task CheckGroupPositionAsync(
        long programId, long? id, GroupDetails details, CancellationToken cancellationToken)
    {
        if (await Groups(programId).AnyAsync(x => x.Id != id &&
                x.ProgramDayId == details.ProgramDayId && x.Position == details.Position, cancellationToken))
            throw new InvalidOperationException("This position is already occupied within the parent.");
    }

    private static void ValidateGroup(GroupDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);
        Positive(details.ProgramDayId, nameof(details.ProgramDayId));
        Positive(details.Position, nameof(details.Position));
        Positive(details.RepeatCount, nameof(details.RepeatCount));
    }

    private static void ApplyGroup(ProgramDayGroup entity, GroupDetails details)
    {
        entity.ProgramDayId = details.ProgramDayId;
        entity.Position = details.Position;
        entity.Name = OptionalText(details.Name);
        entity.RepeatCount = details.RepeatCount;
    }
}
