import Link from "next/link"
import Image from "next/image"
import { HeaderPreferences } from "@/components/landing/header-preferences"
import { TrainingNavigation } from "@/components/navigation/training-navigation"
import type { Locale, Messages } from "@/lib/i18n"
export function ExerciseShell({
  locale,
  messages,
  children,
}: {
  locale: Locale
  messages: Messages
  children: React.ReactNode
}) {
  return (
    <main className="account-page exercises-page">
      <header className="account-topbar exercises-topbar">
        <Link className="account-brand" href={`/${locale}`}>
          <Image
            src="/brand/leo-web.png"
            alt="LeoLifter"
            width={46}
            height={54}
          />
          <span>
            LeoLifter<span className="account-brand-dot">.</span>
          </span>
        </Link>
        <TrainingNavigation
          locale={locale}
          copy={messages.exercises}
          current="exercises"
        />
        <HeaderPreferences locale={locale} copy={messages} />
      </header>
      <div className="exercise-container">{children}</div>
    </main>
  )
}
