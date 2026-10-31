#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Users;

public class UserPassword
{
    public long UserId { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public User User { get; set; } = null!;
}
