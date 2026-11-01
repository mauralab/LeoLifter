import type { Metadata, Viewport } from "next"
import { Outfit } from "next/font/google"
import { notFound } from "next/navigation"
import { getMessages, isLocale, locales } from "@/lib/i18n"
import { ThemeProvider } from "@/components/theme-provider"
import "../globals.css"

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-heading",
})
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f8f2",
}
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const copy = getMessages(locale)
  return {
    title: `LeoLifter — ${copy.metaTitle}`,
    description: copy.metaDescription,
    alternates: {
      languages: Object.fromEntries(
        locales.map((language) => [language, `/${language}`])
      ),
    },
  }
}
export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return (
    <html lang={locale} className={outfit.variable} suppressHydrationWarning>
      <head>
        <script src="/theme-init.js" async />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
