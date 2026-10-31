# Core coverage review

Reviewed against the current models, manager APIs, mapping configuration and executable validation harnesses. The user guide is in [Managers/User/README.md](Managers/User/README.md); program and workout guides remain alongside their managers.

## CRUD coverage

| Domain | Models covered | Service |
| --- | --- | --- |
| Accounts and sign-in storage | User, UserTelegram, UserPassword, UserSession | UserManager |
| Personal data | UserProfile, UserSettings, WeightMeasurement | UserManager |
| Access | Role, Permission, UserRole, RolePermission, UserPermission | UserManager / AccessManager |
| Program templates | Program, ProgramCycle, ProgramDay, ProgramDayGroup, ProgramDaySet, ProgramSetExercise | ProgramManager |
| Shared exercises | Exercise | ProgramManager |
| Workout history | Workout, WorkoutGroup, WorkoutSet, WorkoutSetExercise | WorkoutManager |

All 23 current entity models have basic create/read/update/delete or assignment equivalents. Password reads intentionally expose presence/verification rather than stored hashes. Composite-key assignments use replacement/upsert operations instead of editing key columns. Every ordered program/workout entity has a move method. CRUD coverage is not the same as complete application workflow or production readiness.

## Reproduced issues to fix

### P1: Tracked user write results can contain credential data

In one scope, CreateAsync/AddPasswordAsync followed by EditAsync returns the tracked User with User.Password populated by EF relationship fixup. That navigation contains PasswordHash. Other tracked related entities can also reach the user graph. FindAsync's no-tracking query excludes the credential navigation, but that does not protect write return values. Directly serializing manager results can expose sensitive internal data.

Affected paths: [UserManager.Users.cs](Managers/User/UserManager.Users.cs), [UserManager.Password.cs](Managers/User/UserManager.Password.cs), and EF entity return contracts generally.

Recommended fix: use response DTOs that explicitly project allowed fields before crossing an API/bot boundary; avoid exposing persistence graphs. Retain a regression test that loads credentials before creating the response. This was reproduced in SQLite without printing any credential values. The new user guide documents the current limitation; code behavior has not been changed in this documentation review.

### P2: Shared exercise type changes bypass result consistency checks

WorkoutManager checks that repetitions, distance or duration units match the set's exercise. However, ProgramManager.EditExerciseAsync can change an already-used exercise from Repetitions to Duration while its recorded results still contain Rep. The historical record is then inconsistent, even though all manager calls individually succeeded.

Affected path: [ProgramManager.Exercises.cs](Managers/Program/ProgramManager.Exercises.cs).

Recommended fix: make type immutable while an exercise is referenced, or validate all template/result usages before allowing a type change. Apply equivalent concurrency protection to the validation and write. The conflicting recorded result was reproduced in SQLite. No fix was applied during this review.

### P2: A stale tracked parent can break reordering after reparenting

If a context tracks a set in group A, another editor moves that set to group B, and the first context then calls MoveSetAsync, RequireSetAsync can return the tracked entity with its old parent ID. The sibling query uses group A while the database row now belongs to B. SiblingOrdering's Single lookup fails with InvalidOperationException. Refreshing positions alone does not refresh the parent used to choose siblings. The same pattern exists for other reparentable entities.

Affected paths: [WorkoutManager.Ordering.cs](Managers/Workout/WorkoutManager.Ordering.cs), [ProgramManager.Ordering.cs](Managers/Program/ProgramManager.Ordering.cs), [SiblingOrdering.cs](Managers/Shared/SiblingOrdering.cs).

Recommended fix: read/refresh the current parent after acquiring the aggregate lock and construct the sibling query from that database state, with an explicit policy for unsaved local parent changes. Reproduced using an externally committed parent update against SQLite. No fix was applied during this review.

## Application workflows still to implement or decide

1. **Create a workout from a program day.** Current WorkoutManager.CreateAsync creates only a header and optional source link. It does not copy groups, sets or target prescriptions, expand repeats, or choose how targets become recorded-result rows.
2. **Save an editor draft as one batch.** Individual moves and CRUD methods save immediately. Multiple frontend edits need a batch endpoint/service or a caller-owned transaction to avoid partial saves. Version/concurrency tokens are also needed if stale client edits should be rejected instead of overwriting a later edit.
3. **Authentication boundary.** Enforce caller identity, program visibility/ownership and administrative permissions in the host. Add password policy, login throttling/recovery and refresh-token rotation/replay handling when building real sign-in flows. User password changes and session creation currently do not share a user-row lock; concurrent revocation/issuance needs design and PostgreSQL tests.
4. **Username policy.** Search currently uses a nonunique Nickname. Add a separate normalized, unique username only if users should sign in by a unique name. Otherwise keep the current list-returning search.
5. **Initial access data.** The EF model does not seed User/Creator/Admin roles, admin.access or a default role assignment. Decide which initial data is required and bootstrap it idempotently.
6. **Historical measurement policy.** Referenced weight measurements cannot be deleted, but can be edited. Decide whether historical analysis should use the edited measurement, an immutable measurement or a workout snapshot.
7. **Localization validation.** Country is only checked for two letters. Language tags and timezone IDs remain text; validate them when their values are used by localization/scheduling features.

## Database and test follow-up

- The solution builds with zero warnings/errors. Existing CRUD, ownership, validation, ordering and rollback checks pass in isolated in-memory/SQLite harnesses; the three audit reproductions above also ran against SQLite.
- SQLite ordering tests adapt PostgreSQL FOR UPDATE syntax. They verify immediate unique/check constraints and transaction/savepoint rollback, but do not prove PostgreSQL row-lock behavior or concurrent-editor correctness.
- Current validation harnesses are outside this repository in the Codex workspace. Add a maintained test project and CI runs so these checks travel with the solution.
- No checked-in migration/baseline was found. If the database already exists from SQL scripts, establish a reviewed baseline; otherwise create/review an initial migration. Do not run initial CREATE statements over existing tables.
- Run PostgreSQL integration tests for enum labels, cascades, same-program cycle keys, reordering, concurrent edits, password/session revocation, and source-day deletion preserving workout history.

No live database records or schemas were modified during this documentation/review task.
