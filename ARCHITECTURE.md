# LeoLifter architecture and feature development guide

Current architecture: 2 November 2026.
Project: `C:\Users\GLaDOS\RiderProjects\LeoConsole`
Solution: `LeoLifter.sln`
Repository: https://github.com/mauralab/LeoLifter

## 1. The big picture

LeoLifter has two application stacks sharing one PostgreSQL database:

```text
LeoConsole -> LeoCore -> LeoDatabase (EF Core) -> PostgreSQL
LeoBot -> signed login link -> LeoWeb -> Drizzle -> PostgreSQL
Browser -> LeoWeb pages / server routes -> Drizzle -> PostgreSQL
```

The .NET solution contains LeoConsole, LeoCore, LeoDatabase and LeoBot. LeoWeb lives alongside them in the same repository but uses Node/npm rather than dotnet. It does not need a .csproj or solution entry to run.

There is currently no ASP.NET API connecting Next.js to LeoCore. LeoWeb accesses PostgreSQL directly on the server. C# managers are not automatically called by web operations. Keep this distinction in mind when adding validation: a rule in LeoCore does not protect a new Drizzle write unless the web code implements it too. For larger shared workflows, a future .NET API could expose LeoCore to both web and bot.

## 2. Where code belongs

| Project | Responsibility | Main starting points |
| --- | --- | --- |
| LeoDatabase | Persistence entities, EF mappings, PostgreSQL enums, context setup | `Models/`, `Context/Configurations/`, `Context/LeoDbContext.cs`, `DependencyInjection.cs` |
| LeoCore | Business operations, validation, ownership checks, ordering | `Managers/User/`, `Managers/Program/`, `Managers/Workout/`, `Models/` |
| LeoConsole | Trusted administration terminal UI | `ConsoleApp.cs`, `Navigation/`, `Layout/`, `Screens/`, `Controls/`, `Services/` |
| LeoBot | Telegram transport, command handling, localized messages, signed login links | `Hosting/BotWorker.cs`, `Handlers/BotUpdateHandler.cs`, `Messages/LandingMessageFactory.cs`, `Authentication/TelegramLoginLinkFactory.cs` |
| LeoWeb | Responsive browser UI, localized routes, web sessions and server-side database access | `app/`, `components/`, `lib/auth/`, `lib/db/`, `lib/i18n/` |

A model describes persisted data. An EF configuration defines its table rules. LeoDbContext is EF's session/unit of work for talking to PostgreSQL; PostgreSQL is the database itself. The design-time context factory exists for EF tooling. Runtime code normally receives dependencies through DI.

## 3. Domain structure

Users have profile/settings, weight measurements, Telegram links, passwords, sessions and access records. These concerns are grouped into entity folders such as `Models/Users`, `Models/Personal` and `Models/Access` in LeoDatabase.

A program is a reusable template:

```text
Program -> cycles (optionally nested) -> days -> groups -> sets -> exercise targets
```

A workout records actual activity:

```text
Workout -> groups -> sets -> recorded exercise results
```

Both use the shared exercise catalog. Linking a workout to a program day does not currently copy the template into the workout automatically. Template instantiation is a future workflow.

`LeoCore/Managers/Program/README.md` and `LeoCore/Managers/Workout/README.md` list exact CRUD signatures, validation, deletion rules and ordering behavior. `LeoCore/Managers/User/README.md` covers user operations. Read those before extending a workflow; `LeoCore/REVIEW.md` lists known gaps.

## 4. Dependency injection and lifetime

Each executable has its own composition root: Program.cs and DependencyInjection.cs.

Typical .NET registration:

```csharp
services.AddLeoDatabase(connectionString);
services.AddLeoCore();
```

Managers and LeoDbContext are scoped. A console operation/background job should create one DI scope per unit of work, resolve its manager, await it and dispose the scope. Do not inject a scoped context into a singleton or run concurrent operations on the same context.

```csharp
using var scope = serviceProvider.CreateScope();
var programs = scope.ServiceProvider.GetRequiredService<ProgramManager>();
var page = await programs.ListAsync();
```

Use `using LeoCore.Managers;` and `using Microsoft.Extensions.DependencyInjection;` for this example. Follow the manager README for filters, pagination and cancellation parameters.

Manager writes save immediately, including any other tracked changes in the same context. Dispose a failed context before retrying. For several writes that must succeed together, use an explicit transaction in one scope and commit only after all operations succeed.

## 5. Console architecture

```text
ConsoleApp -> Navigator -> ScreenFactory -> Screen
                    -> AppLayout.Show(screen)
                       -> HeaderView / ContentHost / FooterView
```

Screens own their current presentation and draft state. They receive INavigator and UI-facing services through DI. They request a transition with a typed route, for example:

```csharp
navigator.Open(new UserEditRoute(userId));
```

Navigator owns the current screen, back stack and screen disposal. ScreenFactory constructs screens lazily through ActivatorUtilities. Layout arranges regions and displays the screen's breadcrumb, content and command hints. A screen does not need to manipulate the header/footer directly.

To add a console feature:

1. Add a route record under `Navigation/` with the required IDs/parameters.
2. Add a screen under `Screens/<Feature>/`, following an existing screen.
3. Add the route case to ScreenFactory.
4. Add a service operation under `Services/` that creates a fresh database scope and calls a manager.
5. Register new services in DependencyInjection.cs and open the route from a numbered command.
6. Use AsyncScreenBase for database I/O; keep control changes on the UI thread and respect hidden-screen cancellation.

UI conventions:

- Number keys 1-9 invoke actions; buttons do not enter arrow-key focus navigation.
- Up/Down selects table rows or inputs. Left/Right pages tables or changes options/tabs where appropriate.
- Enter on a row opens editing. Enter on an input starts edit mode.
- During text editing, number keys type text. Enter accepts the field draft, Esc restores it. A numbered Save action persists the form.
- Tables are paginated. Long display names use ellipses; stored values remain intact.
- Constructors combine related records into a user-friendly workflow. SQL tables edit individual records and rely on database constraints; they do not automatically apply manager workflows such as sibling reordering.

See `LeoConsole/README.md` for the detailed keyboard and screen contract.

## 6. Telegram bot architecture

Program builds the generic host and registers services. BotWorker checks bot identity/webhook state, then receives Message and CallbackQuery updates through long polling. BotUpdateHandler routes private `/start` and `/help` commands. LandingMessageFactory selects one of five translations and builds the welcome message/button.

TelegramLoginLinkFactory receives identity from the actual private Telegram update. It signs tg_id, tg_username, chat_id, issue time and a random nonce using the shared secret. The user opens that link in LeoWeb.

To add a command, route it in BotUpdateHandler, put presentation in a dedicated message factory/service, and register dependencies through DI. Keep database/business work out of the transport loop. The bot does not call LeoCore. Its password approval worker reads/writes the shared authentication queue using Npgsql, and validates private Telegram callback identities before recording Yes/No decisions.

Use a transport stub for automated tests. Do not log raw Telegram exceptions, tokens or signed login URLs. TelegramErrorDiagnostics maps known failures to fixed safe hints. Only one polling process should run for a bot token; an active webhook conflicts with this polling setup.

## 7. Web architecture

`app/[locale]/layout.tsx` is the localized root document. `app/[locale]/page.tsx` renders the landing. Locale URLs use en, uk, nb, de and pl. Translation dictionaries and their shared shape live under `lib/i18n/`; add keys to all five dictionaries.

Server components/routes can use database and session code. Client components handle interaction and should receive safe serializable data. Never import database credentials or signing keys into client code, or use NEXT_PUBLIC_ for secrets.

Important locations:

| Location | Purpose |
| --- | --- |
| `components/landing/` | Landing content and sample-workout interactions |
| `components/auth/` | Browser hand-off and refresh behavior |
| `components/theme-provider.tsx`, `public/theme-init.js` | Saved/system theme preference; keep initialization behavior aligned |
| `lib/db/index.ts` | Server-only PostgreSQL connection pool and Drizzle access |
| `lib/db/schema.ts` | Partial mapping of existing database tables/enums |
| `lib/auth/telegram-link.ts` | Signature/field/expiry verification |
| `lib/auth/store.ts` | Atomic account linking, nonce consumption, sessions and token rotation |
| `lib/auth/session.ts` | JWTs, cookie options, trusted origin and currentUser |
| `lib/auth/http.ts` | Bounded form parsing and safe auth responses |
| `app/api/auth/` | Login, refresh and logout POST handlers |
| `lib/profile/`, `app/api/profile/`, `components/profile/` | Profile validation, transactional saves, Identity-compatible password setup/change and paginated owned-session management |
| `app/[locale]/profile/page.tsx` | Authenticated profile, settings, password and sessions workspace |
| `next.config.ts` | Redirect, private/auth headers, redacted dev logs and allowed dev origins |

The installed Next.js has version-specific behavior. Read `LeoWeb/AGENTS.md` and the relevant bundled docs in `node_modules/next/dist/docs/` before changing routing/configuration.

## 8. Sign-in and session flow

1. User sends `/start` privately to LeoBot.
2. Bot sends a signed link valid for five minutes. It is a bearer credential and must not be shared.
3. `/{locale}/auth` verifies the link on GET, then the browser submits a same-origin POST to `/api/auth/telegram`. GET/link previews do not create accounts or consume the nonce.
4. The POST revalidates the proof and consumes the hashed nonce in the same transaction as user/session writes. A PostgreSQL advisory lock serializes signup for one Telegram ID.
5. Existing Telegram ID finds its linked user. A new user gets the Telegram username as nickname, or telegram_<id> if no username exists. Missing profile/settings are initialized. Existing custom nicknames are preserved.
6. The response sets HTTP-only cookies and redirects to the profile workspace.

Access JWT: 15 minutes. Refresh token/session: 30 days from sign-in. Refresh rotates the opaque token atomically without extending the original expiry. Only its SHA-256 uppercase-hex hash is stored in user_sessions. Cookies use SameSite=Lax and Secure for HTTPS. The refresh cookie is restricted to `/api/auth`.

`currentUser()` verifies the JWT and active database session. Use the authenticated identity for ownership checks; do not trust user IDs from browser input. A valid session alone does not authorize editing another user's program.

Refresh rotation and logout use POST endpoints. A direct GET to the refresh URL leads to the profile hand-off without rotating a token. Local navigation is canonicalized by LeoWeb/proxy.ts to APP_ORIGIN so localhost/127.0.0.1 do not split cookies. Revoked sessions are hidden from profile lists while their database history is retained. Preserve trusted-origin checks and input limits when adding auth-adjacent endpoints. Username and raw Telegram ID query values alone never establish identity.

## 9. Database changes and schema ownership

LeoDatabase owns the existing application schema through EF models/configurations. LeoWeb's Drizzle schema maps only a subset. Do not run blanket `drizzle push` against the shared database using that partial mapping.

The web auth addition has one explicit additive migration: `LeoWeb/db/migrations/0001_telegram_login_links.sql`. Run `npm run db:auth:migrate` once per database; it was already applied to this local database. This records consumed nonce hashes. No cleanup scheduler exists yet; expired nonce rows can be cleaned later.

For a new persisted field/entity:

1. Update the LeoDatabase entity and EF configuration, including FK/delete rules, lengths, numeric precision and enum mappings.
2. Check the real database baseline. Existing tables predate generated EF migrations; do not apply an initial-create migration over them blindly.
3. Generate/review a migration or explicit additive SQL for the actual baseline before applying it.
4. Update LeoCore input records, validation and methods.
5. If web code uses the field, update its Drizzle mapping and server validation too.
6. Update DTOs/UI/translations and verify old rows/defaults.

Use UTC timestamps. EF SaveChanges sets entity timestamps; Drizzle/raw SQL/ExecuteUpdate bypasses that hook, so handle updated_at explicitly or rely on reviewed existing triggers. Keep PostgreSQL enum labels compatible across C# and TypeScript.

## 10. Ordering and drag-and-drop

ProgramManager provides MoveCycleAsync, MoveDayAsync, MoveGroupAsync, MoveSetAsync and MoveSetExerciseAsync. WorkoutManager provides moves for groups, sets and results. Positions are 1-based. Moving 4 to 2 shifts old 2/3 to 3/4. Moves stay in the current parent and preserve gaps outside the changed interval.

`Managers/Shared/SiblingOrdering.cs` uses temporary positive indexes plus a transaction to avoid immediate unique-index conflicts. Program/workout structural writes lock their root row. New writers must respect the same concurrency rules.

For a frontend editor, keep drag-and-drop changes in draft state. Save should submit an authorized operation/batch to the server. Multiple independent manager calls are separate commits unless explicitly wrapped in one transaction. Existing C# moves are not web endpoints; expose a service/API or implement equivalent transactional behavior before wiring the browser to them.

## 11. Local setup and commands

PostgreSQL is a separate running service. The apps do not automatically create the entire database.

.NET configuration (environment/Rider):

```text
ConnectionStrings__LeoDatabase=Host=localhost;Port=5432;Database=<database>;Username=<user>;Password=<password>
```

Alternative: LEODATABASE_CONNECTION_STRING. Keep credentials out of source control.

LeoBot's ignored `appsettings.Local.json` contains Telegram BotToken, WebAuthUrl and AuthLinkSecret. Copy `appsettings.Local.example.json` for another machine. Environment variables override it:

```text
Telegram__BotToken=<BotFather token>
Telegram__WebAuthUrl=http://127.0.0.1:3000/en/auth
Telegram__AuthLinkSecret=<shared random secret, at least 32 UTF-8 bytes>
```

LeoWeb `.env.local` (copy `.env.example`):

```text
DATABASE_URL=<PostgreSQL connection URL>
APP_ORIGIN=http://127.0.0.1:3000
TELEGRAM_AUTH_SECRET=<exact same value as bot AuthLinkSecret>
SESSION_SECRET=<different random secret, at least 32 UTF-8 bytes>
```

APP_ORIGIN has no trailing slash. Use 127.0.0.1 consistently for local sign-in: Telegram rejects localhost button URLs. `allowedDevOrigins` includes 127.0.0.1 for Next development resources. Local links only reach this PC when opened on this PC; phones need a public HTTPS host/tunnel. Update WebAuthUrl and APP_ORIGIN together, plus allowedDevOrigins when using a development tunnel. No tunnel/deployment is configured automatically.

From the solution folder, in separate terminals:

```powershell
dotnet run --project LeoConsole
dotnet run --project LeoBot
```

From LeoWeb:

```powershell
npm install
npm run dev
```

This PC's SDK is also available as `C:\Users\GLaDOS\.dotnet\dotnet.exe` if dotnet is absent from PATH. Run the console in an interactive terminal. Restart bot/web after changing local configuration and send `/start` for a fresh link.

Checks:

```powershell
# Solution folder
dotnet build LeoLifter.sln
# LeoWeb folder
npm run lint
npm run typecheck
npm run build
```

If Windows locks running binaries, stop your own app before building or use a separate dotnet --artifacts-path. Production Next builds and dev mode share .next by default; stop dev first or use an isolated checkout for full build verification. Do not test authentication by inserting fixture users into the real database; use an isolated database and transport stubs.

## 12. Example feature: user weight history on the web

1. Read UserManager's weight methods and the existing EF WeightMeasurement configuration to identify units, ownership and validation.
2. Add the corresponding table/enum mapping to `LeoWeb/lib/db/schema.ts` if missing; this is mapping, not a schema-creation operation.
3. Add server-only query/write functions. Derive userId from the verified session. Bound page size and filter every query/update/delete by that userId.
4. Add an authenticated localized page at `app/[locale]/...` with paginated data and a small client form for interaction.
5. Add a same-origin authenticated POST/route for mutations; validate positive values, units and UTC dates. Check references before deletion, matching domain rules.
6. Add translated labels/errors in all dictionaries and refresh displayed data after a successful write.
7. Verify another user's IDs cannot read/change data, pagination works, invalid values fail safely and the mobile layout remains usable.

## 13. What is implemented and what is next

Implemented: shared persistence and C# CRUD managers, ordering, console user constructors and mapped-record editing, localized responsive landing/theme, bot welcome, signed Telegram-to-web signup/login, refresh/logout, profile/settings/password/session workspace.

Future: full web CRUD/editor screens, template-to-workout instantiation, Telegram Mini App integration, statistics, scheduled notifications, batch draft saves, background cleanup and a deployable shared API if desired. Installed drag-and-drop/form/query packages do not mean those product features already exist.

## 14. Git workflow

All projects now belong to the LeoLifter repository; LeoWeb uses the outer repository rather than its former nested repository. Run commits/pushes from the solution folder so related C#/web changes can be reviewed together. Its earlier standalone history is preserved as the second parent of the integration merge commit. A local metadata backup also exists at `C:\Users\GLaDOS\Documents\Codex\2026-10-31\https-chatgpt-com-share-6ae5dfc1-f6b4\work\LeoWeb-git-backup-20261101`.

```powershell
git status
git diff
# Stage the intended files; inspect the staged diff before committing.
git add <paths>
git diff --cached
git commit -m "Describe the feature"
git push origin main
```

Ignore local .env files, appsettings.Local.json, IDE state and build output. Track safe .env.example/appsettings.Local.example.json templates. Avoid committing secrets or complete signed sign-in links.

## 15. Password sign-in and Telegram approval

`/{locale}/login` implements nickname -> password -> Telegram waiting page. Passwords use the same ASP.NET Identity format as LeoCore. Credential verification queues a browser-bound five-minute request; LeoBot sends Yes/No with the matching request code. No rejects only this attempt. Yes allows one atomic redemption by the browser holding the HTTP-only challenge cookie, creating the normal session. The existing passwordless `/start` flow is still available.

Web: `lib/auth/password-login.ts`, `password-http.ts`, `app/api/auth/password/`, `components/auth/password-login-form.tsx`. Bot: `Authentication/PasswordApprovalStore.cs`, `PasswordApprovalService.cs`, `Messages/PasswordApprovalMessages.cs`, `Hosting/PasswordApprovalWorker.cs`.

Migration `LeoWeb/db/migrations/0002_password_login_approval.sql` creates only `password_login_requests` and `auth_rate_limits`. Run the auth migration script on new databases. The bot needs the existing .NET database connection configuration as well as its token; the web app still does not need the token or a public callback URL. Restart both apps after setup.

Nicknames must match one account, case-insensitively; ambiguous names fail safely and can be changed after Telegram sign-in. Ten attempts per nickname per fifteen minutes are counted in PostgreSQL. Callbacks are bound to Telegram sender/private chat/message; redemption is bound to a hashed browser secret and rechecks password/Telegram state. Expiry, denial, cancellation and replay cannot create a session. Keep the bot running for notification delivery; failure never bypasses the second factor.
