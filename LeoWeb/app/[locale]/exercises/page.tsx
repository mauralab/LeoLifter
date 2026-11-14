import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getMessages, isLocale } from "@/lib/i18n"
import { ExerciseLibrary } from "@/components/exercises/exercise-library"
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return { title: `LeoLifter — ${getMessages(locale).exercises.title}` }
}
export default async function ExercisesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return <ExerciseLibrary locale={locale} messages={getMessages(locale)} />
}
