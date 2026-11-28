using LeoDatabase.Models.Localization;
namespace LeoDatabase.Models.Telegram;

// Telegram identity exists before an application account is registered.
public class TelegramUserPreference
{
    public long TelegramId { get; set; }
    public long LanguageId { get; set; }
    public Language Language { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
