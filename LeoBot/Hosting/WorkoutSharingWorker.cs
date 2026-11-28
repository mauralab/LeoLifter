using LeoBot.Sharing;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
namespace LeoBot.Hosting;

public sealed class WorkoutSharingWorker(WorkoutDeliveryService delivery, WorkoutCleanupService cleanup, TelegramConnectionService connections, TelegramGroupService groups, ILogger<WorkoutSharingWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        var nextRefresh=DateTimeOffset.MinValue;
        var nextLog=DateTimeOffset.MinValue;
        while(!ct.IsCancellationRequested)
        {
            try
            {
                if(DateTimeOffset.UtcNow>=nextRefresh) { await groups.RefreshManagersAsync(ct); nextRefresh=DateTimeOffset.UtcNow.AddSeconds(10); }
                if(!await cleanup.DeleteNextAsync(ct) && !await connections.NotifyNextAsync(ct)) await delivery.DeliverNextAsync(ct);
                // Bound throughput; Telegram 429 responses schedule a retry.
                await Task.Delay(1100,ct);
            }
            catch(OperationCanceledException) when(ct.IsCancellationRequested) { break; }
            catch(Exception error)
            {
                if(DateTimeOffset.UtcNow>=nextLog) { logger.LogWarning("Workout sharing failed ({ErrorType}); check migrations and connectivity.",error.GetType().Name); nextLog=DateTimeOffset.UtcNow.AddMinutes(1); }
                try { await Task.Delay(5000,ct); } catch(OperationCanceledException) when(ct.IsCancellationRequested) { break; }
            }
        }
    }
}
