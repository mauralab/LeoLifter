# LeoDatabase

EF Core 10 / PostgreSQL database library. The context is `LeoDatabase.Context.LeoDbContext`.

## Registration

Each application registers its own scoped context. The console app already demonstrates this:

```csharp
using LeoDatabase;
using LeoDatabase.Context;
using Microsoft.Extensions.DependencyInjection;

services.AddLeoDatabase(connectionString);
```

Inject `LeoDbContext` into the constructor of the service that needs it. In console applications and background workers, create a DI scope for each unit of work. Do not share a context between threads or store one in a singleton.

Set `ConnectionStrings__LeoDatabase` or `LEODATABASE_CONNECTION_STRING` in your application's environment or Rider run configuration. Example format (replace the placeholders):

```text
Host=localhost;Port=5432;Database=leo;Username=YOUR_USER;Password=YOUR_PASSWORD
```

The library, console app and design-time factory use the same registration and enum configuration. No credentials are stored in the project. The console example resolves the context and validates its model; it does not connect, create tables or run migrations automatically.

## Schema and timestamps

Mappings are grouped in `Context/Configurations` for users/personal data, access, programs and workouts. They include table/column names, one-to-one keys, composite keys, precision, unique indexes, check constraints, and delete rules from the reviewed SQL. PostgreSQL enum registration follows the provider's [enum mapping documentation](https://www.npgsql.org/efcore/mapping/enum.html); `Percent1Rm` explicitly maps to `percent_1rm`.

SaveChanges and SaveChangesAsync set UTC timestamps, preserving CreatedAt on updates. Database defaults populate initial timestamps for SQL inserts. ExecuteUpdate, raw SQL and other database clients bypass SaveChanges: retain the existing updated_at triggers if you need timestamps maintained for those writes. These mappings do not install database triggers.

Use UTC DateTime values for TIMESTAMPTZ properties. Before saving a workout result, validate that the referenced body-weight measurement belongs to the workout user. Before reparenting cycles, prevent indirect parent loops; the schema enforces same-program parentage and rejects direct self-parentage. Role permission precedence remains application logic.

## Migrations

The design-time factory reads the same environment variables. With the EF CLI 10.0.14 installed, run from the solution directory:

```powershell
dotnet ef migrations add InitialCreate --project LeoDatabase --startup-project LeoDatabase --output-dir Migrations
dotnet ef migrations script --project LeoDatabase --startup-project LeoDatabase
```

Review the generated SQL before applying it. If the tables already exist from the earlier SQL scripts, establish a migration baseline against that schema instead of running an initial create migration over it. No database migration has been applied as part of this setup.

Packages: Microsoft.EntityFrameworkCore and Microsoft.EntityFrameworkCore.Relational 10.0.14, Npgsql.EntityFrameworkCore.PostgreSQL 10.0.3, and private design-time tooling 10.0.14. Other application projects need only reference LeoDatabase for runtime use; EF CLI startup projects also need the design package.
