using LeoDatabase;
using LeoCore;
using LeoCore.Managers;
using Microsoft.Extensions.DependencyInjection;

var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__LeoDatabase")
    ?? Environment.GetEnvironmentVariable("LEODATABASE_CONNECTION_STRING");

if (string.IsNullOrWhiteSpace(connectionString))
{
    Console.WriteLine("Set ConnectionStrings__LeoDatabase or LEODATABASE_CONNECTION_STRING to configure PostgreSQL.");
    return;
}

var services = new ServiceCollection();
services.AddLeoDatabase(connectionString);
services.AddLeoCore();

await using var provider = services.BuildServiceProvider(new ServiceProviderOptions
{
    ValidateScopes = true,
    ValidateOnBuild = true
});
await using var scope = provider.CreateAsyncScope();
var users = scope.ServiceProvider.GetRequiredService<UserManager>();
Console.WriteLine("LeoCore configured. UserManager is ready.");
// Example: var user = await users.CreateAsync("Leo");
// Example: var user = await users.FindAsync(1);
