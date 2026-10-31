using LeoConsole.Controls;
using LeoConsole.Navigation;
using LeoConsole.Services;
using Terminal.Gui.App;
using Terminal.Gui.Input;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;

namespace LeoConsole.Screens.Users;

public sealed class UserListScreen : AsyncScreenBase
{
    private readonly INavigator _navigator;
    private readonly IUserService _users;
    private readonly EditableTextInput _search;
    private readonly View _searchBar;
    private readonly View _toolbar;
    private readonly PaginatedTable<UserRow> _table;
    private int _page = 1;
    private string _query = "";
    public override IReadOnlyList<string> Breadcrumb { get; } = ["Home", "Constructors", "Users"];
    public override IReadOnlyList<ScreenCommand> Commands { get; }

    public UserListScreen(INavigator navigator, IUserService users, IApplication application, UsersRoute route)
        : base(route, application)
    {
        _navigator = navigator;
        _users = users;
        Commands =
        [
            new("1.", "New", Key.D1, New),
            new("2.", "Search", Key.D2, ShowSearch),
            new("Enter", "Edit"),
            new("4.", "Delete", Key.D4, Delete),
            new("3.", "Refresh", Key.D3, Refresh),
            new("Left/Right", "Page")
        ];
        _searchBar = new View { X = 0, Y = 0, Width = Dim.Fill(), Height = 2, Visible = false, CanFocus = true };
        var searchLabel = new Label { Text = "Search:", X = 1, Y = 0, Width = 8, Height = 1 };
        _search = new EditableTextInput();
        _search.View.X = 9;
        _search.View.Width = Dim.Fill(1);
        RegisterInput(_search);
        _search.Committed += (_, _) => ApplySearch();
        _searchBar.Add(searchLabel, _search.View);
        _toolbar = new View { X = 0, Y = 0, Width = Dim.Fill(), Height = 2, CanFocus = true };
        _toolbar.Add(new Label { Text = "1. New   2. Search   3. Refresh   4. Delete", X = 1, Y = 0, Width = Dim.Fill(1), Height = 1, CanFocus = false });
        _table = new PaginatedTable<UserRow>(["ID", "Nickname", "Created (UTC)", "Updated (UTC)"],
            user => [user.Id.ToString(), TableText.Ellipsize(user.Nickname),
                user.CreatedAt.ToString("yyyy-MM-dd HH:mm"), user.UpdatedAt.ToString("yyyy-MM-dd HH:mm")]);
        _table.View.X = 1;
        _table.View.Y = 2;
        _table.View.Width = Dim.Fill(1);
        _table.View.Height = Dim.Fill(2);
        _table.PageRequested += page => { if (!IsBusy) { _page = page; Refresh(); } };
        _table.Table.Accepted += (_, _) => Edit();
        View.Add(_searchBar, _toolbar, _table.View, Status);
    }

    public override void OnShown()
    {
        _table.Table.SetFocus();
        Refresh();
    }

    public override bool HandleKey(Key key)
    {
        if (IsEditing) return base.HandleKey(key);
        if (base.HandleKey(key)) return true;
        if (!_search.IsSelected)
        {
            if (key == Key.CursorRight) { if (!IsBusy) _table.Next(); return true; }
            if (key == Key.CursorLeft) { if (!IsBusy) _table.Previous(); return true; }
            if (key == Key.CursorUp || key == Key.CursorDown)
            {
                _table.Table.SetFocus();
                _table.Table.NewKeyDownEvent(key);
                return true;
            }
        }

        return false;
    }

    private void ApplySearch()
    {
        if (IsBusy) return;
        _query = _search.Text.Trim();
        _page = 1;
        HideSearch();
        Refresh();
    }

    private void ShowSearch()
    {
        if (_searchBar.Visible) { HideSearch(); return; }
        _searchBar.Visible = true;
        _toolbar.Y = 2;
        _table.View.Y = 4;
        _search.Focus();
    }

    private void HideSearch()
    {
        _searchBar.Visible = false;
        _toolbar.Y = 0;
        _table.View.Y = 2;
        _table.Table.SetFocus();
    }

    private void Refresh()
    {
        var page = _page;
        var query = _query;
        var selectedId = _table.Selected?.Id;
        RunOperation(async token =>
        {
            var result = await _users.GetPageAsync(query, page, 10, token);
            return () =>
            {
                _page = result.PageNumber;
                _table.Show(result);
                if (selectedId is { } id) _table.Select(row => row.Id == id);
                var filter = string.IsNullOrWhiteSpace(query) ? "" : $"Filter: {TableText.Ellipsize(query, 20)} | ";
                Status.Text = filter + (result.TotalCount == 0 ? "No users found. 1: New | 2: Search." : "Up/Down: Row | Left/Right: Page | Enter: Edit | 4: Delete");
            };
        });
    }

    private void Edit()
    {
        if (!IsBusy && _table.Selected is { } user) _navigator.Open(new UserEditRoute(user.Id));
    }

    private void New()
    {
        if (!IsBusy) _navigator.Open(new UserEditRoute());
    }

    private void Delete()
    {
        if (!IsBusy && _table.Selected is { } user) _navigator.Open(new UserDeleteRoute(user.Id, user.Nickname));
    }

    public override void Dispose()
    {
        base.Dispose();
        _table.Dispose();
    }
}
