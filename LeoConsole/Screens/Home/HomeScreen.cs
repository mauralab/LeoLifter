using LeoConsole.Navigation;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;
using Terminal.Gui.Input;

namespace LeoConsole.Screens.Home;

public sealed class HomeScreen : ScreenBase
{
    private int _tab;
    private readonly INavigator _navigator;
    private readonly Label _tabs;
    private readonly Label _menu;
    public override IReadOnlyList<string> Breadcrumb { get; } = ["Home"];
    public override IReadOnlyList<ScreenCommand> Commands =>
    [
        new("1.", _tab == 0 ? "Users" : "Browse SQL tables", Key.D1, Open),
        new("2.", "About", Key.D2, () => _navigator.Open(new AboutRoute())),
        new("3.", "Exit", Key.D3, _navigator.Quit), new("Left/Right", "Tab")
    ];
    public HomeScreen(INavigator navigator, HomeRoute route) : base(route)
    {
        _navigator = navigator;
        _tabs = new Label { X = 1, Y = 1, Width = Dim.Fill(1), Height = 1, CanFocus = false };
        _menu = new Label { X = 1, Y = 4, Width = Dim.Fill(1), Height = 6, CanFocus = false };
        View.Add(_tabs, _menu); Update();
    }
    private void Open() => _navigator.Open(_tab == 0 ? new UsersRoute() : new TablesRoute());
    private void Update()
    {
        _tabs.Text = _tab == 0 ? "< [Constructors]  |  SQL tables >" : "< Constructors  |  [SQL tables] >";
        _menu.Text = _tab == 0 ? "User-friendly constructors\n\n1. Users\n2. About\n3. Exit"
            : "Edit individual database records\n\n1. Browse SQL tables\n2. About\n3. Exit";
        RefreshCommands();
    }
    public override bool HandleKey(Key key)
    {
        if (key == Key.CursorLeft || key == Key.CursorRight) { _tab = 1 - _tab; Update(); return true; }
        return base.HandleKey(key);
    }
}
