using LeoConsole.Navigation;
using Terminal.Gui.Input;
using Terminal.Gui.ViewBase;

namespace LeoConsole.Screens;

public interface IScreen : IDisposable
{
    ScreenRoute Route { get; }
    View View { get; }
    IReadOnlyList<string> Breadcrumb { get; }
    IReadOnlyList<ScreenCommand> Commands { get; }
    bool IsEditing { get; }
    event EventHandler? CommandsChanged;
    void OnShown();
    void OnHidden() { }
    bool HandleKey(Key key);
}
