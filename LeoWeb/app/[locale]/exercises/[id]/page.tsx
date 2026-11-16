import { notFound, redirect } from "next/navigation"
import { currentUser } from "@/lib/auth/session"
import { exerciseList, languageList, validId } from "@/lib/exercises/store"
import { getMessages, isLocale } from "@/lib/i18n"
import { ExerciseEditor } from "@/components/exercises/exercise-editor"
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  if (!isLocale(locale) || !validId(id)) notFound()
  if (!(await currentUser())) redirect(`/${locale}/login`)
  const initial = (await exerciseList()).find((e) => e.id === id)
  if (!initial) notFound()
  return (
    <ExerciseEditor
      locale={locale}
      messages={getMessages(locale)}
      languages={await languageList()}
      initial={initial}
    />
  )
}
