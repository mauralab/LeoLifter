using LeoBot.Authentication;
using LeoBot.Configuration;
using Microsoft.Extensions.Options;
using Telegram.Bot.Types.ReplyMarkups;

namespace LeoBot.Messages;

public sealed record LandingCopy(string Text, string Button, string ComingSoon);
public sealed record LandingMessage(string Text, InlineKeyboardMarkup Keyboard);

public sealed class LandingMessageFactory(IOptions<BotOptions> options, TelegramLoginLinkFactory links)
{
    public const string AuthPlaceholderCallback = "auth:coming-soon";

    public LandingMessage Create(string? languageCode, long telegramId, string? username, long chatId)
    {
        var copy = GetCopy(languageCode);
        var button = options.Value.HasAuthUrl
            ? InlineKeyboardButton.WithUrl(copy.Button, links.Create(telegramId, username, chatId))
            : InlineKeyboardButton.WithCallbackData(copy.Button, AuthPlaceholderCallback);
        var text = options.Value.HasAuthUrl ? ActiveText(languageCode) : copy.Text;
        return new(text, new InlineKeyboardMarkup(button));
    }

    private static string ActiveText(string? languageCode) => languageCode?.Split('-', '_')[0].ToLowerInvariant() switch
    {
        "uk" => "<b>Вітаємо в LeoLifter! 💪</b>\n\nНатисни кнопку, щоб увійти через Telegram без пароля. Якщо акаунта ще немає, ми створимо його з твоїм Telegram-іменем.\n\nПосилання одноразове й діє 5 хвилин. Не передавай його іншим. Для нового посилання надішли /start.",
        "nb" or "no" => "<b>Velkommen til LeoLifter! 💪</b>\n\nTrykk på knappen for å logge inn via Telegram uten passord. Hvis du ikke har en konto, oppretter vi en med Telegram-brukernavnet ditt.\n\nLenken kan brukes én gang og er gyldig i 5 minutter. Ikke del den. Send /start for en ny lenke.",
        "de" => "<b>Willkommen bei LeoLifter! 💪</b>\n\nMelde dich über die Schaltfläche ohne Passwort mit Telegram an. Falls noch kein Konto existiert, erstellen wir eines mit deinem Telegram-Benutzernamen.\n\nDer Link gilt 5 Minuten und nur einmal. Teile ihn nicht. Mit /start erhältst du einen neuen Link.",
        "pl" => "<b>Witaj w LeoLifter! 💪</b>\n\nNaciśnij przycisk, aby zalogować się przez Telegram bez hasła. Jeśli nie masz konta, utworzymy je z Twoją nazwą użytkownika Telegram.\n\nLink jest jednorazowy i ważny przez 5 minut. Nie udostępniaj go. Wyślij /start, aby dostać nowy link.",
        _ => "<b>Welcome to LeoLifter! 💪</b>\n\nTap below to sign in with Telegram, without a password. If you’re new, we’ll create an account using your Telegram username.\n\nThis single-use link expires in 5 minutes. Don’t share it. Send /start for a new link."
    };

    public static LandingCopy GetCopy(string? languageCode) => languageCode?.Split('-', '_')[0].ToLowerInvariant() switch
    {
        "uk" => new("""
            <b>Вітаємо в LeoLifter! 💪</b>
            Твої тренувальні програми, результати та статистика — в одному місці.

            <b>Вхід без пароля</b>
            Згодом ти зможеш відкрити вебзастосунок кнопкою нижче та підтвердити свою особу через Telegram, щоб створити акаунт або увійти.

            🚧 Авторизація ще в розробці. Зараз це лише знайомство з ботом.
            """, "🌐 Відкрити LeoLifter", "Вхід через Telegram незабаром з’явиться. Зараз це кнопка-заглушка."),
        "nb" or "no" => new("""
            <b>Velkommen til LeoLifter! 💪</b>
            Treningsprogrammer, resultater og statistikk på ett sted.

            <b>Logg inn uten passord</b>
            Etter hvert kan du åpne nettappen med knappen nedenfor og bekrefte identiteten din via Telegram for å opprette en konto eller logge inn.

            🚧 Innlogging er under utvikling. Dette er foreløpig en introduksjon til boten.
            """, "🌐 Åpne LeoLifter", "Telegram-innlogging kommer snart. Knappen er foreløpig en plassholder."),
        "de" => new("""
            <b>Willkommen bei LeoLifter! 💪</b>
            Trainingspläne, Ergebnisse und Statistiken an einem Ort.

            <b>Anmelden ohne Passwort</b>
            Bald kannst du über die Schaltfläche unten die Web-App öffnen und deine Identität über Telegram bestätigen, um ein Konto zu erstellen oder dich anzumelden.

            🚧 Die Anmeldung ist noch in Entwicklung. Dies ist vorerst eine Einführung in den Bot.
            """, "🌐 LeoLifter öffnen", "Die Telegram-Anmeldung kommt bald. Diese Schaltfläche ist vorerst ein Platzhalter."),
        "pl" => new("""
            <b>Witaj w LeoLifter! 💪</b>
            Plany treningowe, wyniki i statystyki w jednym miejscu.

            <b>Logowanie bez hasła</b>
            W przyszłości przycisk poniżej otworzy aplikację, w której potwierdzisz swoją tożsamość przez Telegram, aby utworzyć konto lub się zalogować.

            🚧 Logowanie jest w przygotowaniu. Na razie to tylko wprowadzenie do bota.
            """, "🌐 Otwórz LeoLifter", "Logowanie przez Telegram pojawi się wkrótce. Na razie ten przycisk jest przykładowy."),
        _ => new("""
            <b>Welcome to LeoLifter! 💪</b>
            Your workout programs, results and statistics in one place.

            <b>Sign in without a password</b>
            Soon, you’ll be able to open the web app below and confirm your identity through Telegram to create an account or sign in.

            🚧 Sign-in is still in development. For now, this is an introduction to the bot.
            """, "🌐 Open LeoLifter", "Telegram sign-in is coming soon. This button is a placeholder for now.")
    };
}
