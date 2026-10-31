using LeoDatabase.Models.Access;
using LeoDatabase.Models.Personal;
using LeoDatabase.Models.Users;
using LeoDatabase.Models.Workout;
using TrainingProgram = LeoDatabase.Models.Workout.Program;
using WorkoutEntity = LeoDatabase.Models.Workout.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoDatabase.Context.Configurations;

internal static class AccessConfiguration
{
    public static void Configure(ModelBuilder model)
    {
        model.Entity<Role>(e =>
        {
            e.ToTable("roles", t => t.HasCheckConstraint("role_name_not_empty",
                "name = btrim(name) AND name <> ''"));
            e.HasIndex(x => x.Name).IsUnique();
        });
        model.Entity<Permission>(e =>
        {
            e.ToTable("permissions", t => t.HasCheckConstraint("permission_name_not_empty",
                "name = btrim(name) AND name <> ''"));
            e.HasIndex(x => x.Name).IsUnique();
        });
        model.Entity<UserRole>(e =>
        {
            e.ToTable("user_roles");
            e.HasKey(x => new { x.UserId, x.RoleId });
            e.HasOne(x => x.User).WithMany(x => x.Roles)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Role).WithMany(x => x.Users)
                .HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<RolePermission>(e =>
        {
            e.ToTable("role_permissions");
            e.HasKey(x => new { x.RoleId, x.PermissionId });
            e.HasOne(x => x.Role).WithMany(x => x.Permissions)
                .HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Permission).WithMany(x => x.Roles)
                .HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<UserPermission>(e =>
        {
            e.ToTable("user_permissions");
            e.HasKey(x => new { x.UserId, x.PermissionId });
            e.HasOne(x => x.User).WithMany(x => x.Permissions)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Permission).WithMany(x => x.Users)
                .HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
