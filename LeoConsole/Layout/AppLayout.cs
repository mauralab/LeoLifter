using LeoConsole.Screens;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;

namespace LeoConsole.Layout;

public sealed class AppLayout : IDisposable
{
    private IScreen? _screen;
    private bool _canGoBack;
    public HeaderView Header { get; }
    public ContentHost Content { get; }
    public FooterView Footer { get; }
    public Window Root { get; } = new()
    {
        Title = "Leo Console",
        Width = Dim.Fill(), Height = Dim.Fill()
    };

    public AppLayout(HeaderView header, ContentHost content, FooterView footer)
    {
        Header = header;
        Content = content;
        Footer = footer;
        Root.Add(header.View, content.View, footer.View);
    }

    public void Show(IScreen screen, bool canGoBack)
    {
        if (_screen is not null) _screen.CommandsChanged -= OnCommandsChanged;
        _screen = screen;
        _canGoBack = canGoBack;
        screen.CommandsChanged += OnCommandsChanged;
        Header.SetBreadcrumb(screen.Breadcrumb);
        Content.Show(screen.View);
        Footer.SetCommands(screen.Commands, canGoBack, screen.IsEditing);
    }

    private void OnCommandsChanged(object? sender, EventArgs e)
    {
        if (_screen is null) return;
        Header.SetBreadcrumb(_screen.Breadcrumb);
        Footer.SetCommands(_screen.Commands, _canGoBack, _screen.IsEditing);
    }

    public void Clear()
    {
        if (_screen is not null) _screen.CommandsChanged -= OnCommandsChanged;
        _screen = null;
        Content.Clear();
    }
    public void Dispose() => Root.Dispose();
}
