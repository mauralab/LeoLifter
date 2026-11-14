import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getMessages, isLocale } from "@/lib/i18n"
import { ExerciseEditor } from "@/components/exercises/exercise-editor"
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return { title: `LeoLifter — ${getMessages(locale).exerciseEditor.create}` }
}
export default async function CreateExercisePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return (
    <ExerciseEditor
      key={locale}
      locale={locale}
      messages={getMessages(locale)}
    />
  )
}
