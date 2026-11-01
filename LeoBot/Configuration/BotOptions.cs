namespace LeoBot.Configuration;

public sealed class BotOptions
{
    public const string SectionName = "Telegram";
    public string BotToken { get; set; } = "";
    public string WebAuthUrl { get; set; } = "#";
    public string AuthLinkSecret { get; set; } = "";

    public static bool IsValidToken(string value) =>
        !string.IsNullOrWhiteSpace(value) && System.Text.RegularExpressions.Regex.IsMatch(value, @"^\d+:[A-Za-z0-9_-]+$");

    public bool HasAuthUrl => WebAuthUrl != "#";
    public static bool IsValidAuthUrl(string value) => value == "#" ||
        (Uri.TryCreate(value, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttps || (uri.Scheme == Uri.UriSchemeHttp && uri.IsLoopback)) &&
         string.IsNullOrEmpty(uri.Query) && string.IsNullOrEmpty(uri.Fragment) &&
         !string.IsNullOrWhiteSpace(uri.Host) &&
         !uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) && string.IsNullOrEmpty(uri.UserInfo));
}
