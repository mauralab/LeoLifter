using LeoBot.Sharing;
using LeoBot.Localization;
using LeoBot.Authentication;
using LeoBot.Configuration;
using LeoBot.Handlers;
using LeoBot.Hosting;
using LeoBot.Messages;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Telegram.Bot;

namespace LeoBot;

public static class DependencyInjection
{
    public static IServiceCollection AddLeoBot(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<BotOptions>().Bind(configuration.GetSection(BotOptions.SectionName))
            .Validate(options => BotOptions.IsValidToken(options.BotToken),
                "Set Telegram__BotToken to your BotFather token in environment variables.")
            .Validate(options => BotOptions.IsValidAuthUrl(options.WebAuthUrl),
                "Telegram__WebAuthUrl must be # or an HTTPS auth URL without query/fragment (use HTTP 127.0.0.1 for local development; Telegram rejects localhost buttons).")
            .ValidateOnStart();
        services.AddSingleton<ITelegramBotClient>(provider =>
            new TelegramBotClient(provider.GetRequiredService<IOptions<BotOptions>>().Value.BotToken));
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<TelegramSignInLinkStore>();
        services.AddSingleton<TelegramLoginLinkFactory>();
        services.AddSingleton<LandingMessageFactory>();
        services.AddSingleton<PasswordApprovalStore>();
        services.AddSingleton<PasswordApprovalService>();
        services.AddSingleton<ITelegramLanguageStore, TelegramLanguageStore>();
        services.AddSingleton<TelegramSharingStore>();
        services.AddSingleton<TelegramGroupService>();
        services.AddSingleton<WorkoutDeliveryService>();
        services.AddSingleton<WorkoutCleanupService>();
        services.AddSingleton<TelegramConnectionService>();
        services.AddSingleton<BotUpdateHandler>();
        services.AddHostedService<WorkoutSharingWorker>();
        services.AddHostedService<PasswordApprovalWorker>();
        services.AddHostedService<BotWorker>();
        return services;
    }
}
