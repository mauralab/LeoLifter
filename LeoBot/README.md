# LeoBot

.NET 10 Telegram entry point for LeoLifter. `/start` and `/help` in a private chat return a short welcome message and a personal, passwordless web sign-in link. Copy supports English, Ukrainian, Norwegian Bokmål, German and Polish using Telegram's language setting.

## Sign-in flow

1. Telegram supplies the private user's ID, username and chat ID to the bot.
2. `TelegramLoginLinkFactory` builds a five-minute link containing `tg_id`, `tg_username`, `chat_id`, `iat`, a cryptographically random nonce and a SHA-256 HMAC signature.
3. The blank web auth page verifies the link and submits a same-origin POST. Link previews and GET requests do not create accounts or consume links.
4. The web server verifies the signature/expiry again and consumes the nonce once, inside the same PostgreSQL transaction that creates or locates the account and issues a session.
5. New accounts use the Telegram username as nickname; users without a Telegram username get `telegram_<id>`. Existing accounts are matched by Telegram ID and preserve their chosen nickname.
6. The browser receives HTTP-only access/refresh cookies and opens its profile, currently showing only the nickname.

Links are bearer credentials: do not share them or log complete URLs. They expire after five minutes; send `/start` again for a fresh one. The bot does not trust identity values from `/start` payloads or arbitrary user text. Database writes and cookie issuance happen only in LeoWeb.

## Configuration

For this local setup, `appsettings.Local.json` was generated from the existing Rider configuration with the matching web secret. It is ignored by Git, copied to the local build output and explicitly excluded from publishing. Environment variables override this local file. In Rider remove any old `Telegram__WebAuthUrl=#` override to enable real sign-in.

For a new setup, copy `appsettings.Local.example.json` to `appsettings.Local.json` and fill it locally, or configure:

```text
Telegram__BotToken=<BotFather token>
Telegram__WebAuthUrl=http://127.0.0.1:3000/en/auth
Telegram__AuthLinkSecret=<same value as LeoWeb TELEGRAM_AUTH_SECRET>
```

The shared secret must contain at least 32 random UTF-8 bytes. Never put it in source control. The bot token is separate from this signing secret. Use an HTTPS public address for real Telegram use, especially on phones: localhost points to the device opening the link, not automatically to the development PC. Set LeoWeb APP_ORIGIN to the same origin (http://127.0.0.1:3000 locally) and restart both apps. Telegram rejects localhost in inline button URLs; use 127.0.0.1 for desktop development. HTTP is accepted only for loopback development URLs; URL query strings/fragments are not allowed in the configured base URL.

Keeping WebAuthUrl as `#` retains the earlier welcome-only behavior with a coming-soon callback instead of a link. A secret is only mandatory when real links are enabled.

Run from the solution directory:

```powershell
dotnet run --project LeoBot
```

Stop with Ctrl+C. Startup checks identity/webhook configuration and starts long polling without unsolicited messages. Use one running polling instance per bot. Existing webhooks are not removed automatically. Group/channel posts, edits and commands addressed to another bot are ignored.

## Structure

- `Configuration/BotOptions.cs`: validated local/environment configuration.
- `Authentication/TelegramLoginLinkFactory.cs`: shared canonical signature protocol.
- `Messages/LandingMessageFactory.cs`: localized copy and keyboard.
- `Handlers/BotUpdateHandler.cs`: private command/callback routing.
- `Hosting/BotWorker.cs`: long polling and sanitized errors.
- `DependencyInjection.cs` / `Program.cs`: host and DI composition.

Workout notifications, statistics, scheduled posts, web-initiated Telegram verification and a full Mini App remain future work. This flow signs users into the web app from a bot message.

## Checks

Build with `dotnet build LeoBot/LeoBot.csproj`. Authentication was verified with .NET-generated links against a separate PostgreSQL fixture and an actual browser, including returning-user login, replay/tamper rejection, refresh rotation and transaction rollback. No real Telegram messages were sent by tests.

## Password sign-in confirmation

LeoWeb now provides nickname/password sign-in at `/{locale}/login`. After validating the password, it queues a five-minute request in the shared database. `PasswordApprovalWorker` sends its localized **Is this you? / Yes / No** prompt. **Yes** approves the initiating browser; **No** rejects that attempt without revoking existing sessions. Compare the request code with the waiting web page. The browser issues its session only after approval; the bot never receives the password or refresh token.

Configure `ConnectionStrings__LeoDatabase` (or `LEODATABASE_CONNECTION_STRING`) for the same PostgreSQL database as LeoWeb. The ignored local JSON has been configured on this PC. Apply `npm run db:auth:migrate` from LeoWeb on new databases before starting. This creates the auth queue and durable login-attempt limits. Without a database connection the bot still provides `/start` but logs that password approvals are disabled.

`Authentication/PasswordApprovalStore.cs` owns queue claiming/decision SQL; `PasswordApprovalService.cs` sends prompts and validates callback context; `Messages/PasswordApprovalMessages.cs` contains five-language text; `Hosting/PasswordApprovalWorker.cs` polls the queue. A callback must match the private Telegram identity, chat, stored message and live pending request. Decisions are atomic and one-way. Buttons are removed after a decision. Bounded retries handle transient delivery failures; requests expire instead of falling back to password-only sign-in.

Offline validation uses a stub ITelegramBotClient HTTP transport and a separate PostgreSQL fixture. Never point test workers at the real database or send real test prompts without explicit authorization.
