using LeoConsole.Screens;
using LeoConsole.Screens.About;
using LeoConsole.Screens.Home;
using LeoConsole.Screens.Users;
using LeoConsole.Screens.Tables;
using Microsoft.Extensions.DependencyInjection;

namespace LeoConsole.Navigation;

public sealed class ScreenFactory(IServiceProvider services) : IScreenFactory
{
    // Screens are constructed on demand, after Navigator exists, avoiding a DI cycle.
    // ActivatorUtilities injects dependencies; Navigator owns/disposes the result.
    public IScreen Create(ScreenRoute route) => route switch
    {
        TablesRoute tables => ActivatorUtilities.CreateInstance<TablesScreen>(services, tables),
        TableRowsRoute table => ActivatorUtilities.CreateInstance<TableRowsScreen>(services, table),
        TableEditRoute record => ActivatorUtilities.CreateInstance<TableEditScreen>(services, record),
        RecordDeleteRoute deleteRecord => ActivatorUtilities.CreateInstance<RecordDeleteScreen>(services, deleteRecord),
        HomeRoute home => ActivatorUtilities.CreateInstance<HomeScreen>(services, home),
        AboutRoute about => ActivatorUtilities.CreateInstance<AboutScreen>(services, about),
        UsersRoute users => ActivatorUtilities.CreateInstance<UserListScreen>(services, users),
        UserEditRoute edit => ActivatorUtilities.CreateInstance<UserEditScreen>(services, edit),
        UserDeleteRoute delete => ActivatorUtilities.CreateInstance<UserDeleteScreen>(services, delete),
        _ => throw new ArgumentOutOfRangeException(nameof(route), route, "Unknown screen route.")
    };
}
