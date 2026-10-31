namespace LeoConsole.Navigation;

public abstract record ScreenRoute;
public sealed record HomeRoute : ScreenRoute;
public sealed record AboutRoute(string Section = "Console shell") : ScreenRoute;
public sealed record UsersRoute : ScreenRoute;
public sealed record UserEditRoute(long? UserId = null) : ScreenRoute;
public sealed record UserDeleteRoute(long UserId, string Nickname, bool ReturnToList = false) : ScreenRoute;
