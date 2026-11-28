import { AuthHandoff } from "@/components/auth/auth-handoff"
import type { Metadata } from "next"
import { currentUser } from "@/lib/auth/session"
import { listPrograms } from "@/lib/programs/store"
export const dynamic = "force-dynamic"
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
  const user = await currentUser()
  if (!user)
    return (
      <AuthHandoff
        action="/api/auth/refresh"
        fields={{ locale, returnTo: `/${locale}/programs` }}
      />
    )
  const programs = await listPrograms(user.userId,locale)
  return (
    <ProgramWorkspace
      programs={programs}
      key={locale}
      locale={locale}
      messages={getMessages(locale)}
    />
  )
}
