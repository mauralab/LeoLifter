using Telegram.Bot;
using Telegram.Bot.Exceptions;
namespace LeoBot.Sharing;

public sealed class WorkoutCleanupService(ITelegramBotClient bot,TelegramSharingStore store)
{
    public async Task<bool> DeleteNextAsync(CancellationToken ct)
    {
        // A send already in flight may still write its message ID; wait for its lease first.
        await using(var cleanup=store.Source.CreateCommand("DELETE FROM workout_telegram_messages WHERE delete_requested AND message_id IS NULL AND (lease_until IS NULL OR lease_until<now())"))
            await cleanup.ExecuteNonQueryAsync(ct);
        var lease=Guid.NewGuid();long workout,chat;int message;
        await using(var claim=store.Source.CreateCommand("""
            WITH candidate AS (SELECT workout_id,chat_id FROM workout_telegram_messages
              WHERE delete_requested AND message_id IS NOT NULL AND delete_attempts<8 AND delete_next_attempt_at<=now()
                AND (lease_until IS NULL OR lease_until<now()) ORDER BY delete_next_attempt_at LIMIT 1 FOR UPDATE SKIP LOCKED)
            UPDATE workout_telegram_messages m SET lease_id=@lease,lease_until=now()+interval '2 minutes',delete_attempts=delete_attempts+1
            FROM candidate c WHERE m.workout_id=c.workout_id AND m.chat_id=c.chat_id RETURNING m.workout_id,m.chat_id,m.message_id
            """))
        {
            claim.Parameters.AddWithValue("lease",lease);await using var r=await claim.ExecuteReaderAsync(ct);
            if(!await r.ReadAsync(ct))return false;
            workout=r.GetInt64(0);chat=r.GetInt64(1);message=checked((int)r.GetInt64(2));
        }
        try
        {
            try { await bot.DeleteMessage(chat,message,ct); }
            catch(ApiRequestException e) when(e.ErrorCode==400 && e.Message.Contains("message to delete not found",StringComparison.OrdinalIgnoreCase)) { }
            await using var done=store.Source.CreateCommand("DELETE FROM workout_telegram_messages WHERE workout_id=@workout AND chat_id=@chat AND lease_id=@lease");
            done.Parameters.AddWithValue("workout",workout);done.Parameters.AddWithValue("chat",chat);done.Parameters.AddWithValue("lease",lease);
            await done.ExecuteNonQueryAsync(ct);
        }
        catch(OperationCanceledException) when(ct.IsCancellationRequested) {throw;}
        catch(Exception error)
        {
            var api=error as ApiRequestException;
            await using var fail=store.Source.CreateCommand("""
                UPDATE workout_telegram_messages SET lease_id=NULL,lease_until=NULL,last_error='deleteFailed',
                delete_attempts=CASE WHEN @permanent THEN 8 ELSE delete_attempts END,
                delete_next_attempt_at=now()+make_interval(secs=>@delay) WHERE workout_id=@workout AND chat_id=@chat AND lease_id=@lease
                """);
            fail.Parameters.AddWithValue("workout",workout);fail.Parameters.AddWithValue("chat",chat);fail.Parameters.AddWithValue("lease",lease);
            fail.Parameters.AddWithValue("permanent",api?.ErrorCode is 400 or 403);fail.Parameters.AddWithValue("delay",(double)Math.Max(5,api?.Parameters?.RetryAfter??30));
            await fail.ExecuteNonQueryAsync(ct);
        }
        return true;
    }
}
