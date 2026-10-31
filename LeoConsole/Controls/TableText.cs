using System.Globalization;

namespace LeoConsole.Controls;

public static class TableText
{
    public static string Ellipsize(string text, int maximum = 24)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(maximum, 3);
        var clean = string.Concat(text.Select(c => char.IsControl(c) ? ' ' : c));
        var elements = StringInfo.ParseCombiningCharacters(clean);
        return elements.Length <= maximum ? clean : clean[..elements[maximum - 3]] + "...";
    }
}
