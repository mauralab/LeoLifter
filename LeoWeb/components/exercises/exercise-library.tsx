"use client"
import { exerciseCopy } from "@/lib/exercises/copy"
import { ArrowLeft, Dumbbell, ImageIcon, Plus, Search, X } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ExerciseShell } from "./exercise-shell"
import type { ExerciseData, Language } from "@/lib/exercises/types"
import type { Locale, Messages } from "@/lib/i18n"
export function ExerciseLibrary({
  locale,
  messages,
  items,
  languages,
}: {
  locale: Locale
  messages: Messages
  items: ExerciseData[]
  languages: Language[]
}) {
  const c = exerciseCopy(locale)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [type, setType] = useState("")
  const language = languages.find((l) => l.code === locale)?.id
  const english = languages.find((l) => l.code === "en")?.id
  const text = (e: ExerciseData) =>
    e.translations.find((t) => t.languageId === language) ??
    e.translations.find((t) => t.languageId === english) ?? {
      title: e.name,
      description: e.description,
    }
  const filtered = items.filter(
    (e) =>
      (!type || e.type === type) &&
      [
        e.name,
        e.description,
        ...e.translations.flatMap((t) => [t.title, t.description]),
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase())
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 12))
  const current = Math.min(page, pages)
  return (
    <ExerciseShell locale={locale} messages={messages}>
      <Link className="account-back" href={`/${locale}`}>
        <ArrowLeft size={15} />
        {messages.account.back}
      </Link>
      <div className="exercise-intro">
        <div>
          <p className="account-eyebrow">{messages.exercises.eyebrow}</p>
          <h1>{messages.exercises.title}</h1>
          <p>{messages.exercises.intro}</p>
        </div>
        <Link
          className="account-primary exercise-create-link"
          href={`/${locale}/exercises/create`}
        >
          <Plus size={16} aria-hidden="true" />
          {messages.exerciseEditor.create}
        </Link>
      </div>
      <div className="exercise-toolbar">
        <div className="exercise-search">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            aria-label={messages.exercises.search}
            placeholder={messages.exercises.searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
          {query && (
            <button
              type="button"
              aria-label={messages.exercises.clearSearch}
              onClick={() => {
                setQuery("")
                setPage(1)
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="exercise-filters" role="group" aria-label={c.type}>
          <button
            type="button"
            aria-pressed={type === ""}
            onClick={() => {
              setType("")
              setPage(1)
            }}
          >
            {messages.exercises.all}
          </button>
          {(["repetitions", "distance", "duration"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => {
                setType(t)
                setPage(1)
              }}
            >
              {c[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="exercise-results" role="status" aria-live="polite">
        {messages.exercises.showing
          .replace(
            "{shown}",
            String(
              Math.min(12, Math.max(0, filtered.length - (current - 1) * 12))
            )
          )
          .replace("{total}", String(filtered.length))}
      </div>
      <div className="exercise-grid">
        {filtered.slice((current - 1) * 12, current * 12).map((e) => {
          const t = text(e)
          const media = e.media.flatMap((m) =>
            m.translations.map((t) => ({ ...t, type: m.type }))
          )
          const image =
            media.find(
              (m) => m.type === "image" && m.languageId === language
            ) ?? media.find((m) => m.type === "image")
          return (
            <Link
              className="exercise-card"
              key={e.id}
              href={`/${locale}/exercises/${e.id}`}
            >
              <div className="exercise-image-placeholder">
                <span className="exercise-muscle">{c[e.type]}</span>
                {image ? (
                  <Image
                    unoptimized
                    width={720}
                    height={450}
                    src={image.url}
                    alt={image.altText || t.title}
                    loading="lazy"
                  />
                ) : (
                  <div className="exercise-image-label">
                    <ImageIcon size={30} strokeWidth={1.1} aria-hidden="true" />
                    <span>{messages.exercises.image}</span>
                  </div>
                )}
              </div>
              <div className="exercise-card-content">
                <h2>{t.title}</h2>
                <p>{t.description}</p>
                <div className="exercise-card-footer">
                  <Dumbbell size={15} aria-hidden="true" />
                  <span>
                    {[
                      e.includesOwnWeight && c.ownWeight,
                      e.includesAdditionalWeight && c.additionalWeight,
                    ]
                      .filter(Boolean)
                      .join(" · ") || c[e.type]}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
      {!filtered.length && (
        <div className="exercise-empty">
          <Search size={30} strokeWidth={1.3} aria-hidden="true" />
          <h2>{messages.exercises.emptyTitle}</h2>
          <p>{messages.exercises.emptyBody}</p>
          <button
            className="account-secondary"
            onClick={() => {
              setQuery("")
              setType("")
              setPage(1)
            }}
          >
            {messages.exercises.reset}
          </button>
        </div>
      )}
      <nav className="crud-actions" aria-label="Pagination">
        <button disabled={current === 1} onClick={() => setPage(current - 1)}>
          ←
        </button>
        <span>
          {current} / {pages}
        </span>
        <button
          disabled={current === pages}
          onClick={() => setPage(current + 1)}
        >
          →
        </button>
      </nav>
    </ExerciseShell>
  )
}
