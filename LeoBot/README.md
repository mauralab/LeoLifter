# LeoBot

.NET 10 Telegram entry point for LeoLifter. `/start` and `/help` in a private chat return a short welcome message and a personal, passwordless web sign-in link. On the first visit, a language picker appears before any auth link. Choices: English, Ukrainian, Norwegian Bokmål, German and Polish. The choice is stored in `telegram_user_preferences` (Telegram ID, language ID, creation/update timestamps), independently of web registration. Returning visitors receive the welcome and auth link in their selected language. Use `/language` or the language button to change it. The auth link opens the matching web locale; existing web account settings are preserved.

## Sign-in flow

1. Telegram supplies the private user's identity. After language selection, `TelegramLoginLinkFactory` generates a fresh random UUID for this message.
2. `telegram_signin_links` stores its SHA-256 hash, Telegram ID, private chat ID, username, locale, creation/expiry timestamps and consumed timestamp. No application account is required yet.
3. The button contains only `/{locale}/auth/{code}`. A GET/HEAD or Telegram preview does not consume it. The browser submits the code using a same-origin POST.
4. LeoWeb atomically consumes a live, unused code and creates or locates the account plus a session in one transaction. Replays and expired codes fail. New users use their Telegram username; existing nicknames/settings are preserved.
5. The browser receives HTTP-only access/refresh cookies and opens the profile. Refresh tokens last 30 days.

Codes expire after five minutes. They are bearer credentials; never share links or log their full paths. Generate another with `/start`. UUIDs are per-link credentials, not permanent user IDs. Old query-string links are no longer accepted. The obsolete `telegram_login_links` nonce-history table is retained without deleting data.

## Configuration

For this local setup, `appsettings.Local.json` was generated from the existing Rider configuration with the matching web secret. It is ignored by Git, copied to the local build output and explicitly excluded from publishing. Environment variables override this local file. In Rider remove any old `Telegram__WebAuthUrl=#` override to enable real sign-in.

For a new setup, copy `appsettings.Local.example.json` to `appsettings.Local.json` and fill it locally, or configure:

```text
Telegram__BotToken=<BotFather token>
Telegram__WebAuthUrl=http://127.0.0.1:3000/en/auth
```

The bot and web app must use the same PostgreSQL database. A shared link-signing secret is no longer needed; existing `AuthLinkSecret` / `TELEGRAM_AUTH_SECRET` values are ignored. Use an HTTPS public address for real Telegram use, especially on phones: localhost points to the device opening the link, not automatically to the development PC. Set LeoWeb APP_ORIGIN to the same origin (http://127.0.0.1:3000 locally) and restart both apps. Telegram rejects localhost in inline button URLs; use 127.0.0.1 for desktop development. HTTP is accepted only for loopback development URLs; URL query strings/fragments are not allowed in the configured base URL.

Keeping WebAuthUrl as `#` retains the earlier welcome-only behavior with a coming-soon callback instead of a link.

Run from the solution directory:

```powershell
dotnet run --project LeoBot
```

Stop with Ctrl+C. Startup checks identity/webhook configuration and starts long polling without unsolicited messages. Use one running polling instance per bot. Existing webhooks are not removed automatically. Group/channel posts, edits and commands addressed to another bot are ignored.

## Structure

- `Configuration/BotOptions.cs`: validated local/environment configuration.
- `Authentication/TelegramLoginLinkFactory.cs` / `TelegramSignInLinkStore.cs`: opaque credential issuance and database persistence.
- `Messages/LandingMessageFactory.cs`: localized copy and keyboard.
- `Handlers/BotUpdateHandler.cs`: private command/callback routing.
- `Hosting/BotWorker.cs`: long polling and sanitized errors.
- `DependencyInjection.cs` / `Program.cs`: host and DI composition.

Workout notifications, statistics, scheduled posts, web-initiated Telegram verification and a full Mini App remain future work. This flow signs users into the web app from a bot message.

## Checks

Build with `dotnet build LeoBot/LeoBot.csproj`. Authentication was verified with .NET-generated links against a separate PostgreSQL fixture and an actual browser, including returning-user login, replay/tamper rejection, refresh rotation and transaction rollback. No real Telegram messages were sent by tests.

## Password sign-in confirmation

LeoWeb now provides nickname/password sign-in at `/{locale}/login`. After validating the password, it queues a five-minute request in the shared database. `PasswordApprovalWorker` sends its localized **Is this you? / Yes / No** prompt. **Yes** approves the initiating browser; **No** rejects that attempt without revoking existing sessions. Compare the request code with the waiting web page. The browser issues its session only after approval; the bot never receives the password or refresh token.

Configure `ConnectionStrings__LeoDatabase` (or `LEODATABASE_CONNECTION_STRING`) for the same PostgreSQL database as LeoWeb. The ignored local JSON has been configured on this PC. Apply `npm run db:auth:migrate` from LeoWeb on new databases before starting. This creates the auth queue and durable login-attempt limits. A database connection is required for persistent language selection, including welcome-only mode. Run the auth migration before starting/restarting LeoBot; it creates `telegram_user_preferences` referencing the existing `languages` catalog.

`Authentication/PasswordApprovalStore.cs` owns queue claiming/decision SQL; `PasswordApprovalService.cs` sends prompts and validates callback context; `Messages/PasswordApprovalMessages.cs` contains five-language text; `Hosting/PasswordApprovalWorker.cs` polls the queue. A callback must match the private Telegram identity, chat, stored message and live pending request. Decisions are atomic and one-way. Buttons are removed after a decision. Bounded retries handle transient delivery failures; requests expire instead of falling back to password-only sign-in.

Offline validation uses a stub ITelegramBotClient HTTP transport and a separate PostgreSQL fixture. Never point test workers at the real database or send real test prompts without explicit authorization.

## Telegram workout sharing

Apply `npm run db:auth:migrate` from LeoWeb before restarting LeoBot and LeoWeb. This adds `telegram_chats`, `telegram_chat_managers`, `telegram_workout_preferences`, `telegram_workout_subscriptions` and `workout_telegram_messages`. EF models and Drizzle mappings describe the same shared tables.

Add the bot to a group and promote it to administrator. `my_chat_member` updates record the chat and the Telegram ID of the person who connected it, even before that person registers. The actor is granted management access only after Telegram confirms they are a group administrator. Other administrators (and groups connected before this feature existed) can use `/manage@YourBotUsername` in the group; replace the placeholder with the actual bot username. Anonymous administrator commands cannot establish a personal account link. Manager checks are refreshed in the background; web management requires a check within the last 90 seconds.

Profile → Telegram sharing shows the personal bot chat (enabled by default), incoming group invitations and connected groups the user manages. Managers invite a Telegram-linked user by exact nickname or application user ID, and can remove subscriptions or choose the group's message language. Invitations never enable sharing automatically. The invited owner enables the destination themselves, or declines. Re-inviting an existing subscription does not change that person's consent. Existing profile languages/settings remain independent.

Each successful web workout save atomically queues the latest revision for enabled destinations. There is no separate completed/published flag yet: Save is the upload trigger. Enabling a destination does not backfill old workouts; a future save is required. `WorkoutSharingWorker` sends the results through the bot and records the message ID; later saves edit that same message. Personal messages use the user's language; groups use the configured group language. Summaries start with #nickname and dd.mm.yyyy, then exercise lines such as `Squat 12×3 70kg RIR 2`. Workout titles and ordinary group headings are omitted; repeated groups keep their repetition heading. Consecutive identical sets are compressed immediately after the reps/value, with weight/RIR/time following. Blank results and workout notes are omitted. Very long messages are shortened to fit Telegram.

Disabling a destination cancels queued work and stops future posts/edits. Previous messages remain. Bot removal/demotion disables the group; failed calls use bounded retries and fixed error codes, never raw exception text or message contents. A missing/deleted message is not silently recreated; saving again permits another attempt. Delivery is at least once: a process crash between Telegram accepting a new message and persisting its ID can produce a duplicate because Telegram offers no send idempotency key. An already in-flight API call may finish just as a destination is disabled. Do not run tests against live Telegram; use the isolated database and transport stub.

### Channels

Channels use the same invitations, owner consent, destinations and workout send/edit outbox as groups. The bot must be a channel administrator with `can_post_messages`; losing this right makes the destination unavailable. `my_chat_member` updates discover channel additions and permission changes. Only the Telegram-verified administrator who connects the channel gets management access.

Other administrators or pre-existing channels can connect through a private bot message: `/manage @channelusername` (public channel) or `/manage -1001234567890` (private channel's numeric Telegram chat ID). The bot verifies the sender's administrator status through Telegram before saving access. Channel posts are never treated as personal administrator commands. Refresh Profile → Telegram sharing after connecting. Apply `npm run db:auth:migrate` and restart both apps.

Verified administrators also see their own connected chats under upload destinations, initially off. They can enable their own sharing directly without inviting themselves; other users still require an invitation. Connecting or running `/manage` never enables uploads automatically.

### Telegram deletion and connection notices

Migration 0007 keeps workout message IDs after web deletion. The worker deletes posts in private chats, groups and channels, treating an already missing message as success. Telegram permission/age restrictions can prevent removal; failure status is retained with bounded retries. An in-flight send retains its lease and writes its message ID before deletion proceeds. Workout titles are omitted from message text.

Adding/promoting the bot discovers the destination and all real administrators verified by Telegram, so their linked accounts can opt in without `/manage`. Sharing stays off until enabled. A durable, deduplicated private connection notice goes to the person who added/promoted the bot with the chat title, numeric ID and public @username (or an explicit private-chat label). Telegram must allow the bot to message that user; users should start the bot first. `/manage` remains a fallback for existing chats or missed updates. Sharing controls have a dedicated Profile → Telegram sharing tab (`?tab=telegram`).

Profile navigation uses an icon tab row above the panels. The Telegram tab refreshes destinations every 15 seconds; inactive groups/channels are omitted from both destination and management lists after bot removal or loss of required permissions. Their database records remain for message cleanup and history.
