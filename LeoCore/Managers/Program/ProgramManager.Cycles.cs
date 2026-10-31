using LeoCore.Models.Program;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class ProgramManager
{
    public Task<ProgramCycle> AddCycleAsync(long programId, CycleDetails details, CancellationToken cancellationToken = default)
    {
        ValidateCycle(details);
        return WriteAsync(programId, async _ =>
        {
            await ValidateParentAsync(programId, null, details.ParentCycleId, cancellationToken);
            await CheckCyclePositionAsync(programId, null, details, cancellationToken);
            var cycle = new ProgramCycle { ProgramId = programId };
            ApplyCycle(cycle, details);
            database.ProgramCycles.Add(cycle);
            return cycle;
        }, cancellationToken);
    }

    public async Task<ProgramCycle?> GetCycleAsync(long programId, long cycleId, CancellationToken cancellationToken = default)
    {
        Positive(cycleId, nameof(cycleId));
        await RequireProgramAsync(programId, cancellationToken);
        return await Cycles(programId).AsNoTracking().SingleOrDefaultAsync(x => x.Id == cycleId, cancellationToken);
    }

    public async Task<List<ProgramCycle>> ListCyclesAsync(
        long programId, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        await RequireProgramAsync(programId, cancellationToken);
        return await Cycles(programId).AsNoTracking().OrderBy(x => x.ParentCycleId).ThenBy(x => x.Position)
            .ThenBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public Task<ProgramCycle> EditCycleAsync(
        long programId, long cycleId, CycleDetails details, CancellationToken cancellationToken = default)
    {
        ValidateCycle(details);
        return WriteAsync(programId, async _ =>
        {
            var cycle = await RequireCycleAsync(programId, cycleId, cancellationToken);
            await ValidateParentAsync(programId, cycleId, details.ParentCycleId, cancellationToken);
            await CheckCyclePositionAsync(programId, cycleId, details, cancellationToken);
            ApplyCycle(cycle, details);
            return cycle;
        }, cancellationToken);
    }

    /// <summary>Deletes a cycle subtree, including its days and target prescriptions.</summary>
    public async Task DeleteCycleAsync(long programId, long cycleId, CancellationToken cancellationToken = default)
    {
        await WriteAsync(programId, async _ =>
        {
            var cycle = await RequireCycleAsync(programId, cycleId, cancellationToken);
            database.ProgramCycles.Remove(cycle);
            return true;
        }, cancellationToken);
    }

    private IQueryable<ProgramCycle> Cycles(long programId) => database.ProgramCycles.Where(x => x.ProgramId == programId);

    private async Task<ProgramCycle> RequireCycleAsync(long programId, long cycleId, CancellationToken cancellationToken)
    {
        Positive(cycleId, nameof(cycleId));
        return await Cycles(programId).SingleOrDefaultAsync(x => x.Id == cycleId, cancellationToken)
            ?? throw new KeyNotFoundException("Cycle was not found in this program.");
    }

    private async Task ValidateParentAsync(
        long programId, long? cycleId, long? parentId, CancellationToken cancellationToken)
    {
        if (parentId is null) return;
        Positive(parentId.Value, nameof(parentId));
        var parents = await Cycles(programId).AsNoTracking()
            .Select(x => new { x.Id, x.ParentCycleId })
            .ToDictionaryAsync(x => x.Id, x => x.ParentCycleId, cancellationToken);
        var visited = new HashSet<long>();
        while (parentId is { } id)
        {
            if (id == cycleId || !visited.Add(id))
                throw new InvalidOperationException("A cycle cannot be its own ancestor.");
            if (!parents.TryGetValue(id, out parentId))
                throw new KeyNotFoundException("Parent cycle was not found in this program.");
        }
    }

    private async Task CheckCyclePositionAsync(
        long programId, long? cycleId, CycleDetails details, CancellationToken cancellationToken)
    {
        if (await Cycles(programId).AnyAsync(
                x => x.Id != cycleId && x.ParentCycleId == details.ParentCycleId && x.Position == details.Position,
                cancellationToken))
            throw new InvalidOperationException("This position is already occupied by a sibling cycle.");
    }

    private static void ValidateCycle(CycleDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);
        RequiredName(details.Name);
        Positive(details.Position, nameof(details.Position));
        Positive(details.RepeatCount, nameof(details.RepeatCount));
    }

    private static void ApplyCycle(ProgramCycle cycle, CycleDetails details)
    {
        cycle.Name = details.Name.Trim();
        cycle.Position = details.Position;
        cycle.ParentCycleId = details.ParentCycleId;
        cycle.RepeatCount = details.RepeatCount;
        cycle.Description = OptionalText(details.Description);
    }
}
