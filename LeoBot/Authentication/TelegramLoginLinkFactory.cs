using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using LeoBot.Configuration;
using Microsoft.Extensions.Options;

namespace LeoBot.Authentication;

/// <summary>Only call with identity values supplied by Telegram's private-message update.</summary>
public sealed class TelegramLoginLinkFactory(IOptions<BotOptions> options, TimeProvider clock)
{
    public string Create(long telegramId, string? username, long chatId)
    {
        if (telegramId <= 0 || chatId != telegramId) throw new ArgumentException("A private Telegram identity is required.");
        username ??= "";
        if (!Regex.IsMatch(username, @"^[A-Za-z0-9_]{0,32}$")) throw new ArgumentException("Invalid Telegram username.");
        var config = options.Value;
        if (!config.HasAuthUrl || Encoding.UTF8.GetByteCount(config.AuthLinkSecret) < 32)
            throw new InvalidOperationException("Configure the web auth URL and shared link secret first.");
        var id = telegramId.ToString(CultureInfo.InvariantCulture);
        var chat = chatId.ToString(CultureInfo.InvariantCulture);
        var issued = clock.GetUtcNow().ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        var nonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        var canonical = string.Join('\n', "v1", id, username, chat, issued, nonce);
        var signature = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(config.AuthLinkSecret),
            Encoding.UTF8.GetBytes(canonical))).ToLowerInvariant();
        var query = new Dictionary<string, string>
        {
            ["tg_id"] = id, ["tg_username"] = username, ["chat_id"] = chat,
            ["iat"] = issued, ["nonce"] = nonce, ["sig"] = signature
        };
        return config.WebAuthUrl + "?" + string.Join('&', query.Select(pair => $"{pair.Key}={Uri.EscapeDataString(pair.Value)}"));
    }
}
