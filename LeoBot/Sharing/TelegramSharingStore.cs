using Microsoft.Extensions.Configuration;
using Npgsql;
namespace LeoBot.Sharing;

public sealed class TelegramSharingStore : IDisposable
{
    public NpgsqlDataSource Source { get; }
    public TelegramSharingStore(IConfiguration config)
    {
        var connection = config.GetConnectionString("LeoDatabase") ?? config["LEODATABASE_CONNECTION_STRING"];
        if (string.IsNullOrWhiteSpace(connection)) throw new InvalidOperationException("Configure ConnectionStrings__LeoDatabase for workout sharing.");
        Source = NpgsqlDataSource.Create(connection);
    }
    public async Task RegisterAsync(long chatId, string title, string type, long actor, bool active, bool admin, long updateId, string? botUsername, CancellationToken ct)
    {
        await using var command = Source.CreateCommand("""
            INSERT INTO telegram_chats(chat_id,title,chat_type,added_by_telegram_id,active,bot_is_admin,last_update_id,bot_username)
            VALUES(@chat,@title,@type,@actor,@active,@admin,@update,@username)
            ON CONFLICT(chat_id) DO UPDATE SET title=excluded.title,chat_type=excluded.chat_type,active=excluded.active,
              bot_is_admin=excluded.bot_is_admin,bot_username=excluded.bot_username,last_update_id=excluded.last_update_id,updated_at=now()
            WHERE telegram_chats.last_update_id < excluded.last_update_id
            """);
        command.Parameters.AddWithValue("chat",chatId); command.Parameters.AddWithValue("title",title);
        command.Parameters.AddWithValue("type",type); command.Parameters.AddWithValue("actor",actor);
        command.Parameters.AddWithValue("active",active); command.Parameters.AddWithValue("admin",admin); command.Parameters.AddWithValue("update",updateId);
        command.Parameters.AddWithValue("username",(object?)botUsername??DBNull.Value);
        await command.ExecuteNonQueryAsync(ct);
    }
    public async Task ManagerAsync(long chatId,long userId,bool admin,CancellationToken ct)
    {
        await using var command=Source.CreateCommand("""
            INSERT INTO telegram_chat_managers(chat_id,telegram_id,is_admin) VALUES(@chat,@user,@admin)
            ON CONFLICT(chat_id,telegram_id) DO UPDATE SET is_admin=excluded.is_admin,verified_at=now()
            """);
        command.Parameters.AddWithValue("chat",chatId); command.Parameters.AddWithValue("user",userId); command.Parameters.AddWithValue("admin",admin);
        await command.ExecuteNonQueryAsync(ct);
    }
    public void Dispose()=>Source.Dispose();
}
