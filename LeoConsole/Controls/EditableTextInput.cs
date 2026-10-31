using Terminal.Gui.Input;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;

namespace LeoConsole.Controls;

/// <summary>A selectable field that changes text only between Enter and Enter/Esc.</summary>
public sealed class EditableTextInput
{
    private string _original = "";
    private readonly Label _marker = new() { Text = "-", X = 0, Y = 0, Width = 2, Height = 1, CanFocus = false };
    public View View { get; } = new() { Width = Dim.Fill(), Height = 1, CanFocus = true };
    public TextField Field { get; } = new() { X = 2, Y = 0, Width = Dim.Fill(2), Height = 1, ReadOnly = true };
    public string Text { get => Field.Text; set => Field.Text = value; }
    public string[]? Choices { get; set; }
    public bool IsEditing { get; private set; }
    public bool IsSelected => Field.HasFocus;
    public bool Enabled { get => View.Enabled; set { View.Enabled = value; Field.Enabled = value; } }
    public event EventHandler? ModeChanged;
    public event EventHandler? Committed;

    public EditableTextInput()
    {
        View.Add(_marker, Field);
        Field.HasFocusChanged += (_, _) => _marker.Text = Field.HasFocus ? ">" : "-";
    }

    public void Focus() => Field.SetFocus();

    public void BeginEdit()
    {
        if (!Enabled || IsEditing) return;
        _original = Text;
        IsEditing = true;
        Field.ReadOnly = false;
        Focus();
        ModeChanged?.Invoke(this, EventArgs.Empty);
    }

    public void EndEdit(bool keep)
    {
        if (!IsEditing) return;
        if (!keep) Text = _original;
        IsEditing = false;
        Field.ReadOnly = true;
        ModeChanged?.Invoke(this, EventArgs.Empty);
        if (keep) Committed?.Invoke(this, EventArgs.Empty);
    }

    public bool Cycle(Key key)
    {
        if (Choices is not { Length: > 0 } choices || (key != Key.CursorLeft && key != Key.CursorRight)) return false;
        var index = Array.IndexOf(choices, Text);
        Text = choices[(index + (key == Key.CursorRight ? 1 : -1) + choices.Length) % choices.Length];
        return true;
    }

    public bool HandleEditKey(Key key)
    {
        if (key == Key.Enter) { EndEdit(true); return true; }
        if (key == Key.Esc) { EndEdit(false); return true; }
        if (Choices is not null) { Cycle(key); return true; }
        // Keep focus inside this input. Digits, cursor movement and editing keys
        // go to the native text control; no screen actions are dispatched.
        if (key == Key.Tab || key == Key.Tab.WithShift || key == Key.CursorUp || key == Key.CursorDown || key == Key.Q.WithCtrl || key.IsAlt)
            return true;
        if (new[] { Key.F1, Key.F2, Key.F3, Key.F4, Key.F5, Key.F6, Key.F7, Key.F8, Key.F9, Key.F10, Key.F11, Key.F12 }
            .Any(function => function == key)) return true;
        return false;
    }
}
