import { exerciseList, languageList } from "@/lib/exercises/store"
export const dynamic = "force-dynamic"
import type { Metadata } from "next"
import { currentUser } from "@/lib/auth/session"
import { loadProgram, ProgramError } from "@/lib/programs/store"
import { AuthHandoff } from "@/components/auth/auth-handoff"
import { notFound } from "next/navigation"
import { ProgramWorkspace } from "@/components/programs/program-workspace"
import { getMessages, isLocale } from "@/lib/i18n"
type Props = { params: Promise<{ locale: string; id?: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  if (!isLocale(locale)) notFound()
  return {
    title: `LeoLifter — ${getMessages(locale).programs[id ? "edit" : "create"]}`,
  }
}
export default async function Page({ params }: Props) {
  const { locale, id } = await params
  if (!isLocale(locale)) notFound()
  const user = await currentUser()
  if (!user)
    return (
      <AuthHandoff
        action="/api/auth/refresh"
        fields={{
          locale,
          returnTo: id
            ? `/${locale}/programs/${id}/edit`
            : `/${locale}/programs/create`,
        }}
      />
    )
  let initialProgram
  if (id) {
    if (
      !/^[1-9]\d{0,18}$/.test(id) ||
      BigInt(id) > BigInt("9223372036854775807")
    )
      notFound()
    try {
      initialProgram = await loadProgram(id, user.userId)
    } catch (e) {
      if (e instanceof ProgramError && e.status === 404) notFound()
      throw e
    }
  }
  const [exercises, languages] = await Promise.all([
    exerciseList(),
    languageList(),
  ])
  const localId = languages.find((l) => l.code === locale)?.id,
    englishId = languages.find((l) => l.code === "en")?.id
  const catalog = exercises.map((e) => ({
    id: e.id,
    name:
      (
        e.translations.find((t) => t.languageId === localId) ??
        e.translations.find((t) => t.languageId === englishId)
      )?.title || e.name,
    type: e.type,
    description:
      (
        e.translations.find((t) => t.languageId === localId) ??
        e.translations.find((t) => t.languageId === englishId)
      )?.description || e.description,
    includesOwnWeight: e.includesOwnWeight,
    includesAdditionalWeight: e.includesAdditionalWeight,
  }))
  return (
    <ProgramWorkspace
      initialProgram={initialProgram}
      catalog={catalog}
      key={locale}
      locale={locale}
      messages={getMessages(locale)}
      editing
    />
  )
}
