using LeoCore.Models.Program;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class ProgramManager
{
    public Task<ProgramDaySet> AddSetAsync(
        long programId, SetDetails details, CancellationToken cancellationToken = default)
    {
        ValidateSet(details);
        return WriteAsync(programId, async _ =>
        {
            await RequireGroupAsync(programId, details.ProgramGroupId, cancellationToken);
            if (!await database.Exercises.AnyAsync(x => x.Id == details.ExerciseId, cancellationToken))
                throw new KeyNotFoundException("Exercise was not found.");
            await CheckSetPositionAsync(programId, null, details, cancellationToken);
            var entity = new ProgramDaySet();
            ApplySet(entity, details);
            database.ProgramDaySets.Add(entity);
            return entity;
        }, cancellationToken);
    }

    public async Task<ProgramDaySet?> GetSetAsync(
        long programId, long setId, CancellationToken cancellationToken = default)
    {
        Positive(setId, nameof(setId));
        await RequireProgramAsync(programId, cancellationToken);
        return await Sets(programId).AsNoTracking().SingleOrDefaultAsync(x => x.Id == setId, cancellationToken);
    }

    public async Task<List<ProgramDaySet>> ListSetsAsync(
        long programId, long groupId, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        await RequireProgramAsync(programId, cancellationToken);
        await RequireGroupAsync(programId, groupId, cancellationToken);
        return await Sets(programId).AsNoTracking().Where(x => x.ProgramGroupId == groupId)
            .OrderBy(x => x.Position).ThenBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public Task<ProgramDaySet> EditSetAsync(
        long programId, long setId, SetDetails details, CancellationToken cancellationToken = default)
    {
        ValidateSet(details);
        return WriteAsync(programId, async _ =>
        {
            var entity = await RequireSetAsync(programId, setId, cancellationToken);
            await RequireGroupAsync(programId, details.ProgramGroupId, cancellationToken);
            if (!await database.Exercises.AnyAsync(x => x.Id == details.ExerciseId, cancellationToken))
                throw new KeyNotFoundException("Exercise was not found.");
            await CheckSetPositionAsync(programId, setId, details, cancellationToken);
            ApplySet(entity, details);
            return entity;
        }, cancellationToken);
    }

    public async Task DeleteSetAsync(long programId, long setId, CancellationToken cancellationToken = default)
    {
        await WriteAsync(programId, async _ =>
        {
            var entity = await RequireSetAsync(programId, setId, cancellationToken);
            database.ProgramDaySets.Remove(entity);
            return true;
        }, cancellationToken);
    }

    private IQueryable<ProgramDaySet> Sets(long programId) => database.ProgramDaySets.Where(x => x.ProgramGroup.ProgramDay.ProgramCycle.ProgramId == programId);

    private async Task<ProgramDaySet> RequireSetAsync(long programId, long setId, CancellationToken cancellationToken)
    {
        Positive(setId, nameof(setId));
        return await Sets(programId).SingleOrDefaultAsync(x => x.Id == setId, cancellationToken)
            ?? throw new KeyNotFoundException("Set was not found in this program.");
    }

    private async Task CheckSetPositionAsync(
        long programId, long? id, SetDetails details, CancellationToken cancellationToken)
    {
        if (await Sets(programId).AnyAsync(x => x.Id != id &&
                x.ProgramGroupId == details.ProgramGroupId && x.Position == details.Position, cancellationToken))
            throw new InvalidOperationException("This position is already occupied within the parent.");
    }

    private static void ValidateSet(SetDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);
        Positive(details.ProgramGroupId, nameof(details.ProgramGroupId));
        Positive(details.Position, nameof(details.Position));
        Positive(details.ExerciseId, nameof(details.ExerciseId));
    }

    private static void ApplySet(ProgramDaySet entity, SetDetails details)
    {
        entity.ProgramGroupId = details.ProgramGroupId;
        entity.Position = details.Position;
        entity.ExerciseId = details.ExerciseId;
    }
}
