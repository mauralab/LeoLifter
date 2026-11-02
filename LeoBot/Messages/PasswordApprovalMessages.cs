using LeoBot.Authentication;
using Telegram.Bot.Types.ReplyMarkups;

namespace LeoBot.Messages;

public sealed record ApprovalCopy(string Prompt, string Yes, string No, string Approved, string Denied, string Unavailable);
public static class PasswordApprovalMessages
{
    public static ApprovalCopy Get(string? locale) => locale?.Split('-', '_')[0].ToLowerInvariant() switch
    {
        "uk" => new("Це ти входиш у LeoLifter?\n\nПристрій: {0}\nЧас (UTC): {1}\nКод: {2}\n\nПорівняй код на сторінці входу. Підтверджуй лише свій запит. Запит діє 5 хвилин.", "Так, це я", "Ні, заборонити", "Вхід підтверджено. Повернись до браузера.", "Спробу входу заблоковано. Сеанс не створено.", "Запит застарів, уже оброблений або недоступний."),
        "nb" or "no" => new("Er det du som logger inn på LeoLifter?\n\nEnhet: {0}\nTid (UTC): {1}\nKode: {2}\n\nSammenlign koden med innloggingssiden. Godkjenn bare din egen forespørsel. Gyldig i 5 minutter.", "Ja, det er meg", "Nei, blokker", "Innlogging godkjent. Gå tilbake til nettleseren.", "Innloggingsforsøket er blokkert. Ingen økt ble opprettet.", "Forespørselen er utløpt, allerede behandlet eller utilgjengelig."),
        "de" => new("Meldest du dich gerade bei LeoLifter an?\n\nGerät: {0}\nZeit (UTC): {1}\nCode: {2}\n\nVergleiche den Code mit der Anmeldeseite. Bestätige nur deine eigene Anfrage. Gültig für 5 Minuten.", "Ja, das bin ich", "Nein, blockieren", "Anmeldung bestätigt. Kehre zum Browser zurück.", "Anmeldeversuch blockiert. Es wurde keine Sitzung erstellt.", "Die Anfrage ist abgelaufen, bereits bearbeitet oder nicht verfügbar."),
        "pl" => new("Czy to Ty logujesz się do LeoLifter?\n\nUrządzenie: {0}\nCzas (UTC): {1}\nKod: {2}\n\nPorównaj kod ze stroną logowania. Zatwierdzaj tylko własne żądanie. Ważne przez 5 minut.", "Tak, to ja", "Nie, zablokuj", "Logowanie zatwierdzone. Wróć do przeglądarki.", "Próba logowania zablokowana. Nie utworzono sesji.", "Żądanie wygasło, zostało już obsłużone lub jest niedostępne."),
        _ => new("Is this you signing in to LeoLifter?\n\nDevice: {0}\nTime (UTC): {1}\nCode: {2}\n\nCompare the code with the sign-in page. Only approve your own request. Expires in 5 minutes.", "Yes, it’s me", "No, block it", "Sign-in approved. Return to your browser.", "Sign-in attempt blocked. No session was created.", "This request expired, was already handled, or is unavailable.")
    };
    public static (string Text, InlineKeyboardMarkup Keyboard) Create(PasswordApproval request)
    {
        var copy = Get(request.Locale);
        var text = string.Format(System.Globalization.CultureInfo.InvariantCulture, copy.Prompt, request.Device, request.CreatedAt.ToUniversalTime().ToString("yyyy-MM-dd HH:mm"), request.Id[..6].ToUpperInvariant());
        return (text, new InlineKeyboardMarkup(new[] {
            InlineKeyboardButton.WithCallbackData(copy.Yes, "login:y:" + request.Id),
            InlineKeyboardButton.WithCallbackData(copy.No, "login:n:" + request.Id)
        }));
    }
}
