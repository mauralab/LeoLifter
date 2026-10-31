namespace LeoConsole.Navigation;

public interface INavigator
{
    bool CanGoBack { get; }
    void Open(ScreenRoute route);
    void Back();
    void Quit();
}
