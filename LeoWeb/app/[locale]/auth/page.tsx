import { notFound, redirect } from "next/navigation"
import { isLocale } from "@/lib/i18n"

// Old identity-bearing query links are no longer accepted.
export default async function AuthPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  redirect(`/${locale}/auth/error?reason=invalid`)
}
