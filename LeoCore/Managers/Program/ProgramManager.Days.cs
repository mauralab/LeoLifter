using LeoCore.Models.Program;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class ProgramManager
{
    public Task<ProgramDay> AddDayAsync(
        long programId, DayDetails details, CancellationToken cancellationToken = default)
    {
        ValidateDay(details);
        return WriteAsync(programId, async _ =>
        {
            await RequireCycleAsync(programId, details.ProgramCycleId, cancellationToken);

            await CheckDayPositionAsync(programId, null, details, cancellationToken);
            var entity = new ProgramDay();
            ApplyDay(entity, details);
            database.ProgramDays.Add(entity);
            return entity;
        }, cancellationToken);
    }

    public async Task<ProgramDay?> GetDayAsync(
        long programId, long dayId, CancellationToken cancellationToken = default)
    {
        Positive(dayId, nameof(dayId));
        await RequireProgramAsync(programId, cancellationToken);
        return await Days(programId).AsNoTracking().SingleOrDefaultAsync(x => x.Id == dayId, cancellationToken);
    }

    public async Task<List<ProgramDay>> ListDaysAsync(
        long programId, long cycleId, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        await RequireProgramAsync(programId, cancellationToken);
        await RequireCycleAsync(programId, cycleId, cancellationToken);
        return await Days(programId).AsNoTracking().Where(x => x.ProgramCycleId == cycleId)
            .OrderBy(x => x.DayIndex).ThenBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public Task<ProgramDay> EditDayAsync(
        long programId, long dayId, DayDetails details, CancellationToken cancellationToken = default)
    {
        ValidateDay(details);
        return WriteAsync(programId, async _ =>
        {
            var entity = await RequireDayAsync(programId, dayId, cancellationToken);
            await RequireCycleAsync(programId, details.ProgramCycleId, cancellationToken);

            await CheckDayPositionAsync(programId, dayId, details, cancellationToken);
            ApplyDay(entity, details);
            return entity;
        }, cancellationToken);
    }

    public async Task DeleteDayAsync(long programId, long dayId, CancellationToken cancellationToken = default)
    {
        await WriteAsync(programId, async _ =>
        {
            var entity = await RequireDayAsync(programId, dayId, cancellationToken);
            database.ProgramDays.Remove(entity);
            return true;
        }, cancellationToken);
    }

    private IQueryable<ProgramDay> Days(long programId) => database.ProgramDays.Where(x => x.ProgramCycle.ProgramId == programId);

    private async Task<ProgramDay> RequireDayAsync(long programId, long dayId, CancellationToken cancellationToken)
    {
        Positive(dayId, nameof(dayId));
        return await Days(programId).SingleOrDefaultAsync(x => x.Id == dayId, cancellationToken)
            ?? throw new KeyNotFoundException("Day was not found in this program.");
    }

    private async Task CheckDayPositionAsync(
        long programId, long? id, DayDetails details, CancellationToken cancellationToken)
    {
        if (await Days(programId).AnyAsync(x => x.Id != id &&
                x.ProgramCycleId == details.ProgramCycleId && x.DayIndex == details.DayIndex, cancellationToken))
            throw new InvalidOperationException("This day index is already occupied within the parent.");
    }

    private static void ValidateDay(DayDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);
        Positive(details.ProgramCycleId, nameof(details.ProgramCycleId));
        Positive(details.DayIndex, nameof(details.DayIndex));
    }

    private static void ApplyDay(ProgramDay entity, DayDetails details)
    {
        entity.ProgramCycleId = details.ProgramCycleId;
        entity.DayIndex = details.DayIndex;
    }
}
