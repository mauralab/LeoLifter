#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Access;

public class Permission
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ICollection<RolePermission> Roles { get; set; } = new List<RolePermission>();
    public ICollection<UserPermission> Users { get; set; } = new List<UserPermission>();
}
