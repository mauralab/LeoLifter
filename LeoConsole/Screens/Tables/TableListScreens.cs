using LeoConsole.Controls;
using LeoConsole.Models;
using LeoConsole.Navigation;
using LeoConsole.Services;
using Terminal.Gui.App;
using Terminal.Gui.Input;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;

namespace LeoConsole.Screens.Tables;

public sealed class TablesScreen : AsyncScreenBase
{
    private readonly ITableService _service;
    private readonly PaginatedTable<TableDefinition> _table;
    private IReadOnlyList<TableDefinition> _catalog = [];
    public override IReadOnlyList<string> Breadcrumb => ["Home", "SQL tables"];
    public override IReadOnlyList<ScreenCommand> Commands { get; }
    public TablesScreen(INavigator navigator, ITableService service, IApplication app, TablesRoute route) : base(route, app)
    {
        _service = service;
        _table = new(["SQL table", "Entity"], table => [table.Name, table.EntityType.Name]);
        _table.View.X = 1; _table.View.Y = 2; _table.View.Width = Dim.Fill(1); _table.View.Height = Dim.Fill(4);
        void Open() { if (!IsBusy && _table.Selected is { } table) navigator.Open(new TableRowsRoute(table.Name)); }
        _table.Table.Accepted += (_, _) => Open();
        _table.PageRequested += ShowPage;
        Commands = [new("1.", "Open table", Key.D1, Open), new("2.", "Refresh", Key.D2, Load), new("Enter", "Open"), new("Left/Right", "Page")];
        View.Add(new Label { Text = "SQL tables: record editors (database constraints apply)", X = 1, Y = 0, CanFocus = false }, _table.View, Status);
    }
    public override void OnShown() { _table.Table.SetFocus(); Load(); }
    private void Load() => RunOperation(async ct => { var catalog = await _service.CatalogAsync(ct); return () => { _catalog = catalog; ShowPage(1); }; });
    private void ShowPage(int page) => _table.Show(new(_catalog.Skip((page - 1) * 10).Take(10).ToArray(), page, 10, _catalog.Count));
    public override void Dispose() { _table.Dispose(); base.Dispose(); }
    public override bool HandleKey(Key key)
    {
        if (key == Key.CursorLeft) { _table.Previous(); return true; }
        if (key == Key.CursorRight) { _table.Next(); return true; }
        return base.HandleKey(key);
    }
}

public sealed class TableRowsScreen : AsyncScreenBase
{
    private readonly ITableService _service;
    private readonly INavigator _navigator;
    private readonly TableRowsRoute _route;
    private PaginatedTable<TableRecord>? _table;
    private readonly EditableTextInput _search = new();
    private int _page = 1;
    private string _query = "";
    public override IReadOnlyList<string> Breadcrumb { get; }
    public override IReadOnlyList<ScreenCommand> Commands { get; }
    public TableRowsScreen(INavigator navigator, ITableService service, IApplication app, TableRowsRoute route) : base(route, app)
    {
        _service = service; _navigator = navigator; _route = route;
        Breadcrumb = ["Home", "SQL tables", route.Table];
        Commands = [new("1.", "New", Key.D1, () => { if (!IsBusy) navigator.Open(new TableEditRoute(route.Table)); }),
            new("2.", "Search", Key.D2, Search), new("3.", "Refresh", Key.D3, Load),
            new("4.", "Delete", Key.D4, Delete), new("Enter", "Edit"), new("Left/Right", "Page")];
        _search.View.X = 1; _search.View.Y = 1; _search.View.Width = Dim.Fill(1); _search.View.Visible = false;
        RegisterInput(_search);
        _search.Committed += (_, _) => { _query = _search.Text; _page = 1; _search.View.Visible = false; _table?.Table.SetFocus(); Load(); };
        View.Add(new Label { Text = "1. New   2. Search   3. Refresh   4. Delete", X = 1, Y = 0, CanFocus = false }, _search.View, Status);
    }
    public override void OnShown() { _table?.Table.SetFocus(); Load(); }
    private void Search()
    {
        _search.View.Visible = !_search.View.Visible;
        if (_search.View.Visible) _search.Focus(); else _table?.Table.SetFocus();
    }
    private void Load() => RunOperation(async ct =>
    {
        var definition = (await _service.CatalogAsync(ct)).Single(x => x.Name == _route.Table);
        var page = await _service.PageAsync(_route.Table, _page, _query, null, ct);
        return () =>
        {
            if (_table is null)
            {
                var fields = definition.Fields.Where(x => !x.Secret)
                    .OrderBy(x => x.Key ? 0 : x.Name is "Name" or "Nickname" or "Code" ? 1 : x.Name.EndsWith("Id") ? 2 : x.ReadOnly ? 4 : 3)
                    .Take(4).ToArray();
                _table = new(fields.Select(x => TableText.Ellipsize(x.Column, 20)).ToArray(), row => fields.Select(f => (object)TableText.Ellipsize(row.Values[f.Name], 24)).ToArray());
                _table.View.X = 1; _table.View.Y = 3; _table.View.Width = Dim.Fill(1); _table.View.Height = Dim.Fill(4);
                _table.PageRequested += page => { if (!IsBusy) { _page = page; Load(); } };
                _table.Table.Accepted += (_, _) => { if (!IsBusy && _table.Selected is { } row) _navigator.Open(new TableEditRoute(_route.Table, row)); };
                View.Add(_table.View);
            }
            _page = page.PageNumber; _table.Show(page);
            if (!_search.View.Visible) _table.Table.SetFocus();
            Status.Text = "Enter: all record fields | Search: text fields or numeric primary key";
        };
    });
    private void Delete() { if (!IsBusy && _table?.Selected is { } row) _navigator.Open(new RecordDeleteRoute(_route.Table, row)); }
    public override bool HandleKey(Key key)
    {
        if (IsEditing) return base.HandleKey(key);
        if (base.HandleKey(key)) return true;
        if (!_search.IsSelected)
        {
            if (key == Key.CursorLeft) { if (!IsBusy) _table?.Previous(); return true; }
            if (key == Key.CursorRight) { if (!IsBusy) _table?.Next(); return true; }
        }
        return false;
    }
    public override void Dispose() { _table?.Dispose(); base.Dispose(); }
}
