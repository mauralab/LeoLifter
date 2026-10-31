using LeoCore.Models.Workout;
using LeoDatabase.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using WorkoutEntity = LeoDatabase.Models.Workout.Workout;

namespace LeoCore.Managers;

public sealed partial class WorkoutManager(LeoDbContext database)
{
    /// <summary>Creates a workout header; setting ProgramDayId does not copy its template.</summary>
    public async Task<WorkoutEntity> CreateAsync(
        long userId, WorkoutDetails details, CancellationToken cancellationToken = default)
    {
        ValidateWorkout(details);
        await RequireUserAsync(userId, cancellationToken);
        await ValidateSourceDayAsync(details.ProgramDayId, cancellationToken);
        var workout = new WorkoutEntity { UserId = userId };
        ApplyWorkout(workout, details);
        database.Workouts.Add(workout);
        await database.SaveChangesAsync(cancellationToken);
        return workout;
    }

    public async Task<WorkoutEntity?> FindAsync(
        long userId, long workoutId, CancellationToken cancellationToken = default)
    {
        Positive(workoutId, nameof(workoutId));
        await RequireUserAsync(userId, cancellationToken);
        return await Workouts(userId).AsNoTracking().SingleOrDefaultAsync(x => x.Id == workoutId, cancellationToken);
    }

    public async Task<List<WorkoutEntity>> ListAsync(
        long userId, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        await RequireUserAsync(userId, cancellationToken);
        return await Workouts(userId).AsNoTracking().OrderByDescending(x => x.Id)
            .Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public async Task<WorkoutEntity?> GetStructureAsync(
        long userId, long workoutId, CancellationToken cancellationToken = default)
    {
        Positive(workoutId, nameof(workoutId));
        await RequireUserAsync(userId, cancellationToken);
        return await Workouts(userId).AsNoTrackingWithIdentityResolution().AsSplitQuery()
            .Include(x => x.Groups).ThenInclude(x => x.Sets).ThenInclude(x => x.Exercise)
            .Include(x => x.Groups).ThenInclude(x => x.Sets).ThenInclude(x => x.SetExercises)
                .ThenInclude(x => x.BodyWeightMeasurement)
            .SingleOrDefaultAsync(x => x.Id == workoutId, cancellationToken);
    }

    public Task<WorkoutEntity> EditAsync(
        long userId, long workoutId, WorkoutDetails details, CancellationToken cancellationToken = default)
    {
        ValidateWorkout(details);
        return WriteAsync(userId, workoutId, async workout =>
        {
            await ValidateSourceDayAsync(details.ProgramDayId, cancellationToken);
            ApplyWorkout(workout, details);
            return workout;
        }, cancellationToken);
    }

    public async Task DeleteAsync(long userId, long workoutId, CancellationToken cancellationToken = default)
    {
        await WriteAsync(userId, workoutId, workout =>
        {
            database.Workouts.Remove(workout);
            return Task.FromResult(true);
        }, cancellationToken);
    }

    private IQueryable<WorkoutEntity> Workouts(long userId) => database.Workouts.Where(x => x.UserId == userId);

    private async Task RequireUserAsync(long userId, CancellationToken cancellationToken)
    {
        Positive(userId, nameof(userId));
        if (!await database.Users.AnyAsync(x => x.Id == userId, cancellationToken))
            throw new KeyNotFoundException("User was not found.");
    }

    private async Task<WorkoutEntity> RequireWorkoutAsync(
        long userId, long workoutId, CancellationToken cancellationToken)
    {
        Positive(userId, nameof(userId));
        Positive(workoutId, nameof(workoutId));
        return await Workouts(userId).SingleOrDefaultAsync(x => x.Id == workoutId, cancellationToken)
            ?? throw new KeyNotFoundException("Workout was not found for this user.");
    }

    // All edits to an existing workout acquire its row lock before validation.
    private async Task<T> WriteAsync<T>(
        long userId, long workoutId, Func<WorkoutEntity, Task<T>> operation, CancellationToken cancellationToken)
    {
        Positive(userId, nameof(userId));
        Positive(workoutId, nameof(workoutId));
        IDbContextTransaction? transaction = null;
        IDbContextTransaction? callerTransaction = null;
        string? savepoint = null;
        try
        {
            WorkoutEntity workout;
            if (database.Database.IsRelational())
            {
                if (database.Database.CurrentTransaction is null)
                    transaction = await database.Database.BeginTransactionAsync(cancellationToken);
                else
                {
                    callerTransaction = database.Database.CurrentTransaction;
                    var savepointName = $"leo_workout_{Guid.NewGuid():N}";
                    await callerTransaction.CreateSavepointAsync(savepointName, cancellationToken);
                    savepoint = savepointName;
                }
                var workouts = await database.Workouts.FromSqlInterpolated(
                    $"SELECT * FROM workouts WHERE id = {workoutId} AND user_id = {userId} FOR UPDATE")
                    .ToListAsync(cancellationToken);
                workout = workouts.SingleOrDefault() ?? throw new KeyNotFoundException("Workout was not found for this user.");
            }
            else
                workout = await RequireWorkoutAsync(userId, workoutId, cancellationToken);

            var result = await operation(workout);
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

    private async Task ValidateSourceDayAsync(long? dayId, CancellationToken cancellationToken)
    {
        if (dayId is not { } id) return;
        Positive(id, nameof(dayId));
        if (!await database.ProgramDays.AnyAsync(x => x.Id == id, cancellationToken))
            throw new KeyNotFoundException("Source program day was not found.");
    }

    private static void ValidateWorkout(WorkoutDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);
        if (details.ScheduledAt is { Kind: not DateTimeKind.Utc } ||
            details.CompletedAt is { Kind: not DateTimeKind.Utc })
            throw new ArgumentException("Workout timestamps must be UTC.", nameof(details));
    }

    private static void ApplyWorkout(WorkoutEntity workout, WorkoutDetails details)
    {
        workout.ProgramDayId = details.ProgramDayId;
        workout.ScheduledAt = details.ScheduledAt;
        workout.CompletedAt = details.CompletedAt;
    }

    private static void Positive(long value, string parameterName)
    {
        if (value <= 0) throw new ArgumentOutOfRangeException(parameterName, "Value must be positive.");
    }

    private static void ValidatePage(int skip, int take)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(skip);
        if (take is < 1 or > 100)
            throw new ArgumentOutOfRangeException(nameof(take), "Page size must be between 1 and 100.");
    }

    private static string? OptionalText(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();
}
