using Terminal.Gui.Input;

namespace LeoConsole.Screens;

// Key/Execute are optional: a control can own the key while the footer describes it.
public sealed record ScreenCommand(string Gesture, string Description, Key? Key = null, Action? Execute = null);
