using LeoDatabase.Models.Access;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class UserManager
{
    public async Task<List<Role>> ListRolesAsync(long userId, CancellationToken cancellationToken = default)
    {
        await RequireUserAsync(userId, cancellationToken);
        return await database.UserRoles.AsNoTracking().Where(x => x.UserId == userId)
            .OrderBy(x => x.RoleId).Select(x => x.Role).ToListAsync(cancellationToken);
    }

    public async Task AssignRoleAsync(long userId, long roleId, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(roleId);
        await RequireUserAsync(userId, cancellationToken);
        if (!await database.Roles.AnyAsync(x => x.Id == roleId, cancellationToken))
            throw new KeyNotFoundException("Role was not found.");
        if (await database.UserRoles.AnyAsync(x => x.UserId == userId && x.RoleId == roleId, cancellationToken)) return;
        database.UserRoles.Add(new UserRole { UserId = userId, RoleId = roleId });
        await database.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Replaces all role assignments in one save.</summary>
    public async Task SetRolesAsync(long userId, IReadOnlyCollection<long> roleIds, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(roleIds);
        if (roleIds.Any(x => x <= 0)) throw new ArgumentOutOfRangeException(nameof(roleIds));
        await RequireUserAsync(userId, cancellationToken);
        var ids = roleIds.Distinct().ToArray();
        if (await database.Roles.CountAsync(x => ids.Contains(x.Id), cancellationToken) != ids.Length)
            throw new KeyNotFoundException("One or more roles were not found.");
        var existing = await database.UserRoles.Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        database.UserRoles.RemoveRange(existing.Where(x => !ids.Contains(x.RoleId)));
        foreach (var id in ids.Except(existing.Select(x => x.RoleId)))
            database.UserRoles.Add(new UserRole { UserId = userId, RoleId = id });
        await database.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> RemoveRoleAsync(long userId, long roleId, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(roleId);
        await RequireUserAsync(userId, cancellationToken);
        var role = await database.UserRoles.SingleOrDefaultAsync(x => x.UserId == userId && x.RoleId == roleId, cancellationToken);
        if (role is null) return false;
        database.UserRoles.Remove(role);
        await database.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<List<UserPermission>> ListPermissionOverridesAsync(long userId, CancellationToken cancellationToken = default)
    {
        await RequireUserAsync(userId, cancellationToken);
        return await database.UserPermissions.AsNoTracking().Where(x => x.UserId == userId)
            .OrderBy(x => x.PermissionId).ToListAsync(cancellationToken);
    }

    /// <summary>Creates or updates an explicit grant (true) or deny (false).</summary>
    public async Task<UserPermission> SetPermissionOverrideAsync(
        long userId, long permissionId, bool granted, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(permissionId);
        await RequireUserAsync(userId, cancellationToken);
        if (!await database.Permissions.AnyAsync(x => x.Id == permissionId, cancellationToken))
            throw new KeyNotFoundException("Permission was not found.");
        var permission = await database.UserPermissions.SingleOrDefaultAsync(
            x => x.UserId == userId && x.PermissionId == permissionId, cancellationToken);
        if (permission is null)
        {
            permission = new UserPermission { UserId = userId, PermissionId = permissionId };
            database.UserPermissions.Add(permission);
        }
        permission.Granted = granted;
        await database.SaveChangesAsync(cancellationToken);
        return permission;
    }

    public async Task<bool> RemovePermissionOverrideAsync(
        long userId, long permissionId, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(permissionId);
        await RequireUserAsync(userId, cancellationToken);
        var permission = await database.UserPermissions.SingleOrDefaultAsync(
            x => x.UserId == userId && x.PermissionId == permissionId, cancellationToken);
        if (permission is null) return false;
        database.UserPermissions.Remove(permission);
        await database.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> HasPermissionAsync(long userId, string permissionName, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(permissionName);
        permissionName = permissionName.Trim();
        await RequireUserAsync(userId, cancellationToken);
        var explicitGrant = await database.UserPermissions.AsNoTracking()
            .Where(x => x.UserId == userId && x.Permission.Name == permissionName)
            .Select(x => (bool?)x.Granted).SingleOrDefaultAsync(cancellationToken);
        if (explicitGrant.HasValue) return explicitGrant.Value;
        return await database.UserRoles.AsNoTracking().AnyAsync(
            x => x.UserId == userId && x.Role.Permissions.Any(p => p.Permission.Name == permissionName), cancellationToken);
    }
}
