using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;

namespace LeoConsole.Controls;

/// <summary>Single-line fields with headings and focus-driven scrolling.</summary>
public sealed class InputForm
{
    private int _row;
    public View View { get; } = new() { X = 1, Y = 2, Width = Dim.Fill(1), Height = Dim.Fill(4), CanFocus = true };
    public List<EditableTextInput> Inputs { get; } = [];
    public void Section(string title)
    {
        View.Add(new Label { Text = $"[{title}]", X = 0, Y = _row++, Width = Dim.Fill(), Height = 1, CanFocus = false });
        View.SetContentHeight(_row);
    }
    public EditableTextInput Add(string label, string value = "", string[]? choices = null, bool secret = false)
    {
        var row = _row++;
        View.Add(new Label { Text = choices is null ? TableText.Ellipsize(label, 23) : TableText.Ellipsize(label, 20) + " <>", HotKeySpecifier = new System.Text.Rune(0xffff), X = 0, Y = row, Width = 24, Height = 1, CanFocus = false });
        var input = new EditableTextInput { Text = value, Choices = choices };
        input.View.X = 24; input.View.Y = row; input.View.Width = Dim.Fill();
        input.Field.Secret = secret;
        input.Field.HasFocusChanged += (_, _) =>
        {
            if (!input.IsSelected) return;
            var viewport = View.Viewport;
            if (viewport.Height <= 0) return;
            if (row < viewport.Y) View.ScrollVertical(row - viewport.Y);
            else if (row >= viewport.Bottom) View.ScrollVertical(row - viewport.Bottom + 1);
        };
        Inputs.Add(input); View.Add(input.View); View.SetContentHeight(_row);
        return input;
    }
    public void FocusFirst() => Inputs.FirstOrDefault(x => x.Enabled)?.Focus();
}
