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

Review the generated SQL before applying it. If the tables already exist from the earlier SQL scripts, establish a migration baseline against that schema instead of running an initial create migration over it. Startup does not apply migrations. The additive exercise upgrade below is separate from establishing an initial EF migration baseline.

Packages: Microsoft.EntityFrameworkCore and Microsoft.EntityFrameworkCore.Relational 10.0.14, Npgsql.EntityFrameworkCore.PostgreSQL 10.0.3, and private design-time tooling 10.0.14. Other application projects need only reference LeoDatabase for runtime use; EF CLI startup projects also need the design package.

## Exercise localization and media

The shared catalog now has the following relationships:

```text
languages <- exercise_translations -> exercises
languages <- exercise_media_translations -> exercise_media -> exercises
```

| Table | Key / important columns |
| --- | --- |
| `languages` | `id`, unique `code`, `native_name` |
| `exercise_translations` | Composite PK `(exercise_id, language_id)`, required `title`, nullable `description`, timestamps |
| `exercise_media` | `id`, `exercise_id`, `type` (`image` / `video`), 1-based `position`, timestamps |
| `exercise_media_translations` | Composite PK `(exercise_media_id, language_id)`, required `url`, optional `title`, `description`, `alt_text`, timestamps |

Built-in languages are en (ID 1), uk (2), nb (3), de (4), pl (5). Code is the stable application lookup; IDs are foreign keys. IDs below 100 are reserved for seed entries, and automatically generated custom language IDs start at 100. EF seeds match the SQL migration. The existing `user_settings.language` text column is unchanged.

An exercise has at most one text translation for a language. Each exercise can have multiple image/video items with unique positions across its media collection. Each media item has at most one localized entry per language; use the same URL in several translations for a shared image, or different URLs for localized images/videos. Media files live in application/object/CDN storage; the database stores locations and localized text, not file bytes. Uploading, URL validation/access control and storage management remain application responsibilities. The database enforces trimmed, nonempty titles/URLs, lengths, positive positions, keys and relationships.

Deleting an unused exercise cascades through its text translations, media items and their translations. Existing program/workout references still restrict exercise deletion. Deleting a media item cascades only its localized media entries. A language referenced by either translation table cannot be deleted.

`Exercise.Name` / `Description` and the existing ProgramManager exercise CRUD remain unchanged for compatibility. These fields provide legacy fallback text; the new translation tables hold localized content. There is no automatic synchronization or language inference for legacy text. Future readers can resolve requested language, then English, then legacy fallback fields; the web layout is not connected to the database by this upgrade. Future writes that update fallback text and its matching translation should use one transaction.

EF entities are in `Models/Localization/Language.cs` and `Models/Workout/ExerciseTranslation.cs`, `ExerciseMedia.cs`, `ExerciseMediaTranslation.cs`. DbSets are `Languages`, `ExerciseTranslations`, `ExerciseMedia`, `ExerciseMediaTranslations`. Configuration lives in `Context/Configurations/ExerciseLocalizationConfiguration.cs`; `UseLeoDatabase` registers the native `exercise_media_type` enum for both runtime and tooling.

### Apply to an existing database

`Sql/0001_exercise_localization_media.sql` is a reviewed additive upgrade for the pre-existing schema. It creates only the new enum/tables/indexes and seeds the language lookup. It never drops exercise columns, modifies existing exercise text or creates sample exercise/media rows. It can be rerun safely against its own schema. For a manually managed database, execute the file inside a transaction after the base `exercises` table exists.

On this repository's local setup, the existing LeoWeb PostgreSQL configuration can run it from LeoWeb:

```sh
npm run db:exercises:migrate
```

That command takes a transaction-level advisory lock and applies the SQL as one transaction. It is separate from `db:auth:migrate`; authentication upgrades do not apply catalog changes. The upgrade was applied to the configured local database on 16 November 2026. Restart running .NET applications after deployment to load the updated enum mappings/model. New test databases created by EF EnsureCreated receive the same schema/seeds, but EnsureCreated is not a production upgrade strategy.

Validation covered both an old-schema SQL upgrade and a fresh EF-created PostgreSQL database: repeated application without changing existing text, matching constraints, EF and Drizzle round trips, image/video enums, Unicode translations, timestamps, unique language/position rules, FK restrictions and cascade deletion. All fixture records were confined to isolated databases.

## Optional program sets

`Sql/0003_optional_program_sets.sql` adds `program_set_exercises.is_optional boolean NOT NULL DEFAULT false` without altering existing targets. Run `npm run db:programs:migrate` from LeoWeb to apply this and the editor metadata upgrade transactionally. Safe to repeat. Fresh EF-created databases receive the same column/default through ProgramConfiguration.

Each ProgramSetExercise still represents one physical set. For a prescription of 3–5 identical sets, three rows have IsOptional=false and the following two have IsOptional=true. Fixed counts use only required rows. Rep ranges already exist as TargetRepsMin/TargetRepsMax; equal bounds represent one fixed rep count. LeoCore's SetExerciseDetails accepts IsOptional as its final optional parameter (default false).
