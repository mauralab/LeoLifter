using LeoDatabase.Models.Access;
using LeoDatabase.Models.Personal;
using LeoDatabase.Models.Users;
using LeoDatabase.Models.Workout;
using TrainingProgram = LeoDatabase.Models.Workout.Program;
using WorkoutEntity = LeoDatabase.Models.Workout.Workout;
using Microsoft.EntityFrameworkCore;
using LeoDatabase.Context.Configurations;
using Npgsql.NameTranslation;

namespace LeoDatabase.Context;

public sealed class LeoDbContext(DbContextOptions<LeoDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserTelegram> UserTelegramAccounts => Set<UserTelegram>();
    public DbSet<UserPassword> UserPasswords => Set<UserPassword>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<WeightMeasurement> WeightMeasurements => Set<WeightMeasurement>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserPermission> UserPermissions => Set<UserPermission>();
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<TrainingProgram> Programs => Set<TrainingProgram>();
    public DbSet<ProgramCycle> ProgramCycles => Set<ProgramCycle>();
    public DbSet<ProgramDay> ProgramDays => Set<ProgramDay>();
    public DbSet<ProgramDayGroup> ProgramDayGroups => Set<ProgramDayGroup>();
    public DbSet<ProgramDaySet> ProgramDaySets => Set<ProgramDaySet>();
    public DbSet<ProgramSetExercise> ProgramSetExercises => Set<ProgramSetExercise>();
    public DbSet<WorkoutEntity> Workouts => Set<WorkoutEntity>();
    public DbSet<WorkoutGroup> WorkoutGroups => Set<WorkoutGroup>();
    public DbSet<WorkoutSet> WorkoutSets => Set<WorkoutSet>();
    public DbSet<WorkoutSetExercise> WorkoutSetExercises => Set<WorkoutSetExercise>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        UserConfiguration.Configure(modelBuilder);
        AccessConfiguration.Configure(modelBuilder);
        ProgramConfiguration.Configure(modelBuilder);
        WorkoutConfiguration.Configure(modelBuilder);

        var translator = new NpgsqlSnakeCaseNameTranslator();
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(translator.TranslateMemberName(property.Name));
                if (property.Name is "CreatedAt" or "UpdatedAt")
                    property.SetDefaultValueSql("CURRENT_TIMESTAMP");
            }
        }
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        UpdateTimestamps();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void UpdateTimestamps()
    {
        ChangeTracker.DetectChanges();
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries()
                     .Where(e => e.State is EntityState.Added or EntityState.Modified))
        {
            if (entry.Metadata.FindProperty("CreatedAt") is not null)
            {
                var created = entry.Property("CreatedAt");
                if (entry.State == EntityState.Added)
                    created.CurrentValue = now;
                else
                    created.IsModified = false;
            }
            if (entry.Metadata.FindProperty("UpdatedAt") is not null)
                entry.Property("UpdatedAt").CurrentValue = now;
        }
    }
}
