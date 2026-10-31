using LeoDatabase.Models.Access;
using LeoDatabase.Models.Personal;
using LeoDatabase.Models.Users;
using LeoDatabase.Models.Workout;
using TrainingProgram = LeoDatabase.Models.Workout.Program;
using WorkoutEntity = LeoDatabase.Models.Workout.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoDatabase.Context.Configurations;

internal static class UserConfiguration
{
    public static void Configure(ModelBuilder model)
    {
        model.Entity<User>(e =>
        {
            e.ToTable("users");
            e.Property(x => x.Nickname).HasMaxLength(100);
        });
        model.Entity<UserTelegram>(e =>
        {
            e.ToTable("user_telegram");
            e.HasKey(x => x.UserId);
            e.HasIndex(x => x.TelegramId).IsUnique();
            e.HasOne(x => x.User).WithOne(x => x.Telegram)
                .HasForeignKey<UserTelegram>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<UserPassword>(e =>
        {
            e.ToTable("user_passwords");
            e.HasKey(x => x.UserId);
            e.HasOne(x => x.User).WithOne(x => x.Password)
                .HasForeignKey<UserPassword>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<UserSession>(e =>
        {
            e.ToTable("user_sessions", t =>
            {
                t.HasCheckConstraint("session_expiration_check", "expires_at > created_at");
                t.HasCheckConstraint("session_revocation_check",
                    "revoked_at IS NULL OR revoked_at >= created_at");
            });
            e.HasIndex(x => x.RefreshTokenHash).IsUnique();
            e.HasOne(x => x.User).WithMany(x => x.Sessions)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<UserProfile>(e =>
        {
            e.ToTable("user_profiles", t =>
            {
                t.HasCheckConstraint("profile_height_check", "height IS NULL OR height > 0");
                t.HasCheckConstraint("profile_height_unit_check",
                    "(height IS NULL AND height_unit IS NULL) OR (height IS NOT NULL AND height_unit IS NOT NULL)");
            });
            e.HasKey(x => x.UserId);
            e.Property(x => x.Height).HasPrecision(7, 2);
            e.Property(x => x.Country).HasMaxLength(2);
            e.HasOne(x => x.User).WithOne(x => x.Profile)
                .HasForeignKey<UserProfile>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<UserSettings>(e =>
        {
            e.ToTable("user_settings");
            e.HasKey(x => x.UserId);
            e.Property(x => x.Language).HasDefaultValue("en");
            e.Property(x => x.WeightMeasureUnit).HasDefaultValue(WeightUnit.Kg);
            e.Property(x => x.LengthMeasureUnit).HasDefaultValue(LengthUnit.Cm);
            e.HasOne(x => x.User).WithOne(x => x.Settings)
                .HasForeignKey<UserSettings>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<WeightMeasurement>(e =>
        {
            e.ToTable("weight_measurements", t =>
                t.HasCheckConstraint("weight_measurement_positive_check", "weight > 0"));
            e.Property(x => x.Weight).HasPrecision(8, 3);
            e.HasIndex(x => new { x.UserId, x.MeasuredAt }).IsDescending(false, true);
            e.HasOne(x => x.User).WithMany(x => x.WeightMeasurements)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
