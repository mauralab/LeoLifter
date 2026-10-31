using LeoDatabase;
using LeoDatabase.Context;
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

await using var provider = services.BuildServiceProvider(new ServiceProviderOptions
{
    ValidateScopes = true,
    ValidateOnBuild = true
});
await using var scope = provider.CreateAsyncScope();
var database = scope.ServiceProvider.GetRequiredService<LeoDbContext>();
Console.WriteLine($"LeoDatabase configured with {database.Model.GetEntityTypes().Count()} models.");
