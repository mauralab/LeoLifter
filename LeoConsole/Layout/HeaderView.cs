using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;

namespace LeoConsole.Layout;

public sealed class HeaderView
{
    public Label View { get; } = new()
    {
        HotKeySpecifier = new System.Text.Rune(0xffff), X = 0, Y = 0, Width = Dim.Fill(), Height = 1, CanFocus = false
    };

    public void SetBreadcrumb(IReadOnlyList<string> breadcrumb) =>
        View.Text = "  Leo Console  /  " + string.Join("  /  ", breadcrumb);
}
