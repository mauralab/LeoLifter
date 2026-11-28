namespace LeoDatabase.Models.Telegram;

public class TelegramChat
{
    public long ChatId { get; set; }
    public string Title { get; set; } = "";
    public string? BotUsername { get; set; }
    public string ChatType { get; set; } = "group";
    public long AddedByTelegramId { get; set; }
    public bool BotIsAdmin { get; set; }
    public bool Active { get; set; }
    public string Locale { get; set; } = "en";
    public long LastUpdateId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
public class TelegramChatManager
{
    public long ChatId { get; set; }
    public long TelegramId { get; set; }
    public bool IsAdmin { get; set; }
    public DateTime VerifiedAt { get; set; }
}
public class TelegramWorkoutPreference
{
    public long UserId { get; set; }
    public bool PrivateEnabled { get; set; } = true;
    public DateTime UpdatedAt { get; set; }
}
public class TelegramWorkoutSubscription
{
    public long ChatId { get; set; }
    public long UserId { get; set; }
    public long? InvitedByUserId { get; set; }
    public string Status { get; set; } = "pending";
    public bool Enabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
public class WorkoutTelegramMessage
{
    public long WorkoutId { get; set; }
    public long ChatId { get; set; }
    public bool DeleteRequested { get; set; }
    public int DeleteAttempts { get; set; }
    public DateTime DeleteNextAttemptAt { get; set; }
    public Guid DesiredRevision { get; set; }
    public Guid? DeliveredRevision { get; set; }
    public long? MessageId { get; set; }
    public int Attempts { get; set; }
    public DateTime NextAttemptAt { get; set; }
    public Guid? LeaseId { get; set; }
    public DateTime? LeaseUntil { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? LastError { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class TelegramConnectionNotification
{
    public long ChatId { get; set; }
    public long UpdateId { get; set; }
    public long RecipientId { get; set; }
    public string Title { get; set; } = "";
    public string? ChatUsername { get; set; }
    public string Locale { get; set; } = "en";
    public bool Active { get; set; }
    public int Attempts { get; set; }
    public DateTime NextAttemptAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
}
