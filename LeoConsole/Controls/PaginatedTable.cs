using System.Data;
using LeoConsole.Models;
using Terminal.Gui.ViewBase;
using Terminal.Gui.Views;

namespace LeoConsole.Controls;

public sealed class PaginatedTable<T> : IDisposable
{
    private IReadOnlyList<T> _rows = [];
    private PageResult<T>? _page;
    private DataTable? _data;
    private readonly string[] _columns;
    private readonly Func<T, object[]> _cells;
    private readonly Label _pageLabel;
    private readonly Label _previous;
    private readonly Label _next;
    public View View { get; }
    public TableView Table { get; }
    public T? Selected => Table.Value?.SelectedCell.Y is { } row && row >= 0 && row < _rows.Count ? _rows[row] : default;
    public event Action<int>? PageRequested;

    public PaginatedTable(string[] columns, Func<T, object[]> cells)
    {
        _columns = columns;
        _cells = cells;
        View = new View { Width = Dim.Fill(), Height = Dim.Fill(), CanFocus = true };
        Table = new TableView { Width = Dim.Fill(), Height = Dim.Fill(2), FullRowSelect = true, CanFocus = true };
        _previous = new Label { Text = "Left: Previous", X = 0, Y = Pos.AnchorEnd(2), Height = 1, Enabled = false, CanFocus = false };
        _next = new Label { Text = "Right: Next", X = 15, Y = Pos.AnchorEnd(2), Height = 1, Enabled = false, CanFocus = false };
        _pageLabel = new Label { X = 28, Y = Pos.AnchorEnd(2), Width = Dim.Fill(), Height = 1, CanFocus = false };
        View.Add(Table, _previous, _next, _pageLabel);
    }

    public void Show(PageResult<T> page)
    {
        _page = page;
        _rows = page.Items;
        var data = new DataTable();
        foreach (var name in _columns) data.Columns.Add(name);
        foreach (var row in _rows) data.Rows.Add(_cells(row));
        Table.Table = new DataTableSource(data);
        var old = _data;
        _data = data;
        old?.Dispose();
        if (_rows.Count > 0) Table.SetSelection(0, 0, false);
        _previous.Enabled = page.PageNumber > 1;
        _next.Enabled = page.PageNumber < page.TotalPages;
        _pageLabel.Text = $"Page {page.PageNumber}/{page.TotalPages}  |  {page.TotalCount} records";
        Table.SetNeedsDraw();
    }

    public void Previous() { if (_page is { PageNumber: > 1 }) PageRequested?.Invoke(_page.PageNumber - 1); }
    public void Select(Func<T, bool> predicate)
    {
        for (var row = 0; row < _rows.Count; row++)
            if (predicate(_rows[row])) { Table.SetSelection(0, row, false); return; }
    }
    public void Next() { if (_page is not null && _page.PageNumber < _page.TotalPages) PageRequested?.Invoke(_page.PageNumber + 1); }
    public void Dispose() => _data?.Dispose();
}
