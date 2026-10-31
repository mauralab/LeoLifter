using LeoConsole.Navigation;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;
using Terminal.Gui.Input;

namespace LeoConsole.Screens.About;

public sealed class AboutScreen : ScreenBase
{
    private readonly Label _back;
    public override IReadOnlyList<string> Breadcrumb { get; }
    public override IReadOnlyList<ScreenCommand> Commands { get; }

    public AboutScreen(INavigator navigator, AboutRoute route) : base(route)
    {
        Breadcrumb = ["Home", "About", route.Section];
        Commands = [new("1.", "Back", Key.D1, navigator.Back)];
        var description = new Label
        {
            Text = "A keyboard-first management shell.\n\nHeader: current navigation path.\nContent: the active screen.\nFooter: available keyboard actions.\n\nScreen actions request navigation through INavigator.",
            X = 1, Y = 1, Width = Dim.Fill(1), Height = 9
        };
        _back = new Label { Text = "1. Back", X = 1, Y = 11, CanFocus = false };

        View.Add(description, _back);
    }

    public override void OnShown() => View.SetFocus();
}

