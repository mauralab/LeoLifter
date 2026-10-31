using LeoDatabase.Models.Access;
using LeoDatabase.Models.Personal;
using LeoDatabase.Models.Users;
using LeoDatabase.Models.Workout;
using TrainingProgram = LeoDatabase.Models.Workout.Program;
using WorkoutEntity = LeoDatabase.Models.Workout.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoDatabase.Context.Configurations;

internal static class WorkoutConfiguration
{
    public static void Configure(ModelBuilder model)
    {
        model.Entity<WorkoutEntity>(e =>
        {
            e.ToTable("workouts");
            e.HasIndex(x => new { x.UserId, x.ScheduledAt });
            e.HasOne(x => x.User).WithMany(x => x.Workouts)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ProgramDay).WithMany(x => x.Workouts)
                .HasForeignKey(x => x.ProgramDayId).OnDelete(DeleteBehavior.SetNull);
        });
        model.Entity<WorkoutGroup>(e =>
        {
            e.ToTable("workout_groups", t =>
            {
                t.HasCheckConstraint("workout_group_position_check", "position >= 1");
                t.HasCheckConstraint("workout_group_repeat_check", "repeat_count >= 1");
            });
            e.Property(x => x.RepeatCount).HasDefaultValue(1);
            e.HasIndex(x => new { x.WorkoutId, x.Position }).IsUnique();
            e.HasOne(x => x.Workout).WithMany(x => x.Groups)
                .HasForeignKey(x => x.WorkoutId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<WorkoutSet>(e =>
        {
            e.ToTable("workout_sets", t => t.HasCheckConstraint("workout_set_position_check", "position >= 1"));
            e.HasIndex(x => new { x.WorkoutGroupId, x.Position }).IsUnique();
            e.HasOne(x => x.WorkoutGroup).WithMany(x => x.Sets)
                .HasForeignKey(x => x.WorkoutGroupId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Exercise).WithMany(x => x.WorkoutSets)
                .HasForeignKey(x => x.ExerciseId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<WorkoutSetExercise>(e =>
        {
            e.ToTable("workout_set_exercises", t =>
            {
                t.HasCheckConstraint("workout_set_exercise_position_check", "position >= 1");
                t.HasCheckConstraint("workout_set_value_check", "value >= 0");
                t.HasCheckConstraint("workout_set_time_check", "time_spent >= 0");
                t.HasCheckConstraint("workout_set_rir_check", "rir >= 0");
                t.HasCheckConstraint("workout_set_weight_check",
                    "(additional_weight IS NULL AND weight_unit IS NULL) OR " +
                    "(additional_weight IS NOT NULL AND weight_unit IS NOT NULL AND additional_weight >= 0)");
                t.HasCheckConstraint("workout_set_whole_repetitions_check", "value_unit <> 'rep' OR value = trunc(value)");
            });
            e.Property(x => x.Value).HasPrecision(12, 3);
            e.Property(x => x.AdditionalWeight).HasPrecision(12, 3);
            e.Property(x => x.TimeSpent).HasPrecision(12, 3);
            e.Property(x => x.Rir).HasPrecision(4, 1);
            e.HasIndex(x => new { x.WorkoutSetId, x.Position }).IsUnique();
            e.HasOne(x => x.WorkoutSet).WithMany(x => x.SetExercises)
                .HasForeignKey(x => x.WorkoutSetId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.BodyWeightMeasurement).WithMany(x => x.WorkoutSetExercises)
                .HasForeignKey(x => x.BodyWeightMeasurementId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
