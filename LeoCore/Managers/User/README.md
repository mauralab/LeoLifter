# UserManager and AccessManager

Registered by `services.AddLeoCore()` as scoped services in `LeoCore.Managers`. Implementations live in this folder. Inputs are in `LeoCore.Models.Personal` and `LeoCore.Models.Users`; measurement enums are in `LeoDatabase.Models.Personal`.

## Operations

| Entity | Create / initialize | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| User | `CreateAsync` | `FindAsync`, `ListAsync`, `FindByUsernameAsync`, `SearchAsync`, `FindByTelegramIdAsync` | `EditAsync` | `DeleteAsync` |
| Profile | `InitializeProfileAsync` | `GetProfileAsync` | `EditProfileAsync` | `DeleteProfileAsync` |
| Settings | `InitializeSettingsAsync` | `GetSettingsAsync` | `EditSettingsAsync` | `DeleteSettingsAsync` |
| Weight measurement | `AddWeightAsync` | `GetWeightAsync`, `ListWeightsAsync` | `EditWeightAsync` | `DeleteWeightAsync` |
| Telegram account | `AddTelegramAsync` | `GetTelegramAsync` | `EditTelegramAsync` | `DeleteTelegramAsync` |
| Password | `AddPasswordAsync` | `HasPasswordAsync`, `VerifyPasswordAsync` | `EditPasswordAsync` | `DeletePasswordAsync` |
| Session | `AddSessionAsync` | `GetSessionAsync`, `ListSessionsAsync`, `FindActiveSessionByTokenAsync` | `EditSessionAsync`, `RevokeSessionAsync` | `DeleteSessionAsync` |
| User role assignments | `AssignRoleAsync` | `ListRolesAsync` | `SetRolesAsync` | `RemoveRoleAsync` |
| User permission overrides | `SetPermissionOverrideAsync` | `ListPermissionOverridesAsync`, `HasPermissionAsync` | `SetPermissionOverrideAsync` | `RemovePermissionOverrideAsync` |

Administrative catalogs are managed by `AccessManager`:

| Entity | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| Role | `AddRoleAsync` | `GetRoleAsync`, `ListRolesAsync` | `EditRoleAsync` | `DeleteRoleAsync` |
| Permission | `AddPermissionAsync` | `GetPermissionAsync`, `ListPermissionsAsync` | `EditPermissionAsync` | `DeletePermissionAsync` |
| Role permission assignments | `AssignRolePermissionAsync` | `ListRolePermissionsAsync` | `SetRolePermissionsAsync` | `RemoveRolePermissionAsync` |

All methods accept a cancellation token. Paginated lists/searches default to `skip: 0, take: 50`, with a maximum page size of 100. User roles, overrides and role-permission association lists are unpaged.

## Registration and use

```csharp
using LeoCore;
using LeoCore.Managers;
using LeoDatabase;
using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();
services.AddLeoDatabase(connectionString);
services.AddLeoCore();

await using var provider = services.BuildServiceProvider();
await using var scope = provider.CreateAsyncScope();
var users = scope.ServiceProvider.GetRequiredService<UserManager>();
var access = scope.ServiceProvider.GetRequiredService<AccessManager>();
```

In an application class, receive these managers through constructor injection. Use one scope/context for each unit of work; do not run concurrent calls on that context. Write methods save immediately, including any other pending changes on the shared context.

## Accounts and search

```csharp
var created = await users.CreateAsync("Leo");
var found = await users.FindAsync(created.Id);
var matches = await users.FindByUsernameAsync("leo");
var page = await users.SearchAsync("le", skip: 0, take: 20);
var byIdOrName = await users.SearchAsync(created.Id.ToString());
await users.EditAsync(created.Id, "New nickname");
```

- CreateAsync creates an account, an empty profile and default settings in one save. It does not create a password, Telegram link, session or role assignment.
- Nicknames are trimmed, nonblank, at most 100 characters and not unique. There is no separate Username column.
- FindByUsernameAsync is case-insensitive exact nickname matching and returns a list. SearchAsync matches a nickname substring or an exact ID if its input is numeric. PostgreSQL collation controls case folding.
- FindAsync is an exact positive-ID lookup and returns null if the user is absent. User queries include profile/settings, not credentials or sessions. Lists/searches order by ID ascending.
- EditAsync changes only the nickname. IDs and creation timestamps are not editable through these methods.

## Profiles and preferences

```csharp
using LeoCore.Models.Personal;
using LeoDatabase.Models.Personal;

await users.InitializeProfileAsync(userId);
await users.EditProfileAsync(userId, new ProfileDetails
{
    Sex = "male",
    BirthDate = new DateOnly(2000, 1, 1),
    Height = 180.5m,
    HeightUnit = LengthUnit.Cm,
    Country = "UA",
    City = "Kyiv",
    Timezone = "Europe/Kyiv"
});
var profile = await users.GetProfileAsync(userId);

await users.EditSettingsAsync(userId, new SettingsDetails
{
    Language = "uk",
    WeightMeasureUnit = WeightUnit.Kg,
    LengthMeasureUnit = LengthUnit.Cm
});
var settings = await users.GetSettingsAsync(userId);
```

Initializers create missing records and preserve existing ones. Edits create a missing record and replace all editable fields. Null/blank optional profile text is cleared; omitting a field in ProfileDetails clears it. Omitting settings fields restores that input record's defaults.

Height and height unit must both be present or both null. Height is positive numeric(7,2), at most 99999.99; units must be defined enum values. Future birth dates are rejected. Country is normalized to uppercase and checked for two ASCII letters; the method does not verify membership in an ISO country catalog. City, sex and timezone remain optional text. Timezone IDs and language tags are not checked against catalogs. Settings defaults are en, kg and cm.

## Weight history

```csharp
var weight = await users.AddWeightAsync(userId, new WeightMeasurementDetails
{
    Weight = 80.125m,
    WeightUnit = WeightUnit.Kg,
    MeasuredAt = DateTime.UtcNow
});

await users.EditWeightAsync(userId, weight.Id, new WeightMeasurementDetails
{
    Weight = 80.2m,
    WeightUnit = WeightUnit.Kg,
    MeasuredAt = weight.MeasuredAt
});
var measurement = await users.GetWeightAsync(userId, weight.Id);
var history = await users.ListWeightsAsync(userId, skip: 0, take: 20);
await users.DeleteWeightAsync(userId, weight.Id);
```

Weights must be positive, at most 99999.999, with at most three decimal places and a defined kg/lb unit. MeasuredAt must be UTC; its input default is the current UTC time. Multiple measurements per day are allowed. History orders by MeasuredAt descending, then ID descending.

Read/edit/delete methods constrain the measurement to userId. A measurement referenced by workout history cannot be deleted. Editing such a measurement is currently allowed and changes the referenced measurement data; it does not create a historical snapshot. Settings changes never change the units on existing measurements.

## Telegram accounts

```csharp
using LeoCore.Models.Users;

await users.AddTelegramAsync(userId, new TelegramDetails(telegramId, chatId));
await users.EditTelegramAsync(userId, new TelegramDetails(telegramId, updatedChatId));
var link = await users.GetTelegramAsync(userId);
var linkedUser = await users.FindByTelegramIdAsync(telegramId);
await users.DeleteTelegramAsync(userId);
```

Each user can have one link, and a Telegram ID can belong to only one user. Telegram IDs must be positive; chat IDs must be nonzero. Add rejects an existing link; Edit requires one. The caller must verify Telegram identity before linking; possession of a numeric Telegram ID is not proof of ownership.

## Passwords and sessions

```csharp
await users.AddPasswordAsync(userId, initialPassword);
var hasPassword = await users.HasPasswordAsync(userId);
var valid = await users.VerifyPasswordAsync(userId, suppliedPassword);
await users.EditPasswordAsync(userId, replacementPassword);

var issued = await users.AddSessionAsync(userId,
    new SessionDetails(DateTime.UtcNow.AddDays(7), Device: "Desktop"));
var session = await users.FindActiveSessionByTokenAsync(issued.RefreshToken);
var sessions = await users.ListSessionsAsync(userId);
await users.RevokeSessionAsync(userId, issued.Session.Id);
```

Passwords are hashed through Microsoft's PasswordHasher. Add requires no existing password; Edit requires one. Verification returns false for a mismatch or an absent password on an existing user and upgrades hashes when the hasher requests it. Credential changes mark currently loaded/queryable unrevoked sessions as revoked in the same SaveChanges call. Concurrent session issuance/password changes are not serialized by UserManager and still need PostgreSQL concurrency validation.

Session creation returns CreatedSession with metadata and a random refresh token. Send that token only to the authenticated client; store it securely there. Only its SHA-256 hash is persisted. Get/list/token-lookup methods return SessionInfo without hashes. Expiry must be a future UTC timestamp. Edits replace device/expiry without changing the token or revocation state; expired/revoked sessions cannot be extended. Revocation is idempotent. Deletion and revocation invalidate subsequent token lookups.

These are trusted credential-storage operations, not complete login endpoints. The host must verify the old credential or a recovery flow before changing a password, enforce password policy/rate limits, and issue any application authorization tokens. Refresh-token rotation, replay detection and recovery/MFA flows are not implemented.

Returned EF entities must not be serialized directly. Writes return tracked entities; if credentials were loaded earlier in the same scope, EF navigation fixup can attach User.Password or other related records to those results. Use explicit response DTOs that whitelist fields. This verified review finding is recorded in ../../REVIEW.md.

## Roles and permission precedence

```csharp
var role = await access.AddRoleAsync("Creator");
var permission = await access.AddPermissionAsync("programs.update.own");
await access.AssignRolePermissionAsync(role.Id, permission.Id);
await users.AssignRoleAsync(userId, role.Id);

await users.SetPermissionOverrideAsync(userId, permission.Id, granted: false);
var allowed = await users.HasPermissionAsync(userId, "programs.update.own");
await users.RemovePermissionOverrideAsync(userId, permission.Id);
```

Role/permission names are trimmed, nonblank and unique within their own catalogs. Catalog lookup by name is case-sensitive under the configured database equality behavior. Assignments are idempotent. SetRolesAsync and SetRolePermissionsAsync replace all assignments, deduplicate the requested IDs and verify every ID before changing records; an empty collection removes all assignments.

An explicit true grants, false denies, and no override inherits from any assigned role. HasPermissionAsync implements that precedence. Unknown permission names evaluate to false for an existing user. Admin has no automatic powers; grant permissions explicitly. Scope strings such as own/any are names only: the caller must also enforce resource ownership. No initial roles, permissions or default user-role assignment are seeded by the EF model.

The host must authenticate/authorize user, account, session and administrative operations. Caller-supplied userId is not authentication. UserManager can operate on any specified user and is intended to sit behind an authorized application boundary.

## Missing records, deletion and persistence

| Situation | Result |
| --- | --- |
| FindAsync or FindByTelegramIdAsync has no match | null |
| Username/search has no matches | Empty list |
| GetRoleAsync / GetPermissionAsync has no match | null |
| Optional child read for an existing user has no match | null |
| Missing required parent user | KeyNotFoundException |
| Weight/session edit or delete is missing or belongs to someone else | KeyNotFoundException |
| Optional profile/settings/Telegram/password deletion is already absent | false |
| Role/permission association removal is already absent | false |
| Invalid IDs, strings, units, precision or timestamps | Argument exception |
| Known duplicate/conflicting link or restricted deletion | InvalidOperationException |
| Concurrent constraint violation | DbUpdateException may be raised |

DeleteAsync deletes an account and its dependent personal data, credentials, sessions, assignments, weights and workouts. Authored programs must first be reassigned or deleted; they must not become default programs by accident. Deleting a role/permission cascades its assignments. These deletions are permanent database deletes.

All DateTime values sent to PostgreSQL TIMESTAMPTZ must be UTC. SaveChanges maintains CreatedAt/UpdatedAt; raw SQL/bulk updates bypass that application logic unless database triggers also maintain timestamps. Read results are untracked, while write results may remain tracked. Use manager edits to persist subsequent changes and discard the scope/context after a failed write before retrying.

See ../../REVIEW.md for the current coverage audit and unresolved issues. API behavior above describes the current implementation; it does not imply the remaining authentication/concurrency work is complete.
