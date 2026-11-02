using LeoBot.Messages;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;
using System.Text.RegularExpressions;

namespace LeoBot.Authentication;

public sealed class PasswordApprovalService(PasswordApprovalStore store, ITelegramBotClient bot)
{
    public async Task<bool> SendNextAsync(CancellationToken ct)
    {
        var request = await store.ClaimAsync(ct);
        if (request is null) return false;
        var message = PasswordApprovalMessages.Create(request);
        var sent = await bot.SendMessage(request.ChatId, message.Text, replyMarkup: message.Keyboard, cancellationToken: ct);
        await store.MarkSentAsync(request.Id, sent.Id, ct);
        return true;
    }
    public async Task HandleAsync(CallbackQuery callback, CancellationToken ct)
    {
        var copy = PasswordApprovalMessages.Get(callback.From.LanguageCode);
        var match = Regex.Match(callback.Data ?? "", "^login:([yn]):([a-f0-9]{32})$");
        var approved = match.Success && match.Groups[1].Value == "y";
        var changed = match.Success && !callback.From.IsBot && callback.Message is { Chat.Type: ChatType.Private } message &&
            await store.DecideAsync(match.Groups[2].Value, callback.From.Id, message.Chat.Id, message.Id, approved, ct);
        await bot.AnswerCallbackQuery(callback.Id, text: changed ? approved ? copy.Approved : copy.Denied : copy.Unavailable, showAlert: true, cancellationToken: ct);
        if (changed && callback.Message is { } sent)
            await bot.EditMessageText(sent.Chat.Id, sent.Id, approved ? copy.Approved : copy.Denied, replyMarkup: new InlineKeyboardMarkup(Array.Empty<InlineKeyboardButton[]>()), cancellationToken: ct);
    }
}
