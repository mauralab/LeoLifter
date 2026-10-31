# LeoConsole shell

A terminal UI built with [Terminal.Gui 2.5](https://www.nuget.org/packages/Terminal.Gui/2.5.0), with user-account CRUD through LeoCore. The shell remains usable without database configuration; user operations show an actionable configuration error until PostgreSQL is configured.

Set `ConnectionStrings__LeoDatabase` (or `LEODATABASE_CONNECTION_STRING`) in Rider's environment variables before starting. The application registers LeoDatabase/LeoCore only when a connection string is present. Existing database tables must already be available: startup does not create a schema or apply migrations.

Run from the solution directory:

```powershell
dotnet run --project LeoConsole
```

In Rider, run LeoConsole in a terminal/emulated terminal that supports interactive input, rather than a redirected output-only console.

## Structure

```text
LeoConsole/
  Program.cs                 Composition root: DI setup and Run
  ConsoleApp.cs              Owns Navigator/Layout; hooks keyboard and starts UI loop
  DependencyInjection.cs     AddLeoConsole registrations
  Layout/
    AppLayout.cs             Window with three fixed regions
    HeaderView.cs            Breadcrumb
    ContentHost.cs           Expanding working area
    FooterView.cs            Screen hints, editing state and Back/Exit
  Navigation/
    INavigator.cs            Open / Back / Quit API for screens
    Navigator.cs             Current screen, back stack and screen disposal
    ScreenRoute.cs           Typed navigation parameters
    IScreenFactory.cs
    ScreenFactory.cs         Lazy screen construction through DI
  Screens/
    IScreen.cs
    ScreenBase.cs
    ScreenCommand.cs         Footer metadata and optional custom key action
    Home/HomeScreen.cs
    About/AboutScreen.cs
    Users/UserListScreen.cs   Paginated table and nickname/ID search
    Users/UserEditScreen.cs   User Details / Sessions / Weight workspace
    Users/UserDeleteScreen.cs Explicit permanent-deletion confirmation
    Tables/                  Mapped table catalog, records, edit and delete
  Controls/
    PaginatedTable.cs         Reusable table with arrow-key pagination
    EditableTextInput.cs      Text or option input with explicit edit mode
    InputForm.cs              Headings and focus-driven form scrolling
    TableText.cs              Display-only ellipsis and control-character cleanup
  Models/PageResult.cs
  Services/
    IUserService.cs           User DTOs and UI-facing async operations
    UserService.cs            Fresh DI scope/context per operation
    AccountService.cs         Atomic User/Profile/Settings editing through UserManager
    TableService.cs           Mapped record CRUD and owned collection operations
    DatabaseWork.cs           Scoped database operations and safe error messages
```

The header is anchored at the top, the footer at the bottom, and content fills the space between them. Terminal.Gui handles terminal resize, focus, control input and redraw invalidation. Forms scroll vertically as input selection moves. Very narrow/short terminals may still clip labels; a minimum-size overlay is not implemented.

## Navigation flow

```text
Home receives number 2
  -> INavigator.Open(new AboutRoute("Console shell"))
  -> ScreenFactory creates AboutScreen, injecting INavigator and the route
  -> Navigator passes the screen to AppLayout.Show
  -> Layout updates breadcrumb, content and command hints
```

Screens request navigation through INavigator; they do not manipulate the shell. ScreenFactory receives IServiceProvider but creates screens only when Open is called. It never requires screen instances in its constructor, so Navigator -> factory -> screen -> INavigator does not form a construction-time dependency loop.

Navigator keeps previous screen instances on the back stack, preserving local state such as selection. Back detaches/disposes the leaving screen and shows the previous one. Navigator owns screen lifetime, including all remaining history on exit; AppLayout owns the window/region controls. DI owns the Terminal.Gui application and disposes it after Run, restoring the terminal.

## Keyboard controls

- Actions use only number keys 1–9, matching labels such as `1. New`, `1. Create`, `2. Cancel`.
- `9` goes Back, or exits at Home.
- Up/Down selects table rows or inputs. Left/Right changes table pages or selected options.
- Home Left/Right switches Constructors / SQL tables. In a user workspace, Up from the first input/row focuses the tab strip; Left/Right then switches Details / Sessions / Weight and Down returns to the content.
- Enter on a table row opens Edit. Enter on a selected input starts editing.
- Inputs show `>` for the current input and `-` for other inputs. Text stays read-only until Enter.
- While editing text, digits type text and all action shortcuts are disabled. Left/Right moves the text cursor. Option fields cycle with Left/Right; Enter/Esc keeps/reverts their draft. Enter keeps the draft; Esc restores the value from before editing. Neither key saves to the database.
- After leaving edit mode, use the numbered Save/Create action to persist the form. Function keys and Alt+number are not action shortcuts.

ScreenCommand entries define numbered actions and footer hints. Register text inputs with ScreenBase.RegisterInput so shared selection and edit-mode rules apply. The footer changes to the editing controls while an input is being edited. Keep action labels non-focusable; arrows must never select actions.

## Add a screen

1. Add a ScreenRoute record containing navigation parameters (IDs, filters, etc.).
2. Add a screen subclass in Screens/<Feature>. Receive services and the typed route through its constructor.
3. Build View controls and provide Breadcrumb/Commands. Override OnShown to set initial focus.
4. Add a factory case using ActivatorUtilities.CreateInstance<YourScreen>(services, route).
5. Open it with navigator.Open(new YourRoute(...)).

Navigation and control updates happen on the UI thread. AsyncScreenBase runs I/O asynchronously away from that thread, shows busy/errors inline and marshals results back using the application's Invoke method. OnHidden cancels pending operations and invalidates their callbacks so a stale response cannot navigate or update a later screen. A completed database write may already have committed when navigation cancels its response; refreshing shows current database state. UserService creates/disposes a scope for every operation and projects only safe UserRow fields; screens never retain DbContext or persistence entities.

## Constructors: Users

Home defaults to **Constructors**. Press `1` for the paginated, searchable user list. Up/Down selects users; Enter opens the user workspace; `1` creates a new account. Nicknames are shortened with `...` in tables, retaining their full value in forms.

The **Details** tab has:

- General: nickname.
- Profile: birthday (`yyyy-MM-dd`), sex selector, height/unit, two-letter country, city and timezone.
- Settings: language, weight unit and length unit selectors.

Up/Down selects inputs. Enter starts text editing; Enter keeps the field draft and Esc restores it. Selectors show `<>` and cycle with Left/Right. Optional profile fields can be cleared. Forms scroll to the current input. `1. Create` / `1. Save` validates and persists all three records together using UserManager.SaveAccountAsync, in one database save. New accounts remain open so collection tabs become available. `2. Cancel` or `9. Back` leaves the form. Switching tabs preserves accepted field drafts; Sessions/Weight operations do not save Details drafts.

Up from Nickname selects the **Details / Sessions / Weight** tab strip. Use Left/Right to choose a tab and Down to focus its content. On a collection's first row (or empty list), Up returns to the tab strip. Inside a table Left/Right pages its records rather than switching tabs.

**Sessions**: paginated owned sessions showing device, expiry and revocation time. `1. New`, Enter to edit metadata/expiry, `2. Refresh`, `3. Delete`, `4. Revoke`. Expired/revoked sessions cannot be extended through this constructor. Creating a session uses the manager's generated-token flow; this administration UI does not expose refresh tokens or hashes.

**Weight**: paginated owned measurements showing value, unit and UTC measurement time. `1. New`, Enter to edit, `2. Refresh`, `3. Delete`. The manager validates positive weights/units and prevents deletion of measurements referenced by workout history. Sessions and weights save independently through their editors.

The user list has `1. New`, `2. Search`, `3. Refresh`, `4. Delete`. Search is hidden initially; `2` toggles it. Enter starts editing and Enter again applies the query and hides Search; Esc restores the draft. Matches are nickname substrings or exact IDs. Filters survive paging and edits. Pages are clamped after deletion. User deletion opens an explicit confirmation and returns to the list afterward; authored programs must first be reassigned or removed.

## SQL tables

At Home press Left/Right to select **SQL tables**, then `1` to browse all 23 mapped tables. The table catalog and record lists are paginated at ten rows per page. Enter opens a table/record. Record lists have `1. New`, `2. Search`, `3. Refresh`, `4. Delete`; search matches text columns or numeric primary keys.

Lists show a compact selection of up to four non-secret columns; the record editor exposes all editable scalar columns. Composite primary keys are supported. Existing primary keys and timestamps are not editable; identity keys are generated on insert. Foreign keys use their record IDs. Booleans/enums use arrow selectors. Dates use `yyyy-MM-dd` and UTC timestamps use `yyyy-MM-dd HH:mm:ss`. Blank optional fields mean NULL. Hash fields are masked in editors and omitted from list columns.

This area edits individual rows directly through EF metadata, without running SQL text or changing schemas. It uses database constraints rather than constructor workflows: for example, inserting a users row here does not automatically create its profile/settings. Position changes here are direct values and do not reorder siblings. Use the constructors/managers for domain behavior. Deletion requires confirmation; database foreign keys and cascade rules still apply. Each operation has a fresh scope/context and errors are shown inline.

The console is a trusted administration tool. Authentication/authorization for shared or remote access is not implemented. Future tables must remain paginated and future constructors should preserve these input/action conventions.
