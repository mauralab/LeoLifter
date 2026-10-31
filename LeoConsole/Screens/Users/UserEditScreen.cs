using LeoConsole.Navigation;
using LeoConsole.Controls;
using LeoConsole.Services;
using LeoCore.Models.Personal;
using LeoDatabase.Models.Personal;
using Terminal.Gui.App;
using Terminal.Gui.Input;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;

namespace LeoConsole.Screens.Users;

/// <summary>A user workspace: one account draft plus separately persisted Sessions and Weight tabs.</summary>
public sealed class UserEditScreen : AsyncScreenBase
{
    private readonly IAccountService _accounts;
    private readonly ITableService _records;
    private readonly INavigator _navigator;
    private readonly InputForm _form = new();
    private readonly Dictionary<string, EditableTextInput> _fields = [];
    private readonly Label _tabs = new() { X = 1, Y = 0, Width = Dim.Fill(1), Height = 1, CanFocus = true };
    private readonly Label _actions = new() { X = 1, Y = Pos.AnchorEnd(3), Width = Dim.Fill(1), Height = 1, CanFocus = false };
    private readonly PaginatedTable<TableRecord> _sessions;
    private readonly PaginatedTable<TableRecord> _weights;
    private long? _id;
    private bool _loaded;
    private int _tab;
    private readonly int[] _pages = [1, 1, 1];
    public override IReadOnlyList<string> Breadcrumb => ["Home", "Constructors", "Users", _id is { } id ? $"User #{id}" : "New user"];
    public override IReadOnlyList<ScreenCommand> Commands => _tab == 0
        ? [new("1.", _id is null ? "Create" : "Save", Key.D1, Save), new("2.", "Cancel", Key.D2, _navigator.Back),
            new("3.", "Delete user", Key.D3, DeleteUser), new("Up", "Tabs"), new("Enter", "Edit input")]
        : CollectionCommands();
    private IReadOnlyList<ScreenCommand> CollectionCommands()
    {
        List<ScreenCommand> commands = [new("1.", "New", Key.D1, NewRecord), new("2.", "Refresh", Key.D2, RefreshRecords),
            new("3.", "Delete", Key.D3, DeleteRecord)];
        if (_tab == 1) commands.Add(new("4.", "Revoke", Key.D4, Revoke));
        commands.Add(new("Enter", "Edit")); commands.Add(new("Left/Right", "Page"));
        return commands;
    }
    private PaginatedTable<TableRecord> ActiveTable => _tab == 1 ? _sessions : _weights;
    private string TableName => _tab == 1 ? "user_sessions" : "weight_measurements";

    public UserEditScreen(INavigator navigator, IAccountService accounts, ITableService records, IApplication app, UserEditRoute route)
        : base(route, app)
    {
        _navigator = navigator; _accounts = accounts; _records = records; _id = route.UserId;
        _form.Section("General"); Add("Nickname");
        _form.Section("Profile");
        Add("Birthday (yyyy-MM-dd)", key: "BirthDate");
        Add("Sex", choices: ["", "Female", "Male", "Other"]);
        Add("Height"); Add("Height unit", key: "HeightUnit", choices: ["", "Cm", "M", "In", "Ft"]);
        Add("Country (2 letters)", key: "Country"); Add("City"); Add("Timezone");
        _form.Section("Settings"); Add("Language", "en");
        Add("Weight unit", "Kg", "WeightUnit", ["Kg", "Lb"]);
        Add("Length unit", "Cm", "LengthUnit", ["Cm", "M", "In", "Ft"]);
        _sessions = MakeTable(["ID", "Device", "Expires (UTC)", "Revoked (UTC)"], ["Id", "Device", "ExpiresAt", "RevokedAt"]);
        _weights = MakeTable(["ID", "Weight", "Unit", "Measured (UTC)"], ["Id", "Weight", "WeightUnit", "MeasuredAt"]);
        _tabs.HasFocusChanged += (_, _) => UpdateTabs();
        View.Add(_tabs, _form.View, _sessions.View, _weights.View, _actions, Status);
        UpdateTabs();
    }
    private void Add(string label, string value = "", string? key = null, string[]? choices = null)
    {
        var field = _form.Add(label, value, choices); _fields.Add(key ?? label, field); RegisterInput(field);
        field.Enabled = false;
    }
    private PaginatedTable<TableRecord> MakeTable(string[] columns, string[] fields)
    {
        var table = new PaginatedTable<TableRecord>(columns, row => fields.Select(name => (object)TableText.Ellipsize(row.Values[name], 24)).ToArray());
        table.View.X = 1; table.View.Y = 2; table.View.Width = Dim.Fill(1); table.View.Height = Dim.Fill(4);
        table.PageRequested += page => { if (!IsBusy) { _pages[_tab] = page; RefreshRecords(); } };
        table.Table.Accepted += (_, _) => EditRecord();
        return table;
    }
    public override void OnShown()
    {
        if (_loaded) { if (_tab == 0) _form.FocusFirst(); else { ActiveTable.Table.SetFocus(); RefreshRecords(); } return; }
        if (_id is not { } id) { EnableFields(); return; }
        RunOperation(async ct => { var draft = await _accounts.LoadAsync(id, ct); return () => { Fill(draft); EnableFields(); }; });
    }
    private void EnableFields()
    {
        _loaded = true; foreach (var input in _fields.Values) input.Enabled = true; _form.FocusFirst();
        Status.Text = "Up/Down: Input | Up from Nickname: Tabs | <>: Selector";
    }
    private void Fill(AccountDraft draft)
    {
        var p = draft.Profile; var s = draft.Settings;
        var values = new Dictionary<string, object?> { ["Nickname"] = draft.Nickname, ["BirthDate"] = p.BirthDate,
            ["Sex"] = p.Sex, ["Height"] = p.Height, ["HeightUnit"] = p.HeightUnit, ["Country"] = p.Country,
            ["City"] = p.City, ["Timezone"] = p.Timezone, ["Language"] = s.Language,
            ["WeightUnit"] = s.WeightMeasureUnit, ["LengthUnit"] = s.LengthMeasureUnit };
        foreach (var (name, value) in values) _fields[name].Text = FieldValue.Format(value);
        if (p.Sex is { Length: > 0 } sex && !_fields["Sex"].Choices!.Contains(sex))
            _fields["Sex"].Choices = _fields["Sex"].Choices!.Append(sex).ToArray();
    }
    private AccountDraft Draft()
    {
        string Text(string key) => _fields[key].Text.Trim();
        T? Optional<T>(string key) where T : struct => (T?)FieldValue.Parse(Text(key), typeof(T), true);
        return new(Text("Nickname"), new ProfileDetails
        {
            BirthDate = Optional<DateOnly>("BirthDate"), Sex = Text("Sex"), Height = Optional<decimal>("Height"),
            HeightUnit = Optional<LengthUnit>("HeightUnit"), Country = Text("Country"), City = Text("City"), Timezone = Text("Timezone")
        }, new SettingsDetails
        {
            Language = Text("Language"), WeightMeasureUnit = (WeightUnit)FieldValue.Parse(Text("WeightUnit"), typeof(WeightUnit), false)!,
            LengthMeasureUnit = (LengthUnit)FieldValue.Parse(Text("LengthUnit"), typeof(LengthUnit), false)!
        });
    }
    private void Save()
    {
        if (IsBusy || !_loaded) return;
        AccountDraft draft;
        try { draft = Draft(); } catch (ArgumentException error) { Status.Text = error.Message; return; }
        RunOperation(async ct => { var id = await _accounts.SaveAsync(_id, draft, ct); return () => { _id = id; UpdateTabs(); Status.Text = $"User #{id}: General, Profile and Settings saved together."; }; });
    }
    private void UpdateTabs()
    {
        var names = new[] { "Details", "Sessions", "Weight" };
        _tabs.Text = (_tabs.HasFocus ? "> " : "  ") + string.Join("  |  ", names.Select((name, index) => index == _tab ? $"[{name}]" : name)) + "  <>";
        _form.View.Visible = _tab == 0; _sessions.View.Visible = _tab == 1; _weights.View.Visible = _tab == 2;
        _actions.Text = _tab == 0 ? $"1. {(_id is null ? "Create" : "Save")}   2. Cancel" + (_id is null ? "" : "   3. Delete user")
            : "1. New   2. Refresh   3. Delete" + (_tab == 1 ? "   4. Revoke session" : "");
        RefreshCommands();
    }
    private void Switch(int direction)
    {
        if (IsBusy) return;
        if (_id is null) { Status.Text = "Create the user first to manage Sessions and Weight."; return; }
        _tab = (_tab + direction + 3) % 3; UpdateTabs();
        if (_tab != 0) RefreshRecords();
        _tabs.SetFocus();
    }
    private void RefreshRecords()
    {
        if (_id is not { } id || _tab == 0 || IsBusy) return;
        var tab = _tab; var table = ActiveTable; var name = TableName;
        RunOperation(async ct => { var rows = await _records.PageAsync(name, _pages[tab], null, id, ct);
            return () => { table.Show(rows); _pages[tab] = rows.PageNumber; Status.Text = "Up from first row: Tabs | Left/Right: Page | Enter: Edit"; }; });
    }
    private void NewRecord() { if (!IsBusy && _id is { } id) _navigator.Open(new TableEditRoute(TableName, OwnerId: id)); }
    private void EditRecord() { if (!IsBusy && _id is { } id && ActiveTable.Selected is { } row) _navigator.Open(new TableEditRoute(TableName, row, id)); }
    private void DeleteRecord() { if (!IsBusy && _id is { } id && ActiveTable.Selected is { } row) _navigator.Open(new RecordDeleteRoute(TableName, row, id)); }
    private void Revoke()
    {
        if (IsBusy || _tab != 1 || _id is not { } id || ActiveTable.Selected is not { } row) return;
        RunOperation(async ct => { await _records.RevokeAsync(id, long.Parse(row.Values["Id"]), ct); return RefreshRecords; });
    }
    private void DeleteUser() { if (!IsBusy && _id is { } id) _navigator.Open(new UserDeleteRoute(id, _fields["Nickname"].Text, true)); }
    public override bool HandleKey(Key key)
    {
        if (IsEditing) return base.HandleKey(key);
        if (_tabs.HasFocus)
        {
            if (key == Key.CursorLeft) { Switch(-1); return true; }
            if (key == Key.CursorRight) { Switch(1); return true; }
            if (key == Key.CursorDown) { if (_tab == 0) _form.FocusFirst(); else ActiveTable.Table.SetFocus(); UpdateTabs(); return true; }
            if (key == Key.CursorUp || key == Key.Enter) return true;
        }
        else if (key == Key.CursorUp && (_tab == 0 ? _form.Inputs[0].IsSelected : ActiveTable.Table.Value?.SelectedCell.Y is null or 0))
        { _tabs.SetFocus(); UpdateTabs(); return true; }
        if (_tab != 0)
        {
            if (key == Key.CursorLeft) { if (!IsBusy) ActiveTable.Previous(); return true; }
            if (key == Key.CursorRight) { if (!IsBusy) ActiveTable.Next(); return true; }
        }
        return base.HandleKey(key);
    }
    public override void Dispose() { _sessions.Dispose(); _weights.Dispose(); base.Dispose(); }
}
