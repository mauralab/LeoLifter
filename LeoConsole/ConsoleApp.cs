using LeoConsole.Layout;
using LeoConsole.Navigation;
using Terminal.Gui.App;
using Terminal.Gui.Input;

namespace LeoConsole;

public sealed class ConsoleApp(IApplication application, Navigator navigator, AppLayout layout)
{
    public Navigator Navigator { get; } = navigator;
    public AppLayout Layout { get; } = layout;

    public void Run()
    {
        application.Init();
        application.Keyboard.KeyDown += OnKeyDown;
        Navigator.QuitRequested += OnQuitRequested;
        try
        {
            Navigator.Open(new HomeRoute());
            application.Run(Layout.Root);
        }
        finally
        {
            application.Keyboard.KeyDown -= OnKeyDown;
            Navigator.QuitRequested -= OnQuitRequested;
        }
    }

    private void OnKeyDown(object? sender, Key key)
    {
        if (Navigator.HandleKey(key)) key.Handled = true;
    }

    private void OnQuitRequested(object? sender, EventArgs e) => application.RequestStop();
}
