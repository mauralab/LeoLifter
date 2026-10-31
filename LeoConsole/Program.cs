using LeoConsole;
using LeoConsole.Services;
using LeoCore;
using LeoDatabase;
using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();
services.AddLeoConsole();

var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__LeoDatabase")
    ?? Environment.GetEnvironmentVariable("LEODATABASE_CONNECTION_STRING");
if (!string.IsNullOrWhiteSpace(connectionString))
{
    services.AddLeoDatabase(connectionString);
    services.AddLeoCore();
    services.AddSingleton(new DatabaseAvailability(true));
}

using var provider = services.BuildServiceProvider(new ServiceProviderOptions
{
    ValidateScopes = true,
    ValidateOnBuild = true
});

provider.GetRequiredService<ConsoleApp>().Run();
