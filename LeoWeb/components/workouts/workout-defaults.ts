import type { Locale } from "@/lib/i18n"
const dateLocales: Record<Locale, string> = {
  en: "en-GB",
  uk: "uk-UA",
  nb: "nb-NO",
  de: "de-DE",
  pl: "pl-PL",
}
export function workoutDateTime(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant))
  const value = (type: string) => parts.find((p) => p.type === type)!.value
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`
}
export function workoutDefaultName(
  date: string,
  locale: Locale,
  template: string
) {
  const day = date.split("T")[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return ""
  const parsed = new Date(`${day}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return ""
  const formatted = new Intl.DateTimeFormat(dateLocales[locale], {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(parsed)
  return template.replace("{date}", formatted)
}
