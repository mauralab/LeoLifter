#nullable enable

using System;
using System.Collections.Generic;
using LeoDatabase.Models.Users;

namespace LeoDatabase.Models.Access;

public class UserPermission
{
    public long UserId { get; set; }
    public long PermissionId { get; set; }
    public bool Granted { get; set; }
    public User User { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
