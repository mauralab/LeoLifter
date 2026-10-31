using LeoConsole.Navigation;
using Terminal.Gui.Input;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;
using LeoConsole.Controls;

namespace LeoConsole.Screens;

public abstract class ScreenBase(ScreenRoute route) : IScreen
{
    public ScreenRoute Route { get; } = route;
    public View View { get; } = new() { Width = Dim.Fill(), Height = Dim.Fill(), CanFocus = true };
    public abstract IReadOnlyList<string> Breadcrumb { get; }
    public abstract IReadOnlyList<ScreenCommand> Commands { get; }
    private readonly List<EditableTextInput> _inputs = [];
    public bool IsEditing => _inputs.Any(input => input.IsEditing);
    public event EventHandler? CommandsChanged;

    protected void RefreshCommands() => CommandsChanged?.Invoke(this, EventArgs.Empty);

    protected void RegisterInput(EditableTextInput input)
    {
        _inputs.Add(input);
        input.ModeChanged += (_, _) => CommandsChanged?.Invoke(this, EventArgs.Empty);
    }

    public virtual void OnShown() => View.SetFocus();
    public virtual void OnHidden()
    {
        foreach (var input in _inputs) input.EndEdit(false);
    }

    public virtual bool HandleKey(Key key)
    {
        if (_inputs.FirstOrDefault(input => input.IsEditing) is { } editing)
            return editing.HandleEditKey(key);
        var selected = _inputs.FirstOrDefault(input => input.IsSelected);
        if (selected is not null && selected.Cycle(key)) return true;
        if (selected is not null && key == Key.Enter) { selected.BeginEdit(); return true; }
        if (selected is not null && (key == Key.CursorUp || key == Key.CursorDown))
        {
            var eligible = _inputs.Where(input => input.Enabled && IsVisible(input.View)).ToList();
            var index = eligible.IndexOf(selected);
            if (eligible.Count == 0) return true;
            eligible[Math.Clamp(index + (key == Key.CursorDown ? 1 : -1), 0, eligible.Count - 1)].Focus();
            return true;
        }
        var command = Commands.FirstOrDefault(x => x.Key is { } binding && x.Execute is not null &&
            IsNumber(binding) && binding == key);
        if (command is null) return false;
        command.Execute!();
        return true;
    }

    private static bool IsVisible(View view)
    {
        for (View? current = view; current is not null; current = current.SuperView)
            if (!current.Visible) return false;
        return true;
    }

    private static bool IsNumber(Key key) => new[]
        { Key.D1, Key.D2, Key.D3, Key.D4, Key.D5, Key.D6, Key.D7, Key.D8, Key.D9 }
        .Any(number => number == key);

    public virtual void Dispose() => View.Dispose();
}

