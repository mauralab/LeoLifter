using LeoConsole.Layout;
using LeoConsole.Navigation;
using Microsoft.Extensions.DependencyInjection;
using Terminal.Gui.App;
using LeoConsole.Services;

namespace LeoConsole;

public static class DependencyInjection
{
    public static IServiceCollection AddLeoConsole(this IServiceCollection services)
    {
        services.AddSingleton<IApplication>(_ => Application.Create());
        services.AddSingleton<HeaderView>();
        services.AddSingleton<ContentHost>();
        services.AddSingleton<FooterView>();
        services.AddSingleton<AppLayout>();
        services.AddSingleton<IScreenFactory, ScreenFactory>();
        services.AddSingleton<Navigator>();
        services.AddSingleton<INavigator>(provider => provider.GetRequiredService<Navigator>());
        services.AddSingleton<ConsoleApp>();
        services.AddSingleton<IUserService, UserService>();
        services.AddSingleton<DatabaseWork>();
        services.AddSingleton<IAccountService, AccountService>();
        services.AddSingleton<ITableService, TableService>();
        services.AddSingleton(new DatabaseAvailability(false));
        return services;
    }
}
