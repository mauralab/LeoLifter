import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProgramWorkspace } from "@/components/programs/program-workspace"
import { getMessages, isLocale } from "@/lib/i18n"
type Props = { params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return { title: `LeoLifter — ${getMessages(locale).programs.title}` }
}
export default async function Page({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return (
    <ProgramWorkspace
      key={locale}
      locale={locale}
      messages={getMessages(locale)}
    />
  )
}
