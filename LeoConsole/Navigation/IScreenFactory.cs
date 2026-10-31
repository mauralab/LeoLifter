using LeoConsole.Screens;

namespace LeoConsole.Navigation;

public interface IScreenFactory
{
    IScreen Create(ScreenRoute route);
}
