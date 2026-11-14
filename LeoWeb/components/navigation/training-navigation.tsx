import Link from "next/link"
import { Dumbbell, UserRound } from "lucide-react"
import type { Locale, Messages } from "@/lib/i18n"
export function TrainingNavigation({
  locale,
  copy,
  current,
}: {
  locale: Locale
  copy: Messages["exercises"]
  current: "exercises" | "profile"
}) {
  return (
    <nav className="training-navigation" aria-label={copy.navigation}>
      <Link
        href={`/${locale}/exercises`}
        aria-current={current === "exercises" ? "page" : undefined}
      >
        <Dumbbell size={16} aria-hidden="true" />
        {copy.title}
      </Link>
      <Link
        href={`/${locale}/profile`}
        prefetch={false}
        aria-current={current === "profile" ? "page" : undefined}
      >
        <UserRound size={16} aria-hidden="true" />
        {copy.profile}
      </Link>
    </nav>
  )
}
