namespace LeoDatabase.Models.Telegram;

public class TelegramSignInLink
{
    public string CodeHash { get; set; } = string.Empty;
    public long TelegramId { get; set; }
    public long ChatId { get; set; }
    public string TelegramUsername { get; set; } = string.Empty;
    public string Locale { get; set; } = "en";
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? ConsumedAt { get; set; }
}
