using Telegram.Bot.Exceptions;

namespace LeoBot.Hosting;

public static class TelegramErrorDiagnostics
{
    // Match known descriptions, but never return exception text: it can contain a signed URL.
    public static string Describe(Exception error)
    {
        if (error is not ApiRequestException api)
            return "Check network access. Request details have been omitted.";
        var message = api.Message;
        if (message.Contains("URL", StringComparison.OrdinalIgnoreCase) ||
            message.Contains("BUTTON_URL_INVALID", StringComparison.OrdinalIgnoreCase))
            return "Telegram rejected a button URL. Use a public HTTPS auth address, or http://127.0.0.1:3000/en/auth on the development PC; localhost is not supported.";
        if (message.Contains("parse entities", StringComparison.OrdinalIgnoreCase))
            return "Telegram rejected the message formatting. Check the landing message HTML.";
        return api.ErrorCode switch
        {
            400 => "Telegram rejected the request. Check message formatting and inline keyboard configuration.",
            401 => "Telegram rejected the bot token. Check Telegram__BotToken.",
            403 => "Telegram denied access to this chat; the user may have blocked the bot.",
            409 => "Another polling instance or webhook is using this bot. Run only one receiver.",
            429 => "Telegram rate limit reached. Allow the receiver to retry.",
            _ => "Telegram API request failed. Request details have been omitted."
        };
    }
}
