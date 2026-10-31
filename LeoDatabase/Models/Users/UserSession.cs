#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Users;

public class UserSession
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string RefreshTokenHash { get; set; } = string.Empty;
    public string? Device { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public User User { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
