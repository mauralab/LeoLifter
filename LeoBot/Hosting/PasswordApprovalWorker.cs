using LeoBot.Authentication;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LeoBot.Hosting;

public sealed class PasswordApprovalWorker(PasswordApprovalStore store, PasswordApprovalService approvals, ILogger<PasswordApprovalWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!store.IsConfigured)
        {
            logger.LogWarning("Password sign-in approvals are disabled. Configure ConnectionStrings__LeoDatabase and apply the auth migrations.");
            return;
        }
        var nextLog = DateTimeOffset.MinValue;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (!await approvals.SendNextAsync(stoppingToken)) await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception error)
            {
                if (DateTimeOffset.UtcNow >= nextLog)
                {
                    // Never log exception bodies, SQL parameters, signed URLs or bot tokens.
                    logger.LogWarning("Password approval delivery failed ({ErrorType}). Check database migrations, connectivity and bot access. Requests expire after five minutes.", error.GetType().Name);
                    nextLog = DateTimeOffset.UtcNow.AddMinutes(1);
                }
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            }
        }
    }
}
