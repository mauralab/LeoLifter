import Link from "next/link"
import { Dumbbell, Layers3, UserRound, CalendarDays } from "lucide-react"
import { getMessages, type Locale, type Messages } from "@/lib/i18n"
export function TrainingNavigation({
  locale,
  copy,
  current,
}: {
  locale: Locale
  copy: Messages["exercises"]
  current: "exercises" | "profile" | "programs" | "workouts"
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
        href={`/${locale}/programs`}
        prefetch={false}
        aria-current={current === "programs" ? "page" : undefined}
      >
        <Layers3 size={16} aria-hidden="true" />
        {getMessages(locale).programs.title}
      </Link>
      <Link
        href={`/${locale}/workouts`}
        prefetch={false}
        aria-current={current === "workouts" ? "page" : undefined}
      >
        <CalendarDays size={16} aria-hidden="true" />
        {getMessages(locale).workouts.title}
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
