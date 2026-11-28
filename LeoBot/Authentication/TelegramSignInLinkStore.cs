using Microsoft.Extensions.Configuration;
using Npgsql;
namespace LeoBot.Authentication;

public sealed class TelegramSignInLinkStore : IDisposable
{
    private readonly NpgsqlDataSource source;
    public TelegramSignInLinkStore(IConfiguration configuration)
    {
        var connection = configuration.GetConnectionString("LeoDatabase") ?? configuration["LEODATABASE_CONNECTION_STRING"];
        if (string.IsNullOrWhiteSpace(connection)) throw new InvalidOperationException("Configure ConnectionStrings__LeoDatabase for sign-in links.");
        source = NpgsqlDataSource.Create(connection);
    }
    public async Task CreateAsync(string codeHash, long telegramId, string username, long chatId, string locale, DateTimeOffset now, CancellationToken ct)
    {
        await using var command = source.CreateCommand("""
            INSERT INTO telegram_signin_links (code_hash, telegram_id, telegram_username, chat_id, locale, created_at, expires_at)
            VALUES (@hash, @id, @username, @chat, @locale, @now, @expires)
            """);
        command.Parameters.AddWithValue("hash", codeHash);
        command.Parameters.AddWithValue("id", telegramId);
        command.Parameters.AddWithValue("username", username);
        command.Parameters.AddWithValue("chat", chatId);
        command.Parameters.AddWithValue("locale", locale);
        command.Parameters.AddWithValue("now", now);
        command.Parameters.AddWithValue("expires", now.AddMinutes(5));
        await command.ExecuteNonQueryAsync(ct);
    }
    public void Dispose() => source.Dispose();
}
