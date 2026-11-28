using Telegram.Bot;
using Telegram.Bot.Exceptions;
namespace LeoBot.Sharing;

public sealed class TelegramConnectionService(ITelegramBotClient bot,TelegramSharingStore store)
{
    public async Task QueueAsync(long chat,long update,long recipient,string title,string? username,bool active,string? language,CancellationToken ct)
    {
        var raw=language?.Split('-', '_')[0].ToLowerInvariant();
        var locale=raw=="no"?"nb":LeoBot.Localization.LanguagePicker.IsSupported(raw)?raw!:"en";
        await using var q=store.Source.CreateCommand("""
            INSERT INTO telegram_connection_notifications(chat_id,update_id,recipient_id,title,chat_username,active,locale)
            VALUES(@chat,@update,@recipient,@title,@username,@active,
              COALESCE((SELECT l.code FROM telegram_user_preferences p JOIN languages l ON l.id=p.language_id WHERE p.telegram_id=@recipient),@locale))
            ON CONFLICT(chat_id,update_id) DO NOTHING
            """);
        q.Parameters.AddWithValue("chat",chat);q.Parameters.AddWithValue("update",update);q.Parameters.AddWithValue("recipient",recipient);
        q.Parameters.AddWithValue("title",title);q.Parameters.AddWithValue("username",(object?)username??DBNull.Value);
        q.Parameters.AddWithValue("active",active);q.Parameters.AddWithValue("locale",locale);
        await q.ExecuteNonQueryAsync(ct);
    }
    public async Task<bool> NotifyNextAsync(CancellationToken ct)
    {
        await using var connection=await store.Source.OpenConnectionAsync(ct);
        await using var transaction=await connection.BeginTransactionAsync(ct);
        long chat,update,recipient;string title,locale;string? username;bool active;
        await using(var q=new Npgsql.NpgsqlCommand("SELECT chat_id,update_id,recipient_id,title,chat_username,locale,active FROM telegram_connection_notifications WHERE delivered_at IS NULL AND attempts<8 AND next_attempt_at<=now() ORDER BY next_attempt_at LIMIT 1 FOR UPDATE SKIP LOCKED",connection,transaction))
        await using(var r=await q.ExecuteReaderAsync(ct))
        {
            if(!await r.ReadAsync(ct))return false;
            chat=r.GetInt64(0);update=r.GetInt64(1);recipient=r.GetInt64(2);title=r.GetString(3);
            username=r.IsDBNull(4)?null:r.GetString(4);locale=r.GetString(5);active=r.GetBoolean(6);
        }
        var sent=false;var permanent=false;var delay=30;
        try { await bot.SendMessage(recipient,Text(title,chat,username,locale,active),cancellationToken:ct);sent=true; }
        catch(ApiRequestException e) {permanent=e.ErrorCode is 400 or 403;delay=Math.Max(5,e.Parameters?.RetryAfter??30);}
        catch(OperationCanceledException) when(ct.IsCancellationRequested) { throw; }
        catch(Exception) { /* Bounded retry; never persist raw transport errors. */ }
        await using(var done=new Npgsql.NpgsqlCommand("""
            UPDATE telegram_connection_notifications SET attempts=CASE WHEN @permanent THEN 8 ELSE attempts+1 END,
              delivered_at=CASE WHEN @sent THEN now() ELSE NULL END,next_attempt_at=now()+make_interval(secs=>@delay)
              WHERE chat_id=@chat AND update_id=@update
            """,connection,transaction))
        {
            done.Parameters.AddWithValue("permanent",permanent);done.Parameters.AddWithValue("sent",sent);done.Parameters.AddWithValue("delay",(double)delay);
            done.Parameters.AddWithValue("chat",chat);done.Parameters.AddWithValue("update",update);await done.ExecuteNonQueryAsync(ct);
        }
        await transaction.CommitAsync(ct);return true;
    }
    public static string Text(string title,long chat,string? username,string locale,bool active)
    {
        var copy=locale switch {
            "uk"=>("Чат підключено", "Приватний чат — публічного @ немає", "Відкрийте Профіль → Telegram, щоб увімкнути публікацію.", "Боту потрібні права адміністратора та дозвіл публікувати повідомлення."),
            "nb"=>("Chat tilkoblet", "Privat chat — ingen offentlig @", "Åpne Profil → Telegram for å aktivere deling.", "Boten trenger administratorrettigheter og tillatelse til å publisere."),
            "de"=>("Chat verbunden", "Privater Chat — kein öffentliches @", "Öffne Profil → Telegram, um die Freigabe zu aktivieren.", "Der Bot benötigt Administrator- und Postingrechte."),
            "pl"=>("Czat połączony", "Prywatny czat — brak publicznego @", "Otwórz Profil → Telegram, aby włączyć udostępnianie.", "Bot potrzebuje uprawnień administratora i publikowania."),
            _=>("Chat connected", "Private chat — no public @", "Open Profile → Telegram to enable workout sharing.", "The bot needs administrator and posting permission.")
        };
        return $"{copy.Item1}: {title}\nID: {chat}\n{(string.IsNullOrEmpty(username)?copy.Item2:"@"+username)}\n\n{(active?copy.Item3:copy.Item4)}\n/manage {chat}";
    }
}
