import { notFound } from "next/navigation"
import Link from "next/link"
import { isLocale } from "@/lib/i18n"

export const dynamic = "force-dynamic"
const copy = {
  en: {
    title: "Let’s try that again.",
    body: "This sign-in link may have expired or already been used. Send /start to the bot for a new link.",
    unavailable:
      "Sign-in is temporarily unavailable. Check the server configuration and database connection, then try again.",
    home: "Back to LeoLifter",
  },
  uk: {
    title: "Спробуймо ще раз.",
    body: "Посилання могло застаріти або вже бути використаним. Надішли боту /start, щоб отримати нове.",
    unavailable:
      "Вхід тимчасово недоступний. Перевір налаштування сервера та з’єднання з базою даних.",
    home: "До LeoLifter",
  },
  nb: {
    title: "La oss prøve igjen.",
    body: "Lenken kan være utløpt eller allerede brukt. Send /start til boten for en ny lenke.",
    unavailable:
      "Innlogging er midlertidig utilgjengelig. Kontroller serveroppsettet og databasetilkoblingen.",
    home: "Tilbake til LeoLifter",
  },
  de: {
    title: "Versuchen wir es noch einmal.",
    body: "Der Link ist möglicherweise abgelaufen oder bereits verwendet. Sende /start an den Bot, um einen neuen Link zu erhalten.",
    unavailable:
      "Die Anmeldung ist vorübergehend nicht verfügbar. Prüfe Serverkonfiguration und Datenbankverbindung.",
    home: "Zurück zu LeoLifter",
  },
  pl: {
    title: "Spróbujmy jeszcze raz.",
    body: "Link mógł wygasnąć lub został już użyty. Wyślij /start do bota, aby otrzymać nowy.",
    unavailable:
      "Logowanie jest chwilowo niedostępne. Sprawdź konfigurację serwera i połączenie z bazą danych.",
    home: "Wróć do LeoLifter",
  },
}
export default async function AuthErrorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ reason?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const messages = copy[locale]
  const { reason } = await searchParams
  return (
    <main className="auth-message">
      <h1>{messages.title}</h1>
      <p>{reason === "unavailable" ? messages.unavailable : messages.body}</p>
      <Link href={`/${locale}`}>{messages.home}</Link>
    </main>
  )
}
