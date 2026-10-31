using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;

namespace LeoConsole.Layout;

public sealed class ContentHost
{
    public FrameView View { get; } = new()
    {
        Title = "Workspace",
        X = 0, Y = 1, Width = Dim.Fill(), Height = Dim.Fill(1), CanFocus = true
    };

    public void Show(View content)
    {
        Clear();
        View.Add(content);
    }

    // Detach only: Navigator owns the lifetime of screen views/history.
    public void Clear() => View.RemoveAll();
}
