import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { isLocale, getMessages } from "@/lib/i18n"
import { currentUser } from "@/lib/auth/session"
import { PasswordLoginForm } from "@/components/auth/password-login-form"
export const dynamic = "force-dynamic"
export const metadata: Metadata = { robots: { index: false, follow: false } }
export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  if (await currentUser()) redirect(`/${locale}/profile`)
  return (
    <PasswordLoginForm
      key={locale}
      locale={locale}
      messages={getMessages(locale)}
    />
  )
}
