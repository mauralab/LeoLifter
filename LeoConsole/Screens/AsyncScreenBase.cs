using LeoConsole.Navigation;
using Terminal.Gui.App;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;

namespace LeoConsole.Screens;

public abstract class AsyncScreenBase(ScreenRoute route, IApplication application) : ScreenBase(route)
{
    private CancellationTokenSource? _operation;
    private int _version;
    private bool _disposed;
    protected bool IsBusy { get; private set; }
    protected Label Status { get; } = new()
    {
        X = 1, Y = Pos.AnchorEnd(2), Width = Dim.Fill(1), Height = 2, CanFocus = false
    };

    protected void RunOperation(Func<CancellationToken, Task<Action>> operation)
    {
        if (_disposed || IsBusy) return;
        IsBusy = true;
        Status.Text = "Working...";
        var version = ++_version;
        var source = new CancellationTokenSource();
        _operation = source;
        _ = ExecuteAsync();
        async Task ExecuteAsync()
        {
            try
            {
                var update = await Task.Run(() => operation(source.Token));
                Dispatch(() => { IsBusy = false; Status.Text = ""; update(); });
            }
            catch (OperationCanceledException) { Dispatch(() => { IsBusy = false; Status.Text = "Cancelled."; }); }
            catch (Exception error)
            {
                var message = error is ArgumentException or InvalidOperationException or KeyNotFoundException
                    ? error.Message : "The operation failed. Please refresh and try again.";
                Dispatch(() => { IsBusy = false; Status.Text = message; });
            }
            finally { source.Dispose(); }
        }
        void Dispatch(Action action)
        {
            if (_disposed || version != _version) return;
            try { application.Invoke(() => { if (!_disposed && version == _version) action(); }); }
            catch (InvalidOperationException) { /* UI loop already stopped. */ }
        }
    }

    public override void OnHidden()
    {
        base.OnHidden();
        _version++;
        IsBusy = false;
        try { _operation?.Cancel(); } catch (ObjectDisposedException) { }
        _operation = null;
    }

    public override void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        OnHidden();
        base.Dispose();
    }
}
