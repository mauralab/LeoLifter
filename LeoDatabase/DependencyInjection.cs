using LeoDatabase.Context;
using LeoDatabase.Models.Personal;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LeoDatabase;

public static class DependencyInjection
{
    public static IServiceCollection AddLeoDatabase(this IServiceCollection services, string connectionString)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(connectionString);
        services.AddDbContext<LeoDbContext>(options => options.UseLeoDatabase(connectionString));
        return services;
    }

    public static DbContextOptionsBuilder UseLeoDatabase(
        this DbContextOptionsBuilder options, string connectionString)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(connectionString);
        return options.UseNpgsql(connectionString, postgres => postgres
            .MapEnum<ExerciseType>("exercise_type")
            .MapEnum<WeightUnit>("weight_unit")
            .MapEnum<LengthUnit>("length_unit")
            .MapEnum<ProgramValueUnit>("program_value_unit")
            .MapEnum<WorkoutValueUnit>("workout_value_unit"));
    }
}
