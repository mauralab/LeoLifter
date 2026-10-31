using LeoDatabase.Models.Access;
using LeoDatabase.Models.Personal;
using LeoDatabase.Models.Users;
using LeoDatabase.Models.Workout;
using TrainingProgram = LeoDatabase.Models.Workout.Program;
using WorkoutEntity = LeoDatabase.Models.Workout.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoDatabase.Context.Configurations;

internal static class ProgramConfiguration
{
    public static void Configure(ModelBuilder model)
    {
        model.Entity<Exercise>(e =>
        {
            e.ToTable("exercises", t => t.HasCheckConstraint("exercise_name_not_empty",
                "name = btrim(name) AND name <> ''"));
            e.Property(x => x.IncludesOwnWeight).HasDefaultValue(false);
            e.Property(x => x.IncludesAdditionalWeight).HasDefaultValue(false);
        });
        model.Entity<TrainingProgram>(e =>
        {
            e.ToTable("programs", t => t.HasCheckConstraint("program_name_not_empty", "btrim(name) <> ''"));
            e.Property(x => x.IsPublic).HasDefaultValue(false);
            e.HasOne(x => x.Author).WithMany(x => x.AuthoredPrograms)
                .HasForeignKey(x => x.AuthorId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<ProgramCycle>(e =>
        {
            e.ToTable("program_cycles", t =>
            {
                t.HasCheckConstraint("program_cycle_position_check", "position >= 1");
                t.HasCheckConstraint("program_cycle_repeat_check", "repeat_count >= 1");
                t.HasCheckConstraint("program_cycle_name_check", "btrim(name) <> ''");
                t.HasCheckConstraint("program_cycle_parent_check", "parent_cycle_id IS NULL OR parent_cycle_id <> id");
            });
            e.Property(x => x.RepeatCount).HasDefaultValue(1);
            e.HasAlternateKey(x => new { x.Id, x.ProgramId });
            e.HasOne(x => x.Program).WithMany(x => x.Cycles)
                .HasForeignKey(x => x.ProgramId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ParentCycle).WithMany(x => x.ChildCycles)
                .HasForeignKey(x => new { x.ParentCycleId, x.ProgramId })
                .HasPrincipalKey(x => new { x.Id, x.ProgramId }).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.ProgramId, x.Position }).IsUnique()
                .HasFilter("parent_cycle_id IS NULL").HasDatabaseName("uq_program_cycles_root_position");
            e.HasIndex(x => new { x.ParentCycleId, x.Position }).IsUnique()
                .HasFilter("parent_cycle_id IS NOT NULL").HasDatabaseName("uq_program_cycles_child_position");
        });
        model.Entity<ProgramDay>(e =>
        {
            e.ToTable("program_days", t => t.HasCheckConstraint("program_day_index_check", "day_index >= 1"));
            e.HasIndex(x => new { x.ProgramCycleId, x.DayIndex }).IsUnique();
            e.HasOne(x => x.ProgramCycle).WithMany(x => x.Days)
                .HasForeignKey(x => x.ProgramCycleId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<ProgramDayGroup>(e =>
        {
            e.ToTable("program_day_groups", t =>
            {
                t.HasCheckConstraint("program_group_position_check", "position >= 1");
                t.HasCheckConstraint("program_group_repeat_check", "repeat_count >= 1");
            });
            e.Property(x => x.RepeatCount).HasDefaultValue(1);
            e.HasIndex(x => new { x.ProgramDayId, x.Position }).IsUnique();
            e.HasOne(x => x.ProgramDay).WithMany(x => x.Groups)
                .HasForeignKey(x => x.ProgramDayId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<ProgramDaySet>(e =>
        {
            e.ToTable("program_day_sets", t => t.HasCheckConstraint("program_day_set_position_check", "position >= 1"));
            e.HasIndex(x => new { x.ProgramGroupId, x.Position }).IsUnique();
            e.HasOne(x => x.ProgramGroup).WithMany(x => x.Sets)
                .HasForeignKey(x => x.ProgramGroupId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Exercise).WithMany(x => x.ProgramDaySets)
                .HasForeignKey(x => x.ExerciseId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<ProgramSetExercise>(e =>
        {
            e.ToTable("program_set_exercises", t =>
            {
                t.HasCheckConstraint("program_set_exercise_position_check", "position >= 1");
                t.HasCheckConstraint("program_set_reps_check",
                    "(target_reps_min IS NULL AND target_reps_max IS NULL) OR " +
                    "(target_reps_min IS NOT NULL AND target_reps_max IS NOT NULL AND target_reps_min >= 1 AND target_reps_max >= target_reps_min)");
                t.HasCheckConstraint("program_set_value_check",
                    "(value_min IS NULL AND value_max IS NULL AND value_unit IS NULL) OR " +
                    "(value_min IS NOT NULL AND value_max IS NOT NULL AND value_unit IS NOT NULL AND value_min >= 0 AND value_max >= value_min)");
            });
            e.Property(x => x.ValueMin).HasPrecision(12, 3);
            e.Property(x => x.ValueMax).HasPrecision(12, 3);
            e.HasIndex(x => new { x.ProgramDaySetId, x.Position }).IsUnique();
            e.HasOne(x => x.ProgramDaySet).WithMany(x => x.SetExercises)
                .HasForeignKey(x => x.ProgramDaySetId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
