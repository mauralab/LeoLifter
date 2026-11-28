using Npgsql;
using Telegram.Bot;
using Telegram.Bot.Exceptions;
namespace LeoBot.Sharing;

public sealed class WorkoutDeliveryService(ITelegramBotClient bot, TelegramSharingStore store)
{
    public async Task<bool> DeliverNextAsync(CancellationToken ct)
    {
        var lease=Guid.NewGuid();
        long workout,chat; Guid revision; int? message; string document,nickname,locale;
        await using(var claim=store.Source.CreateCommand("""
            WITH candidate AS (
                SELECT m.workout_id,m.chat_id FROM workout_telegram_messages m
                JOIN workouts w ON w.id=m.workout_id
                WHERE m.cancelled_at IS NULL AND m.desired_revision IS DISTINCT FROM m.delivered_revision
                  AND m.attempts<8 AND m.next_attempt_at<=now() AND (m.lease_until IS NULL OR m.lease_until<now())
                  AND (EXISTS(SELECT 1 FROM user_telegram t LEFT JOIN telegram_workout_preferences p ON p.user_id=t.user_id WHERE t.user_id=w.user_id AND t.chat_id=m.chat_id AND COALESCE(p.private_enabled,true))
                    OR EXISTS(SELECT 1 FROM telegram_workout_subscriptions s JOIN telegram_chats c ON c.chat_id=s.chat_id WHERE s.user_id=w.user_id AND c.chat_id=m.chat_id AND c.active AND s.status='accepted' AND s.enabled))
                ORDER BY m.next_attempt_at LIMIT 1 FOR UPDATE OF m SKIP LOCKED
            )
            UPDATE workout_telegram_messages m SET lease_id=@lease,lease_until=now()+interval '2 minutes',attempts=m.attempts+1
            FROM candidate c WHERE m.workout_id=c.workout_id AND m.chat_id=c.chat_id
            RETURNING m.workout_id,m.chat_id
            """))
        {
            claim.Parameters.AddWithValue("lease",lease);
            await using var reader=await claim.ExecuteReaderAsync(ct);
            if(!await reader.ReadAsync(ct))return false;
            workout=reader.GetInt64(0); chat=reader.GetInt64(1);
        }
        // Re-read latest content and consent after claiming. Saves coalesce into the newest revision.
        await using(var query=store.Source.CreateCommand("""
            SELECT d.revision,m.message_id,d.document::text,u.nickname,
              CASE WHEN m.chat_id>0 THEN COALESCE(p.language,'en') ELSE c.locale END
            FROM workout_telegram_messages m JOIN workouts w ON w.id=m.workout_id JOIN users u ON u.id=w.user_id
            JOIN workout_editor_documents d ON d.workout_id=w.id
            LEFT JOIN user_settings p ON p.user_id=u.id LEFT JOIN telegram_chats c ON c.chat_id=m.chat_id
            WHERE m.workout_id=@workout AND m.chat_id=@chat AND m.lease_id=@lease AND m.cancelled_at IS NULL
              AND (EXISTS(SELECT 1 FROM user_telegram t LEFT JOIN telegram_workout_preferences p ON p.user_id=t.user_id WHERE t.user_id=w.user_id AND t.chat_id=m.chat_id AND COALESCE(p.private_enabled,true))
                OR EXISTS(SELECT 1 FROM telegram_workout_subscriptions s JOIN telegram_chats c ON c.chat_id=s.chat_id WHERE s.user_id=w.user_id AND c.chat_id=m.chat_id AND c.active AND s.status='accepted' AND s.enabled))
            """))
        {
            Keys(query,workout,chat,lease);
            await using var reader=await query.ExecuteReaderAsync(ct);
            if(!await reader.ReadAsync(ct))return true;
            revision=reader.GetGuid(0); message=reader.IsDBNull(1)?null:checked((int)reader.GetInt64(1));
            document=reader.GetString(2); nickname=reader.GetString(3); locale=reader.GetString(4);
        }
        try
        {
            var names=new Dictionary<string,string>();
            await using(var query=store.Source.CreateCommand("""
                SELECT e.id::text,COALESCE((SELECT t.title FROM exercise_translations t JOIN languages l ON l.id=t.language_id
                    WHERE t.exercise_id=e.id ORDER BY (l.code=@locale) DESC,(l.code='en') DESC,l.id LIMIT 1),e.name)
                FROM exercises e WHERE e.id IN (SELECT (item->>'exerciseId')::bigint FROM workout_editor_documents d,
                    jsonb_array_elements(d.document->'exercises') item WHERE d.workout_id=@workout AND item->>'exerciseId' IS NOT NULL)
                """))
            {
                query.Parameters.AddWithValue("locale",locale); query.Parameters.AddWithValue("workout",workout);
                await using var reader=await query.ExecuteReaderAsync(ct);
                while(await reader.ReadAsync(ct)) names[reader.GetString(0)]=reader.GetString(1);
            }
            var text=WorkoutMessageFormatter.Format(nickname,document,names,locale);
            if(message is null) message=(await bot.SendMessage(chat,text,linkPreviewOptions:new(){IsDisabled=true},cancellationToken:ct)).Id;
            else
            {
                try { await bot.EditMessageText(chat,message.Value,text,linkPreviewOptions:new(){IsDisabled=true},cancellationToken:ct); }
                catch(ApiRequestException e) when(e.ErrorCode==400 && e.Message.Contains("message is not modified",StringComparison.OrdinalIgnoreCase)) { }
            }
            await using var done=store.Source.CreateCommand("""
                UPDATE workout_telegram_messages SET message_id=@message,delivered_revision=@revision,lease_id=NULL,lease_until=NULL,last_error=NULL,updated_at=now()
                WHERE workout_id=@workout AND chat_id=@chat AND lease_id=@lease
                """);
            Keys(done,workout,chat,lease); done.Parameters.AddWithValue("message",(long)message.Value); done.Parameters.AddWithValue("revision",revision);
            await done.ExecuteNonQueryAsync(ct);
        }
        catch(OperationCanceledException) when(ct.IsCancellationRequested) { throw; }
        catch(Exception error)
        {
            // Store fixed status codes only; Telegram exceptions may include personal message text.
            var api=error as ApiRequestException;
            var code=api?.ErrorCode==403?"forbidden":api?.ErrorCode==400?"messageUnavailable":"retrying";
            var retry=api?.Parameters?.RetryAfter??30;
            await using var failed=store.Source.CreateCommand("""
                UPDATE workout_telegram_messages SET lease_id=NULL,lease_until=NULL,last_error=@error,
                  next_attempt_at=now()+make_interval(secs=>@delay),attempts=CASE WHEN @permanent THEN 8 ELSE attempts END,updated_at=now()
                WHERE workout_id=@workout AND chat_id=@chat AND lease_id=@lease
                """);
            Keys(failed,workout,chat,lease); failed.Parameters.AddWithValue("error",code);
            failed.Parameters.AddWithValue("delay",(double)Math.Max(5,retry)); failed.Parameters.AddWithValue("permanent",api?.ErrorCode is 400 or 403);
            await failed.ExecuteNonQueryAsync(ct);
        }
        return true;
    }
    private static void Keys(NpgsqlCommand command,long workout,long chat,Guid lease)
    {
        command.Parameters.AddWithValue("workout",workout); command.Parameters.AddWithValue("chat",chat); command.Parameters.AddWithValue("lease",lease);
    }
}
