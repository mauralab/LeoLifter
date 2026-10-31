using LeoConsole.Layout;
using LeoConsole.Screens;
using Terminal.Gui.Input;

namespace LeoConsole.Navigation;

public sealed class Navigator(AppLayout layout, IScreenFactory screens) : INavigator, IDisposable
{
    private readonly Stack<IScreen> _history = new();
    private bool _disposed;
    public IScreen? CurrentScreen { get; private set; }
    public bool CanGoBack => _history.Count > 0;
    public event EventHandler? QuitRequested;

    public void Open(ScreenRoute route)
    {
        ArgumentNullException.ThrowIfNull(route);
        var next = screens.Create(route);
        var previous = CurrentScreen;
        previous?.OnHidden();
        if (previous is not null) _history.Push(previous);
        CurrentScreen = next;
        layout.Show(next, CanGoBack);
        next.OnShown();
    }

    public void Back()
    {
        if (!_history.TryPop(out var previous)) return;
        var leaving = CurrentScreen;
        leaving?.OnHidden();
        layout.Clear();
        CurrentScreen = previous;
        layout.Show(previous, CanGoBack);
        previous.OnShown();
        leaving?.Dispose();
    }

    public void Quit() => QuitRequested?.Invoke(this, EventArgs.Empty);

    public bool HandleKey(Key key)
    {
        if (CurrentScreen?.IsEditing == true) return CurrentScreen.HandleKey(key);
        if (CurrentScreen?.HandleKey(key) == true) return true;
        if (key == Key.D9)
        {
            if (CanGoBack) Back(); else Quit();
            return true;
        }
        // Esc exits input editing only. Actions use the displayed numbers.
        return key == Key.Esc || key == Key.F10 || key == Key.Q.WithCtrl;
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        layout.Clear();
        CurrentScreen?.Dispose();
        CurrentScreen = null;
        while (_history.TryPop(out var screen)) screen.Dispose();
    }
}
