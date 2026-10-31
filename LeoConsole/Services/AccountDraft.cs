using System.Globalization;
using LeoCore.Models.Personal;
using LeoDatabase.Models.Personal;

namespace LeoConsole.Services;

public static class FieldValue
{
    public static string Format(object? value) => value switch
    {
        null => "", DateOnly date => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        DateTime date => date.ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
        IFormattable formatted => formatted.ToString(null, CultureInfo.InvariantCulture), _ => value.ToString() ?? ""
    };
    public static object? Parse(string text, Type type, bool nullable)
    {
        if (string.IsNullOrWhiteSpace(text) && nullable) return null;
        type = Nullable.GetUnderlyingType(type) ?? type;
        try
        {
            if (type == typeof(string)) return text;
            if (type == typeof(DateOnly)) return DateOnly.ParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture);
            if (type == typeof(DateTime)) return DateTime.ParseExact(text, "yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal);
            if (type.IsEnum)
            {
                var value = Enum.Parse(type, text, true);
                if (!Enum.IsDefined(type, value)) throw new FormatException();
                return value;
            }
            return Convert.ChangeType(text, type, CultureInfo.InvariantCulture);
        }
        catch (Exception error) when (error is FormatException or ArgumentException or OverflowException)
        { throw new ArgumentException($"Invalid {type.Name} value. Dates: yyyy-MM-dd; UTC timestamps: yyyy-MM-dd HH:mm:ss."); }
    }
}

public sealed record AccountDraft(string Nickname, ProfileDetails Profile, SettingsDetails Settings);
public interface IAccountService
{
    Task<AccountDraft> LoadAsync(long userId, CancellationToken ct);
    Task<long> SaveAsync(long? userId, AccountDraft draft, CancellationToken ct);
}
