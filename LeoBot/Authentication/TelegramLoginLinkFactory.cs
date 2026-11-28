using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using LeoBot.Configuration;
using LeoBot.Localization;
using Microsoft.Extensions.Options;

namespace LeoBot.Authentication;

/// <summary>Only call with identity supplied by Telegram's private-message update.</summary>
public sealed class TelegramLoginLinkFactory(IOptions<BotOptions> options, TimeProvider clock, TelegramSignInLinkStore store)
{
    public async Task<string> CreateAsync(long telegramId, string? username, long chatId, string? languageCode = null, CancellationToken ct = default)
    {
        if (telegramId <= 0 || chatId != telegramId) throw new ArgumentException("A private Telegram identity is required.");
        username ??= "";
        if (!Regex.IsMatch(username, @"^[A-Za-z0-9_]{0,32}$")) throw new ArgumentException("Invalid Telegram username.");
        if (!options.Value.HasAuthUrl) throw new InvalidOperationException("Configure the web auth URL first.");
        var locale = LanguagePicker.IsSupported(languageCode) ? languageCode! : "en";
        var code = Guid.NewGuid().ToString("D");
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code)));
        await store.CreateAsync(hash, telegramId, username, chatId, locale, clock.GetUtcNow(), ct);
        var uri = new UriBuilder(options.Value.WebAuthUrl);
        var segments = uri.Path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length > 0 && LanguagePicker.IsSupported(segments[0])) segments[0] = locale;
        uri.Path = "/" + string.Join('/', segments) + "/" + code;
        return uri.Uri.AbsoluteUri;
    }
}
