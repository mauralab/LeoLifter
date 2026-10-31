using LeoConsole.Controls;
using LeoConsole.Navigation;
using LeoConsole.Services;
using Terminal.Gui.App;
using Terminal.Gui.Input;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;

namespace LeoConsole.Screens.Tables;

public sealed class TableEditScreen : AsyncScreenBase
{
    private readonly ITableService _service;
    private readonly INavigator _navigator;
    private readonly TableEditRoute _route;
    private readonly InputForm _form = new();
    private readonly Dictionary<string, EditableTextInput> _fields = [];
    private bool _loaded;
    public override IReadOnlyList<string> Breadcrumb { get; }
    public override IReadOnlyList<ScreenCommand> Commands { get; }
    public TableEditScreen(INavigator navigator, ITableService service, IApplication app, TableEditRoute route) : base(route, app)
    {
        _service = service; _navigator = navigator; _route = route;
        Breadcrumb = route.OwnerId is { } id ? ["Home", "Constructors", $"User #{id}", route.Table, route.Original is null ? "New" : "Edit"]
            : ["Home", "SQL tables", route.Table, route.Original is null ? "New" : "Edit"];
        Commands = [new("1.", route.Original is null ? "Create" : "Save", Key.D1, Save), new("2.", "Cancel", Key.D2, navigator.Back), new("Enter", "Edit input")];
        View.Add(new Label { Text = $"{(route.Original is null ? "1. Create" : "1. Save")}   2. Cancel | Blank optional field = NULL", X = 1, Y = 0, CanFocus = false }, _form.View, Status);
    }
    public override void OnShown()
    {
        if (_loaded) { _form.FocusFirst(); return; }
        RunOperation(async ct =>
        {
            var definition = (await _service.CatalogAsync(ct)).Single(x => x.Name == _route.Table);
            return () =>
            {
                _form.Section(_route.OwnerId is null ? "Table record" : "Details");
                foreach (var field in definition.Fields)
                {
                    if (field.ReadOnly || (_route.Original is null && field.Generated)) continue;
                    if (_route.OwnerId is not null && (field.Key || field.Name is "UserId" or "RefreshTokenHash" or "RevokedAt")) continue;
                    var value = _route.Original?.Values[field.Name] ?? field.Default;
                    if (_route.Original is null && field.Name == "MeasuredAt") value = FieldValue.Format(DateTime.UtcNow);
                    if (_route.Original is null && field.Name == "ExpiresAt") value = FieldValue.Format(DateTime.UtcNow.AddDays(30));
                    var type = Nullable.GetUnderlyingType(field.Type) ?? field.Type;
                    var hint = type == typeof(DateOnly) ? " (yyyy-MM-dd)" : type == typeof(DateTime) ? " (UTC)" : "";
                    var input = _form.Add(field.Column + hint, value, field.Choices, field.Secret);
                    input.Enabled = !(_route.Original is not null && field.Key);
                    _fields.Add(field.Name, input); RegisterInput(input);
                }
                _loaded = true; _form.FocusFirst();
                Status.Text = "Up/Down: Input | <>: Selector | UTC: yyyy-MM-dd HH:mm:ss";
            };
        });
    }
    private void Save()
    {
        if (IsBusy || !_loaded) return;
        var values = _fields.ToDictionary(x => x.Key, x => x.Value.Text);
        RunOperation(async ct => { await _service.SaveAsync(_route.Table, _route.Original, values, _route.OwnerId, ct); return () => _navigator.Back(); });
    }
}

public sealed class RecordDeleteScreen : AsyncScreenBase
{
    public override IReadOnlyList<string> Breadcrumb { get; }
    public override IReadOnlyList<ScreenCommand> Commands { get; }
    public RecordDeleteScreen(INavigator navigator, ITableService service, IApplication app, RecordDeleteRoute route) : base(route, app)
    {
        Breadcrumb = ["Delete record", route.Table];
        void Delete()
        {
            if (IsBusy) return;
            RunOperation(async ct => { await service.DeleteAsync(route.Table, route.Original, route.OwnerId, ct); return () => navigator.Back(); });
        }
        Commands = [new("1.", "Cancel", Key.D1, navigator.Back), new("2.", "Delete permanently", Key.D2, Delete)];
        View.Add(new Label { HotKeySpecifier = new System.Text.Rune(0xffff), Text = $"Permanently delete this {route.Table} record?\n{string.Join(", ", route.Original.Values.Where(x => x.Key.EndsWith("Id")).Select(x => $"{x.Key}={x.Value}"))}\nDependent records may also be deleted.\n\n1. Cancel   2. Delete permanently", X = 1, Y = 1, Width = Dim.Fill(1), Height = 5, CanFocus = false }, Status);
    }
}
