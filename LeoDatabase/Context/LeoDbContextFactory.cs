using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LeoDatabase.Context;

// Used by dotnet ef; no connection string is embedded in source control.
public sealed class LeoDbContextFactory : IDesignTimeDbContextFactory<LeoDbContext>
{
    public LeoDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__LeoDatabase")
            ?? Environment.GetEnvironmentVariable("LEODATABASE_CONNECTION_STRING");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException(
                "Set ConnectionStrings__LeoDatabase or LEODATABASE_CONNECTION_STRING before running EF tools.");

        var options = new DbContextOptionsBuilder<LeoDbContext>();
        options.UseLeoDatabase(connectionString);
        return new LeoDbContext(options.Options);
    }
}
