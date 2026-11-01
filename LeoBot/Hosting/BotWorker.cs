using LeoBot.Handlers;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Telegram.Bot;
using Telegram.Bot.Exceptions;
using Telegram.Bot.Polling;
using Telegram.Bot.Types.Enums;

namespace LeoBot.Hosting;

public sealed class BotWorker(ITelegramBotClient bot, BotUpdateHandler handler,
    IHostApplicationLifetime lifetime, ILogger<BotWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            var me = await bot.GetMe(stoppingToken);
            var webhook = await bot.GetWebhookInfo(stoppingToken);
            if (!string.IsNullOrEmpty(webhook.Url))
            {
                logger.LogError("This bot has an active webhook. Remove it before starting long polling. LeoBot has not changed it.");
                Environment.ExitCode = 1;
                lifetime.StopApplication();
                return;
            }
            logger.LogInformation("LeoBot @{Username} is ready. Open a private chat and send /start. Ctrl+C stops the bot.", me.Username);
            var receiver = new DefaultUpdateHandler(
                (_, update, ct) => handler.HandleAsync(update, me.Username, ct),
                (_, error, source, _) =>
                {
                    // Never log request URLs/exception bodies, which may contain the bot token.
                    logger.LogWarning("Telegram {Source}: {ErrorType}, API code {Code}. {Hint}",
                        source, error.GetType().Name, (error as ApiRequestException)?.ErrorCode, TelegramErrorDiagnostics.Describe(error));
                    if (source == HandleErrorSource.FatalError)
                    {
                        Environment.ExitCode = 1;
                        lifetime.StopApplication();
                    }
                    return Task.CompletedTask;
                });
            await bot.ReceiveAsync(receiver, new ReceiverOptions
            {
                AllowedUpdates = [UpdateType.Message, UpdateType.CallbackQuery]
            }, stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
        catch (Exception error)
        {
            logger.LogError("LeoBot could not start ({ErrorType}, API code {Code}). Check Telegram__BotToken and network access.",
                error.GetType().Name, (error as ApiRequestException)?.ErrorCode);
            Environment.ExitCode = 1;
            lifetime.StopApplication();
        }
    }
}
