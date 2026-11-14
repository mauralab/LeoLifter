"use client"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Dumbbell, ImageIcon, Plus, Search, X } from "lucide-react"
import { HeaderPreferences } from "@/components/landing/header-preferences"
import { TrainingNavigation } from "@/components/navigation/training-navigation"
import {
  muscleGroups,
  sampleExercises,
  type MuscleGroup,
} from "@/lib/exercises/sample-exercises"
import type { Locale, Messages } from "@/lib/i18n"
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
export function ExerciseLibrary({
  locale,
  messages,
}: {
  locale: Locale
  messages: Messages
}) {
  const t = messages.exercises
  const [query, setQuery] = useState("")
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all")
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean)
  const visible = sampleExercises.filter((exercise) => {
    const text = normalize(
      [
        t.items[exercise.id].name,
        t.muscles[exercise.muscle],
        t.equipment[exercise.equipment],
      ].join(" ")
    )
    return (
      (muscle === "all" || exercise.muscle === muscle) &&
      terms.every((term) => text.includes(term))
    )
  })
  return (
    <main className="account-page exercises-page">
      <header className="account-topbar exercises-topbar">
        <Link className="account-brand" href={`/${locale}`}>
          <Image src="/brand/leo-web.png" alt="" width={46} height={54} />
          <span>
            LeoLifter<span className="account-brand-dot">.</span>
          </span>
        </Link>
        <TrainingNavigation locale={locale} copy={t} current="exercises" />
        <HeaderPreferences locale={locale} copy={messages} />
      </header>
      <div className="exercise-container">
        <Link className="account-back" href={`/${locale}`}>
          <ArrowLeft size={15} aria-hidden="true" />
          {messages.account.back}
        </Link>
        <div className="exercise-intro">
          <div>
            <p className="account-eyebrow">{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
          </div>
          <div className="exercise-intro-actions">
            <span className="exercise-sample">
              <span />
              {t.sample}
            </span>
            <Link
              className="account-primary exercise-create-link"
              href={`/${locale}/exercises/create`}
            >
              <Plus size={16} aria-hidden="true" />
              {messages.exerciseEditor.create}
            </Link>
          </div>
        </div>
        <div className="exercise-toolbar">
          <label htmlFor="exercise-search" className="sr-only">
            {t.search}
          </label>
          <div className="exercise-search">
            <Search size={19} aria-hidden="true" />
            <input
              id="exercise-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                aria-label={t.clearSearch}
                onClick={() => setQuery("")}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="exercise-filters" role="group" aria-label={t.title}>
            <button
              type="button"
              aria-pressed={muscle === "all"}
              onClick={() => setMuscle("all")}
            >
              {t.all}
            </button>
            {muscleGroups.map((group) => (
              <button
                key={group}
                type="button"
                aria-pressed={muscle === group}
                onClick={() => setMuscle(group)}
              >
                {t.muscles[group]}
              </button>
            ))}
          </div>
        </div>
        <div className="exercise-results" role="status" aria-live="polite">
          {t.showing
            .replace("{shown}", String(visible.length))
            .replace("{total}", String(sampleExercises.length))}
        </div>
        {visible.length ? (
          <div className="exercise-grid">
            {visible.map((exercise) => (
              <article
                className="exercise-card"
                key={exercise.id}
                aria-labelledby={`exercise-${exercise.id}`}
              >
                <div className="exercise-image-placeholder">
                  <span className="exercise-muscle">
                    {t.muscles[exercise.muscle]}
                  </span>
                  <div className="exercise-image-label">
                    <ImageIcon size={30} strokeWidth={1.1} aria-hidden="true" />
                    <span>{t.image}</span>
                  </div>
                </div>
                <div className="exercise-card-content">
                  <h2 id={`exercise-${exercise.id}`}>
                    {t.items[exercise.id].name}
                  </h2>
                  <p>{t.items[exercise.id].description}</p>
                  <div className="exercise-card-footer">
                    <Dumbbell size={15} aria-hidden="true" />
                    <span>{t.equipment[exercise.equipment]}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="exercise-empty">
            <Search size={30} strokeWidth={1.3} aria-hidden="true" />
            <h2>{t.emptyTitle}</h2>
            <p>{t.emptyBody}</p>
            <button
              className="account-secondary"
              onClick={() => {
                setQuery("")
                setMuscle("all")
              }}
            >
              {t.reset}
            </button>
          </div>
        )}
        <p className="exercise-demo-note">{t.sampleNote}</p>
      </div>
    </main>
  )
}
