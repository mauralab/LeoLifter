using LeoDatabase.Context;
using LeoDatabase.Models.Access;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

/// <summary>Administrative role and permission operations; callers must authorize access.</summary>
public sealed class AccessManager(LeoDbContext database)
{

    public Task<Role?> GetRoleAsync(long id, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(id);
        return database.Roles.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<List<Role>> ListRolesAsync(
        int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        return database.Roles.AsNoTracking().OrderBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public async Task<Role> AddRoleAsync(string name, CancellationToken cancellationToken = default)
    {
        name = ValidateName(name);
        if (await database.Roles.AnyAsync(x => x.Name == name, cancellationToken))
            throw new InvalidOperationException("A role with this name already exists.");
        var entity = new Role { Name = name };
        database.Roles.Add(entity);
        await database.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<Role> EditRoleAsync(long id, string name, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(id);
        name = ValidateName(name);
        var entity = await database.Roles.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Role was not found.");
        if (await database.Roles.AnyAsync(x => x.Name == name && x.Id != id, cancellationToken))
            throw new InvalidOperationException("A role with this name already exists.");
        entity.Name = name;
        await database.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task DeleteRoleAsync(long id, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(id);
        var entity = await database.Roles.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Role was not found.");
        database.Roles.Remove(entity);
        await database.SaveChangesAsync(cancellationToken);
    }

    public Task<Permission?> GetPermissionAsync(long id, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(id);
        return database.Permissions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<List<Permission>> ListPermissionsAsync(
        int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        return database.Permissions.AsNoTracking().OrderBy(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
    }

    public async Task<Permission> AddPermissionAsync(string name, CancellationToken cancellationToken = default)
    {
        name = ValidateName(name);
        if (await database.Permissions.AnyAsync(x => x.Name == name, cancellationToken))
            throw new InvalidOperationException("A permission with this name already exists.");
        var entity = new Permission { Name = name };
        database.Permissions.Add(entity);
        await database.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<Permission> EditPermissionAsync(long id, string name, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(id);
        name = ValidateName(name);
        var entity = await database.Permissions.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Permission was not found.");
        if (await database.Permissions.AnyAsync(x => x.Name == name && x.Id != id, cancellationToken))
            throw new InvalidOperationException("A permission with this name already exists.");
        entity.Name = name;
        await database.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task DeletePermissionAsync(long id, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(id);
        var entity = await database.Permissions.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Permission was not found.");
        database.Permissions.Remove(entity);
        await database.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<Permission>> ListRolePermissionsAsync(long roleId, CancellationToken cancellationToken = default)
    {
        await RequireRoleAsync(roleId, cancellationToken);
        return await database.RolePermissions.AsNoTracking().Where(x => x.RoleId == roleId)
            .OrderBy(x => x.PermissionId).Select(x => x.Permission).ToListAsync(cancellationToken);
    }

    public async Task AssignRolePermissionAsync(long roleId, long permissionId, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(permissionId);
        await RequireRoleAsync(roleId, cancellationToken);
        if (!await database.Permissions.AnyAsync(x => x.Id == permissionId, cancellationToken))
            throw new KeyNotFoundException("Permission was not found.");
        if (await database.RolePermissions.AnyAsync(x => x.RoleId == roleId && x.PermissionId == permissionId, cancellationToken)) return;
        database.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = permissionId });
        await database.SaveChangesAsync(cancellationToken);
    }

    public async Task SetRolePermissionsAsync(
        long roleId, IReadOnlyCollection<long> permissionIds, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(permissionIds);
        if (permissionIds.Any(x => x <= 0)) throw new ArgumentOutOfRangeException(nameof(permissionIds));
        await RequireRoleAsync(roleId, cancellationToken);
        var ids = permissionIds.Distinct().ToArray();
        if (await database.Permissions.CountAsync(x => ids.Contains(x.Id), cancellationToken) != ids.Length)
            throw new KeyNotFoundException("One or more permissions were not found.");
        var existing = await database.RolePermissions.Where(x => x.RoleId == roleId).ToListAsync(cancellationToken);
        database.RolePermissions.RemoveRange(existing.Where(x => !ids.Contains(x.PermissionId)));
        foreach (var id in ids.Except(existing.Select(x => x.PermissionId)))
            database.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = id });
        await database.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> RemoveRolePermissionAsync(
        long roleId, long permissionId, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(permissionId);
        await RequireRoleAsync(roleId, cancellationToken);
        var link = await database.RolePermissions.SingleOrDefaultAsync(
            x => x.RoleId == roleId && x.PermissionId == permissionId, cancellationToken);
        if (link is null) return false;
        database.RolePermissions.Remove(link);
        await database.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task RequireRoleAsync(long roleId, CancellationToken cancellationToken)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(roleId);
        if (!await database.Roles.AnyAsync(x => x.Id == roleId, cancellationToken))
            throw new KeyNotFoundException("Role was not found.");
    }

    private static string ValidateName(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        return name.Trim();
    }

    private static void ValidatePage(int skip, int take)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(skip);
        if (take is < 1 or > 100)
            throw new ArgumentOutOfRangeException(nameof(take), "Page size must be between 1 and 100.");
    }
}
