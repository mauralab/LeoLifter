# LeoCore

Business operations shared by the console app, API, Telegram bot and analyzer.

## Manager guides

| Domain | Documentation | Managers |
| --- | --- | --- |
| Users, personal data, credentials and access | [User guide](Managers/User/README.md) | UserManager, AccessManager |
| Program templates and shared exercise catalog | [Program guide](Managers/Program/README.md) | ProgramManager |
| Recorded workouts and results | [Workout guide](Managers/Workout/README.md) | WorkoutManager |

See [the coverage review](REVIEW.md) for verified issues and missing application workflows. All public manager types remain in `LeoCore.Managers`; folders organize their implementation files.

## Registration

```csharp
using LeoCore;
using LeoDatabase;

services.AddLeoDatabase(connectionString);
services.AddLeoCore();
```

Inject the manager needed by your application class. Managers are scoped and share the scope's LeoDbContext. Use one context per unit of work, do not call it concurrently, and discard it after a failed write before retrying. Every write saves its changes and any other pending changes on that shared context.

Program and workout reordering share `Managers/Shared/SiblingOrdering.cs`. Each move saves atomically; a frontend draft that contains several operations still needs a batch-save boundary or caller-owned transaction. The manager guides describe method signatures, field replacement/null behavior, ownership checks, validation and deletion semantics.

The host application owns authentication, authorization, response DTOs and user-facing error handling. Persistence entities should not be serialized directly to clients.
