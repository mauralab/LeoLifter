#nullable enable

using System;
using System.Collections.Generic;

namespace LeoDatabase.Models.Users;

public class UserTelegram
{
    public long UserId { get; set; }
    public long ChatId { get; set; }
    public long TelegramId { get; set; }
    public User User { get; set; } = null!;
}
