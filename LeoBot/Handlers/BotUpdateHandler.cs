using LeoBot.Sharing;
using LeoBot.Localization;
using LeoBot.Messages;
using LeoBot.Authentication;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;

namespace LeoBot.Handlers;

public sealed class BotUpdateHandler(ITelegramBotClient bot, LandingMessageFactory messages, PasswordApprovalService approvals, ITelegramLanguageStore languages, TelegramGroupService groups)
{
    public async Task HandleAsync(Update update, string? botUsername, CancellationToken ct)
    {
        if (await groups.HandleAsync(update, botUsername, ct)) return;
        if (update.CallbackQuery is { } callback)
        {
            if (callback.Data?.StartsWith("login:", StringComparison.Ordinal) == true)
            {
                await approvals.HandleAsync(callback, ct);
                return;
            }
            var privateIdentity = callback.Message?.Chat.Type == ChatType.Private &&
                callback.Message.Chat.Id == callback.From.Id && !callback.From.IsBot;
            if (callback.Data == LanguagePicker.ChangeCallback || callback.Data?.StartsWith(LanguagePicker.Prefix, StringComparison.Ordinal) == true)
            {
                if (!privateIdentity)
                {
                    await bot.AnswerCallbackQuery(callback.Id, cancellationToken: ct);
                    return;
                }
                LandingMessage next;
                if (callback.Data == LanguagePicker.ChangeCallback) next = LanguagePicker.Create();
                else
                {
                    var code = callback.Data![LanguagePicker.Prefix.Length..];
                    if (!LanguagePicker.IsSupported(code))
                    {
                        await bot.AnswerCallbackQuery(callback.Id, cancellationToken: ct);
                        return;
                    }
                    await languages.SetAsync(callback.From.Id, code, ct);
                    next = await messages.CreateAsync(code, callback.From.Id, callback.From.Username, callback.Message!.Chat.Id, ct);
                }
                await bot.AnswerCallbackQuery(callback.Id, cancellationToken: ct);
                await bot.EditMessageText(callback.Message!.Chat.Id, callback.Message.Id, next.Text,
                    parseMode: ParseMode.Html, replyMarkup: next.Keyboard,
                    linkPreviewOptions: new() { IsDisabled = true }, cancellationToken: ct);
                return;
            }
            // Answer callbacks even when no action exists, so Telegram clears its spinner.
            var placeholder = callback.Data == LandingMessageFactory.AuthPlaceholderCallback &&
                callback.Message?.Chat.Type == ChatType.Private && callback.Message.Chat.Id == callback.From.Id;
            await bot.AnswerCallbackQuery(callback.Id,
                text: placeholder ? LandingMessageFactory.GetCopy(await languages.GetAsync(callback.From.Id, ct)).ComingSoon : null,
                showAlert: placeholder, cancellationToken: ct);
            return;
        }
        if (update.Message is not { Chat.Type: ChatType.Private, From: { IsBot: false } sender, Text: { } text } message)
            return;
        var command = text.Split((char[]?)null, 2, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        if (command is null) return;
        var parts = command.Split('@', 2);
        if (parts.Length == 2 && !string.Equals(parts[1], botUsername, StringComparison.OrdinalIgnoreCase)) return;
        if (parts[0] is not ("/start" or "/help" or "/language")) return;
        // Deep-link payloads are deliberately not treated as authentication yet.
        var language = await languages.GetAsync(sender.Id, ct);
        var landing = parts[0] == "/language" || !LanguagePicker.IsSupported(language)
            ? LanguagePicker.Create()
            : await messages.CreateAsync(language, sender.Id, sender.Username, message.Chat.Id, ct);
        await bot.SendMessage(message.Chat.Id, landing.Text, parseMode: ParseMode.Html,
            replyMarkup: landing.Keyboard, linkPreviewOptions: new() { IsDisabled = true }, cancellationToken: ct);
    }
}
