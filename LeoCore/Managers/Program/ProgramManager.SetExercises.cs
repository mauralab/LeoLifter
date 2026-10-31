using LeoCore.Models.Program;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class ProgramManager
{
    public Task<ProgramSetExercise> AddSetExerciseAsync(
        long programId, SetExerciseDetails details, CancellationToken cancellationToken = default)
    {
        ValidateSetExercise(details);
        return WriteAsync(programId, async _ =>
        {
            await RequireSetAsync(programId, details.ProgramDaySetId, cancellationToken);

            await CheckSetExercisePositionAsync(programId, null, details, cancellationToken);
            var entity = new ProgramSetExercise();
            ApplySetExercise(entity, details);
            database.ProgramSetExercises.Add(entity);
            return entity;
        }, cancellationToken);
    }

    public async Task<ProgramSetExercise?> GetSetExerciseAsync(
        long programId, long setExerciseId, CancellationToken cancellationToken = default)
    {
        Positive(setExerciseId, nameof(setExerciseId));
        await RequireProgramAsync(programId, cancellationToken);
        return await SetExercises(programId).AsNoTracking().SingleOrDefaultAsync(x => x.Id == setExerciseId, cancellationToken);
    }

    public async Task<List<ProgramSetExercise>> ListSetExercisesAsync(
        long programId, long setId, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        await RequireProgramAsync(programId, cancellationToken);
        await RequireSetAsync(programId, setId, cancellationToken);
        return await SetExercises(programId).AsNoTracking().Where(x => x.ProgramDaySetId == setId)
            .OrderBy(x => x.Position).ThenBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public Task<ProgramSetExercise> EditSetExerciseAsync(
        long programId, long setExerciseId, SetExerciseDetails details, CancellationToken cancellationToken = default)
    {
        ValidateSetExercise(details);
        return WriteAsync(programId, async _ =>
        {
            var entity = await RequireSetExerciseAsync(programId, setExerciseId, cancellationToken);
            await RequireSetAsync(programId, details.ProgramDaySetId, cancellationToken);

            await CheckSetExercisePositionAsync(programId, setExerciseId, details, cancellationToken);
            ApplySetExercise(entity, details);
            return entity;
        }, cancellationToken);
    }

    public async Task DeleteSetExerciseAsync(long programId, long setExerciseId, CancellationToken cancellationToken = default)
    {
        await WriteAsync(programId, async _ =>
        {
            var entity = await RequireSetExerciseAsync(programId, setExerciseId, cancellationToken);
            database.ProgramSetExercises.Remove(entity);
            return true;
        }, cancellationToken);
    }

    private IQueryable<ProgramSetExercise> SetExercises(long programId) => database.ProgramSetExercises.Where(x => x.ProgramDaySet.ProgramGroup.ProgramDay.ProgramCycle.ProgramId == programId);

    private async Task<ProgramSetExercise> RequireSetExerciseAsync(long programId, long setExerciseId, CancellationToken cancellationToken)
    {
        Positive(setExerciseId, nameof(setExerciseId));
        return await SetExercises(programId).SingleOrDefaultAsync(x => x.Id == setExerciseId, cancellationToken)
            ?? throw new KeyNotFoundException("SetExercise was not found in this program.");
    }

    private async Task CheckSetExercisePositionAsync(
        long programId, long? id, SetExerciseDetails details, CancellationToken cancellationToken)
    {
        if (await SetExercises(programId).AnyAsync(x => x.Id != id &&
                x.ProgramDaySetId == details.ProgramDaySetId && x.Position == details.Position, cancellationToken))
            throw new InvalidOperationException("This position is already occupied within the parent.");
    }

    private static void ValidateSetExercise(SetExerciseDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);
        Positive(details.ProgramDaySetId, nameof(details.ProgramDaySetId));
        Positive(details.Position, nameof(details.Position));
        ValidateTargets(details);
    }

    private static void ApplySetExercise(ProgramSetExercise entity, SetExerciseDetails details)
    {
        entity.ProgramDaySetId = details.ProgramDaySetId;
        entity.Position = details.Position;
        entity.TargetRepsMin = details.TargetRepsMin;
        entity.TargetRepsMax = details.TargetRepsMax;
        entity.ValueMin = details.ValueMin;
        entity.ValueMax = details.ValueMax;
        entity.ValueUnit = details.ValueUnit;
    }
}
