#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Access;

public class Role
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ICollection<UserRole> Users { get; set; } = new List<UserRole>();
    public ICollection<RolePermission> Permissions { get; set; } = new List<RolePermission>();
}
