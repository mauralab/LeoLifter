using Microsoft.Extensions.Configuration;
using Npgsql;

namespace LeoBot.Localization;

public interface ITelegramLanguageStore
{
    Task<string?> GetAsync(long telegramId, CancellationToken ct);
    Task SetAsync(long telegramId, string language, CancellationToken ct);
}

public sealed class TelegramLanguageStore : ITelegramLanguageStore, IDisposable
{
    private readonly NpgsqlDataSource source;
    public TelegramLanguageStore(IConfiguration configuration)
    {
        var connection = configuration.GetConnectionString("LeoDatabase") ?? configuration["LEODATABASE_CONNECTION_STRING"];
        if (string.IsNullOrWhiteSpace(connection))
            throw new InvalidOperationException("Configure ConnectionStrings__LeoDatabase for Telegram language preferences.");
        source = NpgsqlDataSource.Create(connection);
    }
    public async Task<string?> GetAsync(long telegramId, CancellationToken ct)
    {
        await using var command = source.CreateCommand("SELECT l.code FROM telegram_user_preferences p JOIN languages l ON l.id = p.language_id WHERE p.telegram_id = @id");
        command.Parameters.AddWithValue("id", telegramId);
        return await command.ExecuteScalarAsync(ct) as string;
    }
    public async Task SetAsync(long telegramId, string language, CancellationToken ct)
    {
        if (telegramId <= 0 || !LanguagePicker.IsSupported(language)) throw new ArgumentException("Invalid language preference.");
        await using var command = source.CreateCommand("""
            INSERT INTO telegram_user_preferences (telegram_id, language_id)
            SELECT @id, id FROM languages WHERE code = @code
            ON CONFLICT (telegram_id) DO UPDATE SET language_id = EXCLUDED.language_id, updated_at = now()
            """);
        command.Parameters.AddWithValue("id", telegramId);
        command.Parameters.AddWithValue("code", language);
        if (await command.ExecuteNonQueryAsync(ct) != 1)
            throw new InvalidOperationException("Apply the auth migrations to initialize supported languages.");
    }
    public void Dispose() => source.Dispose();
}
