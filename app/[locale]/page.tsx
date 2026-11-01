import { notFound } from "next/navigation"
import { LandingPage } from "@/components/landing/landing-page"
import { getMessages, isLocale } from "@/lib/i18n"

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return <LandingPage locale={locale} copy={getMessages(locale)} />
}
