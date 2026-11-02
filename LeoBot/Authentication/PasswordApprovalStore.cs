using Microsoft.Extensions.Configuration;
using Npgsql;

namespace LeoBot.Authentication;

public sealed record PasswordApproval(string Id, long TelegramId, long ChatId, string Locale, string Device, DateTime CreatedAt);
public sealed class PasswordApprovalStore : IDisposable
{
    private readonly NpgsqlDataSource? source;
    public bool IsConfigured => source is not null;
    public PasswordApprovalStore(IConfiguration configuration)
    {
        var connection = configuration.GetConnectionString("LeoDatabase") ?? configuration["LEODATABASE_CONNECTION_STRING"];
        if (!string.IsNullOrWhiteSpace(connection)) source = NpgsqlDataSource.Create(connection);
    }
    public async Task<PasswordApproval?> ClaimAsync(CancellationToken ct)
    {
        if (source is null) return null;
        await using var command = source.CreateCommand("""
            WITH candidate AS (
              SELECT id FROM password_login_requests
              WHERE status = 'pending' AND expires_at > now() AND notified_at IS NULL
                AND send_attempts < 3 AND (last_send_attempt_at IS NULL OR last_send_attempt_at < now() - interval '30 seconds')
              ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
            )
            UPDATE password_login_requests r SET send_attempts = r.send_attempts + 1, last_send_attempt_at = now()
            FROM candidate c WHERE r.id = c.id
            RETURNING r.id, r.telegram_id, r.chat_id, r.locale, r.device, r.created_at
            """);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? new(reader.GetString(0), reader.GetInt64(1), reader.GetInt64(2), reader.GetString(3), reader.GetString(4), reader.GetDateTime(5)) : null;
    }
    public async Task MarkSentAsync(string id, int messageId, CancellationToken ct)
    {
        if (source is null) return;
        await using var command = source.CreateCommand("UPDATE password_login_requests SET notified_at = now(), message_id = @message WHERE id = @id");
        command.Parameters.AddWithValue("id", id); command.Parameters.AddWithValue("message", (long)messageId);
        await command.ExecuteNonQueryAsync(ct);
    }
    public async Task<bool> DecideAsync(string id, long senderId, long chatId, int messageId, bool approved, CancellationToken ct)
    {
        if (source is null || senderId != chatId) return false;
        await using var command = source.CreateCommand("""
            UPDATE password_login_requests SET status = @status, decided_at = now()
            WHERE id = @id AND telegram_id = @sender AND chat_id = @chat AND message_id = @message
              AND status = 'pending' AND expires_at > now()
            RETURNING id
            """);
        command.Parameters.AddWithValue("status", approved ? "approved" : "denied");
        command.Parameters.AddWithValue("id", id); command.Parameters.AddWithValue("sender", senderId);
        command.Parameters.AddWithValue("chat", chatId); command.Parameters.AddWithValue("message", (long)messageId);
        return await command.ExecuteScalarAsync(ct) is not null;
    }
    public void Dispose() => source?.Dispose();
}
