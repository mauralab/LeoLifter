namespace LeoConsole.Navigation;

public sealed record TablesRoute : ScreenRoute;
public sealed record TableRowsRoute(string Table) : ScreenRoute;
public sealed record TableEditRoute(string Table, LeoConsole.Services.TableRecord? Original = null, long? OwnerId = null) : ScreenRoute;
public sealed record RecordDeleteRoute(string Table, LeoConsole.Services.TableRecord Original, long? OwnerId = null) : ScreenRoute;
