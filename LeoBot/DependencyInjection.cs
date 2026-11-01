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
            .Validate(options => !options.HasAuthUrl || System.Text.Encoding.UTF8.GetByteCount(options.AuthLinkSecret) >= 32,
                "Set Telegram__AuthLinkSecret to the same 32-byte-or-longer secret as LeoWeb TELEGRAM_AUTH_SECRET.")
            .ValidateOnStart();
        services.AddSingleton<ITelegramBotClient>(provider =>
            new TelegramBotClient(provider.GetRequiredService<IOptions<BotOptions>>().Value.BotToken));
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<TelegramLoginLinkFactory>();
        services.AddSingleton<LandingMessageFactory>();
        services.AddSingleton<BotUpdateHandler>();
        services.AddHostedService<BotWorker>();
        return services;
    }
}
