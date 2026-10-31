using LeoConsole.Controls;
using LeoConsole.Navigation;
using LeoConsole.Services;
using Terminal.Gui.App;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;
using Terminal.Gui.Input;

namespace LeoConsole.Screens.Users;

public sealed class UserDeleteScreen : AsyncScreenBase
{
    private readonly Label _cancel;
    public override IReadOnlyList<string> Breadcrumb { get; }
    public override IReadOnlyList<ScreenCommand> Commands { get; }

    public UserDeleteScreen(INavigator navigator, IUserService users, IApplication application, UserDeleteRoute route)
        : base(route, application)
    {
        Breadcrumb = ["Home", "Users", $"Delete #{route.UserId}"];
        var warning = new Label
        {
            Text = $"Permanently delete user #{route.UserId}: {TableText.Ellipsize(route.Nickname, 40)}?\n\nThis also deletes their profiles, sessions, measurements and workouts.\nPrograms authored by this user must be reassigned or deleted first.",
            X = 1, Y = 1, Width = Dim.Fill(1), Height = 6
        };
        _cancel = new Label { Text = "1. Cancel", X = 1, Y = 8, CanFocus = false };
        var delete = new Label { Text = "2. Delete permanently", X = 19, Y = 8, CanFocus = false };
        void Delete()
        {
            if (IsBusy) return;
            RunOperation(async token =>
            {
                await users.DeleteAsync(route.UserId, token);
                return () =>
                {
                    navigator.Back();
                    if (route.ReturnToList) navigator.Back();
                };
            });
        }
        Commands = [new("1.", "Cancel", Key.D1, navigator.Back), new("2.", "Delete permanently", Key.D2, Delete)];


        View.Add(warning, _cancel, delete, Status);
    }

    public override void OnShown() => View.SetFocus();
}
