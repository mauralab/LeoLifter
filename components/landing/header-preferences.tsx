"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { ChevronDown, Moon, Sun } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  isLocale,
  languages,
  locales,
  type Locale,
  type Messages,
} from "@/lib/i18n"

function Flag({ locale }: { locale: Locale }) {
  return (
    <svg
      className="locale-flag"
      data-flag={
        locale === "en"
          ? "gb"
          : locale === "nb"
            ? "no"
            : locale === "uk"
              ? "ua"
              : locale
      }
      viewBox="0 0 30 20"
      aria-hidden="true"
    >
      {locale === "en" ? (
        <>
          <path fill="#012169" d="M0 0h30v20H0z" />
          <path d="m0 0 30 20M30 0 0 20" stroke="#fff" strokeWidth="5" />
          <path d="m0 0 30 20M30 0 0 20" stroke="#c8102e" strokeWidth="2" />
          <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="7" />
          <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="4" />
        </>
      ) : locale === "uk" ? (
        <>
          <path fill="#0057b7" d="M0 0h30v10H0z" />
          <path fill="#ffd700" d="M0 10h30v10H0z" />
        </>
      ) : locale === "nb" ? (
        <>
          <path fill="#ba0c2f" d="M0 0h30v20H0z" />
          <path d="M10 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
          <path d="M10 0v20M0 10h30" stroke="#00205b" strokeWidth="3" />
        </>
      ) : locale === "de" ? (
        <>
          <path fill="#181818" d="M0 0h30v7H0z" />
          <path fill="#d00" d="M0 7h30v6H0z" />
          <path fill="#ffce00" d="M0 13h30v7H0z" />
        </>
      ) : (
        <>
          <path fill="#fff" d="M0 0h30v10H0z" />
          <path fill="#dc143c" d="M0 10h30v10H0z" />
        </>
      )}
    </svg>
  )
}

export function HeaderPreferences({
  locale,
  copy,
}: {
  locale: Locale
  copy: Messages
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <div className="header-preferences">
      <button
        className="theme-toggle"
        type="button"
        aria-label={copy.themeToggle}
        title={copy.themeToggle}
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        <Moon className="theme-moon" size={17} aria-hidden="true" />
        <Sun className="theme-sun" size={17} aria-hidden="true" />
      </button>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          className="language-trigger"
          aria-label={`${copy.language}: ${languages[locale]}`}
        >
          <Flag locale={locale} />
          <span>{languages[locale]}</span>
          <ChevronDown size={12} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="locale-menu" align="end" sideOffset={8}>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(value) => {
              if (isLocale(value)) {
                setOpen(false)
                router.push(`/${value}`)
              }
            }}
          >
            {locales.map((language) => (
              <DropdownMenuRadioItem
                className="locale-option"
                value={language}
                key={language}
              >
                <Flag locale={language} />
                <span lang={language}>{languages[language]}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
