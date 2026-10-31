using LeoCore.Models.Program;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class ProgramManager
{
    public async Task<Exercise> AddExerciseAsync(ExerciseDetails details, CancellationToken cancellationToken = default)
    {
        ValidateExercise(details);
        var exercise = new Exercise();
        ApplyExercise(exercise, details);
        database.Exercises.Add(exercise);
        await database.SaveChangesAsync(cancellationToken);
        return exercise;
    }

    public Task<Exercise?> GetExerciseAsync(long exerciseId, CancellationToken cancellationToken = default)
    {
        Positive(exerciseId, nameof(exerciseId));
        return database.Exercises.AsNoTracking().SingleOrDefaultAsync(x => x.Id == exerciseId, cancellationToken);
    }

    public Task<List<Exercise>> ListExercisesAsync(
        int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        return database.Exercises.AsNoTracking().OrderBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public async Task<Exercise> EditExerciseAsync(
        long exerciseId, ExerciseDetails details, CancellationToken cancellationToken = default)
    {
        Positive(exerciseId, nameof(exerciseId));
        ValidateExercise(details);
        var exercise = await database.Exercises.SingleOrDefaultAsync(x => x.Id == exerciseId, cancellationToken)
            ?? throw new KeyNotFoundException("Exercise was not found.");
        ApplyExercise(exercise, details);
        await database.SaveChangesAsync(cancellationToken);
        return exercise;
    }

    public async Task DeleteExerciseAsync(long exerciseId, CancellationToken cancellationToken = default)
    {
        Positive(exerciseId, nameof(exerciseId));
        var exercise = await database.Exercises.SingleOrDefaultAsync(x => x.Id == exerciseId, cancellationToken)
            ?? throw new KeyNotFoundException("Exercise was not found.");
        if (await database.ProgramDaySets.AnyAsync(x => x.ExerciseId == exerciseId, cancellationToken) ||
            await database.WorkoutSets.AnyAsync(x => x.ExerciseId == exerciseId, cancellationToken))
            throw new InvalidOperationException("An exercise referenced by a program or workout cannot be deleted.");
        database.Exercises.Remove(exercise);
        await database.SaveChangesAsync(cancellationToken);
    }

    private static void ValidateExercise(ExerciseDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);
        RequiredName(details.Name);
        if (!Enum.IsDefined(details.Type)) throw new ArgumentOutOfRangeException(nameof(details), "Unknown exercise type.");
    }

    private static void ApplyExercise(Exercise exercise, ExerciseDetails details)
    {
        exercise.Name = details.Name.Trim();
        exercise.Type = details.Type;
        exercise.IncludesOwnWeight = details.IncludesOwnWeight;
        exercise.IncludesAdditionalWeight = details.IncludesAdditionalWeight;
        exercise.Description = OptionalText(details.Description);
    }
}
