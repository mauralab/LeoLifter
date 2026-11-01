using LeoBot;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

try
{
    var builder = Host.CreateApplicationBuilder(args);
    builder.Configuration.AddJsonFile(Path.Combine(AppContext.BaseDirectory, "appsettings.Local.json"), optional: true)
        .AddEnvironmentVariables();
    builder.Services.AddLeoBot(builder.Configuration);
    using var host = builder.Build();
    await host.RunAsync();
}
catch (OptionsValidationException error)
{
    Console.Error.WriteLine("LeoBot configuration: " + string.Join(" ", error.Failures));
    Environment.ExitCode = 1;
}
