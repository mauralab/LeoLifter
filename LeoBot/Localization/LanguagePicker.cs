using LeoBot.Messages;
using Telegram.Bot.Types.ReplyMarkups;

namespace LeoBot.Localization;

public static class LanguagePicker
{
    public const string ChangeCallback = "language:choose";
    public const string Prefix = "language:set:";
    public static bool IsSupported(string? code) => code is "en" or "uk" or "nb" or "de" or "pl";
    public static string ChangeLabel(string? code) => code switch
    {
        "uk" => "🌐 Змінити мову", "nb" => "🌐 Endre språk", "de" => "🌐 Sprache ändern",
        "pl" => "🌐 Zmień język", _ => "🌐 Change language"
    };
    public static LandingMessage Create() => new(
        "🌐 Choose your language / Оберіть мову / Velg språk / Sprache wählen / Wybierz język",
        new InlineKeyboardMarkup(new[]
        {
            new[] { Button("🇬🇧 English", "en"), Button("🇺🇦 Українська", "uk") },
            new[] { Button("🇳🇴 Norsk bokmål", "nb"), Button("🇩🇪 Deutsch", "de") },
            new[] { Button("🇵🇱 Polski", "pl") }
        }));
    private static InlineKeyboardButton Button(string label, string code) => InlineKeyboardButton.WithCallbackData(label, Prefix + code);
}
