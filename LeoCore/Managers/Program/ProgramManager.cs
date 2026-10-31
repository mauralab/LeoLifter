using LeoCore.Models.Program;
using LeoDatabase.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using TrainingProgram = LeoDatabase.Models.Workout.Program;

namespace LeoCore.Managers;

public sealed partial class ProgramManager(LeoDbContext database)
{
    public async Task<TrainingProgram> CreateAsync(ProgramDetails details, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(details);
        var name = RequiredName(details.Name);
        await ValidateAuthorAsync(details.AuthorId, cancellationToken);
        var program = new TrainingProgram { Name = name, AuthorId = details.AuthorId, IsPublic = details.IsPublic };
        database.Programs.Add(program);
        await database.SaveChangesAsync(cancellationToken);
        return program;
    }

    public Task<TrainingProgram?> FindAsync(long programId, CancellationToken cancellationToken = default)
    {
        Positive(programId, nameof(programId));
        return database.Programs.AsNoTracking().SingleOrDefaultAsync(x => x.Id == programId, cancellationToken);
    }

    public Task<List<TrainingProgram>> ListAsync(
        int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        return database.Programs.AsNoTracking().OrderBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public Task<List<TrainingProgram>> SearchAsync(
        string query, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);
        ValidatePage(skip, take);
        var text = query.Trim().ToLowerInvariant();
        var numeric = long.TryParse(text, out var id);
        return database.Programs.AsNoTracking()
            .Where(x => x.Name.ToLower().Contains(text) || (numeric && x.Id == id))
            .OrderBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    /// <summary>Loads the complete template; Cycles includes every cycle, linked through ParentCycleId.</summary>
    public Task<TrainingProgram?> GetStructureAsync(long programId, CancellationToken cancellationToken = default)
    {
        Positive(programId, nameof(programId));
        return database.Programs.AsNoTrackingWithIdentityResolution().AsSplitQuery()
            .Include(x => x.Cycles).ThenInclude(x => x.Days).ThenInclude(x => x.Groups)
                .ThenInclude(x => x.Sets).ThenInclude(x => x.SetExercises)
            .Include(x => x.Cycles).ThenInclude(x => x.Days).ThenInclude(x => x.Groups)
                .ThenInclude(x => x.Sets).ThenInclude(x => x.Exercise)
            .SingleOrDefaultAsync(x => x.Id == programId, cancellationToken);
    }

    public Task<TrainingProgram> EditAsync(
        long programId, ProgramDetails details, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(details);
        var name = RequiredName(details.Name);
        return WriteAsync(programId, async program =>
        {
            await ValidateAuthorAsync(details.AuthorId, cancellationToken);
            program.Name = name;
            program.AuthorId = details.AuthorId;
            program.IsPublic = details.IsPublic;
            return program;
        }, cancellationToken);
    }

    /// <summary>Deletes the template and its structure, preserving recorded workout history.</summary>
    public async Task DeleteAsync(long programId, CancellationToken cancellationToken = default)
    {
        await WriteAsync(programId, program =>
        {
            database.Programs.Remove(program);
            return Task.FromResult(true);
        }, cancellationToken);
    }

    private async Task<TrainingProgram> RequireProgramAsync(long programId, CancellationToken cancellationToken)
    {
        Positive(programId, nameof(programId));
        return await database.Programs.SingleOrDefaultAsync(x => x.Id == programId, cancellationToken)
            ?? throw new KeyNotFoundException("Program was not found.");
    }

    // Serialize this manager's structural edits to a given program. The lock lives
    // until commit, preventing concurrent reparenting from creating cycle loops.
    private async Task<T> WriteAsync<T>(
        long programId, Func<TrainingProgram, Task<T>> operation, CancellationToken cancellationToken)
    {
        Positive(programId, nameof(programId));
        IDbContextTransaction? transaction = null;
        IDbContextTransaction? callerTransaction = null;
        string? savepoint = null;
        try
        {
            TrainingProgram program;
            if (database.Database.IsRelational())
            {
                if (database.Database.CurrentTransaction is null)
                    transaction = await database.Database.BeginTransactionAsync(cancellationToken);
                else
                {
                    callerTransaction = database.Database.CurrentTransaction;
                    var savepointName = $"leo_program_{Guid.NewGuid():N}";
                    await callerTransaction.CreateSavepointAsync(savepointName, cancellationToken);
                    savepoint = savepointName;
                }
                var programs = await database.Programs.FromSqlInterpolated(
                    $"SELECT * FROM programs WHERE id = {programId} FOR UPDATE").ToListAsync(cancellationToken);
                program = programs.SingleOrDefault() ?? throw new KeyNotFoundException("Program was not found.");
            }
            else
            {
                program = await RequireProgramAsync(programId, cancellationToken);
            }

            var result = await operation(program);
            await database.SaveChangesAsync(cancellationToken);
            if (transaction is not null) await transaction.CommitAsync(cancellationToken);
            if (callerTransaction is not null && savepoint is not null)
                await callerTransaction.ReleaseSavepointAsync(savepoint, cancellationToken);
            return result;
        }
        catch
        {
            if (callerTransaction is not null && savepoint is not null)
            {
                await callerTransaction.RollbackToSavepointAsync(savepoint, CancellationToken.None);
                await callerTransaction.ReleaseSavepointAsync(savepoint, CancellationToken.None);
            }
            throw;
        }
        finally
        {
            if (transaction is not null) await transaction.DisposeAsync();
        }
    }

    private async Task ValidateAuthorAsync(long? authorId, CancellationToken cancellationToken)
    {
        if (authorId is not { } id) return;
        Positive(id, nameof(authorId));
        if (!await database.Users.AnyAsync(x => x.Id == id, cancellationToken))
            throw new KeyNotFoundException("Program author was not found.");
    }

    private static string RequiredName(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        return name.Trim();
    }

    private static string? OptionalText(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void Positive(long value, string parameterName)
    {
        if (value <= 0) throw new ArgumentOutOfRangeException(parameterName, "Value must be positive.");
    }

    private static void ValidatePage(int skip, int take)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(skip);
        if (take is < 1 or > 100) throw new ArgumentOutOfRangeException(nameof(take), "Page size must be between 1 and 100.");
    }
}
