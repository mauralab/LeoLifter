import { listPrograms } from "@/lib/programs/store"
import { eq } from "drizzle-orm"
import { currentUser } from "@/lib/auth/session"
import { getDb } from "@/lib/db"
import { users, userSettings, userProfiles } from "@/lib/db/schema"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getMessages, isLocale } from "@/lib/i18n"
import { exerciseList, languageList } from "@/lib/exercises/store"
import { WorkoutEditor } from "@/components/workouts/workout-editor"
export const dynamic = "force-dynamic"
type Props = { params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return { title: `LeoLifter — ${getMessages(locale).workouts.editorTitle}` }
}
export default async function Page({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const initialInstant = new Date().toISOString()
  const user = await currentUser()
  const preferences = user
    ? (
        await getDb()
          .select({
            language: userSettings.language,
            timezone: userProfiles.timezone,
          })
          .from(users)
          .leftJoin(userSettings, eq(userSettings.userId, users.id))
          .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
          .where(eq(users.id, BigInt(user.userId)))
          .limit(1)
      )[0]
    : undefined
  const primaryLocale =
    preferences?.language && isLocale(preferences.language)
      ? preferences.language
      : locale
  let preferredTimezone: string | undefined
  if (preferences?.timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: preferences.timezone }).format()
      preferredTimezone = preferences.timezone
    } catch {
      /* Fall back to the browser's local timezone. */
    }
  }
  const [exercises, languages, programs] = await Promise.all([
    exerciseList(),
    languageList(),
    user ? listPrograms(user.userId,locale) : Promise.resolve([]),
  ])
  const local = languages.find((l) => l.code === locale)?.id,
    english = languages.find((l) => l.code === "en")?.id
  const catalog = exercises.map((e) => {
    const text =
      e.translations.find((t) => t.languageId === local) ??
      e.translations.find((t) => t.languageId === english)
    return {
      id: e.id,
      name: text?.title || e.name,
      description: text?.description || e.description,
      type: e.type,
      includesOwnWeight: e.includesOwnWeight,
      includesAdditionalWeight: e.includesAdditionalWeight,
    }
  })
  return (
    <WorkoutEditor
      username={user?.nickname ?? ""}
      programs={programs}
      signedIn={!!user}
      initialInstant={initialInstant}
      primaryLocale={primaryLocale}
      defaultNameTemplate={getMessages(primaryLocale).workouts.defaultName}
      preferredTimezone={preferredTimezone}
      key={locale}
      locale={locale}
      messages={getMessages(locale)}
      catalog={catalog}
    />
  )
}
