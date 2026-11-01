import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { AuthHandoff } from "@/components/auth/auth-handoff"
import { isLocale } from "@/lib/i18n"
import { verifyTelegramLink } from "@/lib/auth/telegram-link"
import { AuthConfigurationError } from "@/lib/auth/errors"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "strict-origin",
}
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  let link
  try {
    link = verifyTelegramLink(await searchParams)
  } catch (error) {
    redirect(
      `/${locale}/auth/error?reason=${error instanceof AuthConfigurationError ? "unavailable" : "invalid"}`
    )
  }
  return (
    <AuthHandoff action="/api/auth/telegram" fields={{ ...link, locale }} />
  )
}
