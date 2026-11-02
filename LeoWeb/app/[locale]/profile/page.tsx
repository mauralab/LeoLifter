import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { currentUser } from "@/lib/auth/session"
import { AuthHandoff } from "@/components/auth/auth-handoff"
import { getMessages, isLocale } from "@/lib/i18n"
import { loadProfile } from "@/lib/profile/store"
import { ProfileWorkspace } from "@/components/profile/profile-workspace"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { robots: { index: false, follow: false } }
export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const user = await currentUser()
  if (!user)
    return <AuthHandoff action="/api/auth/refresh" fields={{ locale }} />
  const query = await searchParams
  const page =
    typeof query.page === "string" && /^[1-9][0-9]{0,5}$/.test(query.page)
      ? Number(query.page)
      : 1
  const tab =
    query.tab === "settings" ||
    query.tab === "password" ||
    query.tab === "sessions"
      ? query.tab
      : "profile"
  const data = await loadProfile(user, page)
  return (
    <ProfileWorkspace
      key={`${locale}:${data.page}:${tab}`}
      data={data}
      locale={locale}
      messages={getMessages(locale)}
      initialTab={tab}
      timezones={Intl.supportedValuesOf("timeZone")}
      today={new Date().toISOString().slice(0, 10)}
    />
  )
}
