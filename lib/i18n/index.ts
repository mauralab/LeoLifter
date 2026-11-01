import en from "./messages/en.json"
import uk from "./messages/uk.json"
import nb from "./messages/nb.json"
import de from "./messages/de.json"
import pl from "./messages/pl.json"

export const locales = ["en", "uk", "nb", "de", "pl"] as const
export type Locale = (typeof locales)[number]
export type Messages = typeof en
export const languages: Record<Locale, string> = {
  en: "English",
  uk: "Українська",
  nb: "Norsk bokmål",
  de: "Deutsch",
  pl: "Polski",
}
const messages: Record<Locale, Messages> = { en, uk, nb, de, pl }
export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value)
}
export function getMessages(locale: Locale): Messages {
  return messages[locale]
}
