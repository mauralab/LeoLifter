import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { currentUser } from "@/lib/auth/session"
import { AuthHandoff } from "@/components/auth/auth-handoff"
import { isLocale } from "@/lib/i18n"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { robots: { index: false, follow: false } }
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const user = await currentUser()
  if (!user)
    return <AuthHandoff action="/api/auth/refresh" fields={{ locale }} />
  return (
    <main className="profile-page">
      <h1>{user.nickname}</h1>
    </main>
  )
}
