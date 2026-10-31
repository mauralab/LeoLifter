using LeoConsole.Screens;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;

namespace LeoConsole.Layout;

public sealed class FooterView
{
    public View View { get; } = new()
    {
        X = 0, Y = Pos.AnchorEnd(1), Width = Dim.Fill(), Height = 1, CanFocus = false
    };
    private readonly Label _actions = new()
    {
        X = 0, Y = 0, Width = Dim.Fill(24), Height = 1, CanFocus = false
    };
    private readonly Label _quit = new()
    {
        Text = "9. Exit", X = Pos.AnchorEnd(22), Y = 0, Width = 22, Height = 1, CanFocus = false
    };

    public FooterView() => View.Add(_actions, _quit);

    public void SetCommands(IReadOnlyList<ScreenCommand> commands, bool canGoBack, bool editing = false)
    {
        if (editing)
        {
            _actions.Text = "  EDITING | Enter: Keep value | Esc: Revert";
            _quit.Text = "Actions disabled";
            return;
        }
        var hints = commands.Select(x => x.Gesture.EndsWith('.')
            ? $"{x.Gesture} {x.Description}" : $"{x.Gesture}: {x.Description}").ToList();
        _quit.Text = canGoBack ? "9. Back" : "9. Exit";
        _actions.Text = "  " + string.Join("  |  ", hints);
    }
}
