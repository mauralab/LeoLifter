import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { AuthHandoff } from "@/components/auth/auth-handoff"
import { isLocale } from "@/lib/i18n"
import { verifyTelegramCode } from "@/lib/auth/telegram-link"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "strict-origin",
}
// GET/HEAD and Telegram previews never consume the credential. The browser posts it once.
export default async function AuthCodePage({ params }: {
  params: Promise<{ locale: string; code: string }>
}) {
  const { locale, code } = await params
  if (!isLocale(locale)) notFound()
  try { verifyTelegramCode(code) }
  catch { redirect(`/${locale}/auth/error?reason=invalid`) }
  return <AuthHandoff action="/api/auth/telegram" fields={{ code, locale }} />
}
