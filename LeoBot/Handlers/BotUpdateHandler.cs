using LeoBot.Messages;
using LeoBot.Authentication;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;

namespace LeoBot.Handlers;

public sealed class BotUpdateHandler(ITelegramBotClient bot, LandingMessageFactory messages, PasswordApprovalService approvals)
{
    public async Task HandleAsync(Update update, string? botUsername, CancellationToken ct)
    {
        if (update.CallbackQuery is { } callback)
        {
            if (callback.Data?.StartsWith("login:", StringComparison.Ordinal) == true)
            {
                await approvals.HandleAsync(callback, ct);
                return;
            }
            // Answer callbacks even when no action exists, so Telegram clears its spinner.
            var placeholder = callback.Data == LandingMessageFactory.AuthPlaceholderCallback &&
                callback.Message?.Chat.Type == ChatType.Private && callback.Message.Chat.Id == callback.From.Id;
            await bot.AnswerCallbackQuery(callback.Id,
                text: placeholder ? LandingMessageFactory.GetCopy(callback.From.LanguageCode).ComingSoon : null,
                showAlert: placeholder, cancellationToken: ct);
            return;
        }
        if (update.Message is not { Chat.Type: ChatType.Private, From: { IsBot: false } sender, Text: { } text } message)
            return;
        var command = text.Split((char[]?)null, 2, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        if (command is null) return;
        var parts = command.Split('@', 2);
        if (parts.Length == 2 && !string.Equals(parts[1], botUsername, StringComparison.OrdinalIgnoreCase)) return;
        if (parts[0] is not ("/start" or "/help")) return;
        // Deep-link payloads are deliberately not treated as authentication yet.
        var landing = messages.Create(sender.LanguageCode, sender.Id, sender.Username, message.Chat.Id);
        await bot.SendMessage(message.Chat.Id, landing.Text, parseMode: ParseMode.Html,
            replyMarkup: landing.Keyboard, linkPreviewOptions: new() { IsDisabled = true }, cancellationToken: ct);
    }
}
