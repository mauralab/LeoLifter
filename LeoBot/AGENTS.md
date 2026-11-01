# LeoBot conventions

- Use DI and the generic host. Keep Telegram transport, update routing and localized message construction separate.
- Tokens belong in environment variables or local secrets. Do not log raw Telegram exceptions or request URLs, which can contain tokens.
- Never send live Telegram messages during tests; use a transport stub unless the user explicitly requests a live send/test.
- Keep English, Ukrainian, Norwegian Bokmål, German and Polish copy aligned. Fall back to English for unsupported Telegram language codes.
- Real auth links must be signed with TelegramLoginLinkFactory using identity from the Telegram update. Keep `#` as an optional welcome-only configuration.
- Future login links must be short-lived, single-use and server verified. Never trust a raw Telegram ID or deep-link payload as proof of identity.
