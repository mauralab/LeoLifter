"use client"
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Locale, Messages } from "@/lib/i18n"
import type { SavedWorkout } from "@/lib/workouts/validation"
type Entry = { id: string; title: string; date: string }
export function WorkoutCalendar({
  locale,
  month,
  day,
  onMonthChange,
  onDayChange,
  query,
  copy,
  onSelect,
}: {
  locale: Locale
  month: string
  day: string
  onMonthChange: (month: string) => void
  onDayChange: (day: string) => void
  query: string
  copy: Messages
  onSelect: (item: SavedWorkout) => void
}) {
  const t = copy.workouts
  const [loadedFor, setLoadedFor] = useState(""),
    [items, setItems] = useState<Entry[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [opening, setOpening] = useState(false)
  const language = {
    en: "en-GB",
    uk: "uk-UA",
    nb: "nb-NO",
    de: "de-DE",
    pl: "pl-PL",
  }[locale]
  useEffect(() => {
    let active = true
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 30000),
      delay = setTimeout(() => {
        fetch(`/api/workouts?month=${month}&q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: controller.signal,
        })
          .then(async (response) => {
            if (!response.ok) throw new Error()
            return response.json()
          })
          .then((data) => {
            if (active) {
              setItems(data.items)
              setLoadedFor(month + ":" + query)
              setLoading(false)
            }
          })
          .catch(() => {
            if (active) {
              setError(t.loadWorkoutsError)
              setLoadedFor(month + ":" + query)
              setLoading(false)
            }
          })
      }, 200)
    return () => {
      active = false
      clearTimeout(delay)
      clearTimeout(timeout)
      controller.abort()
    }
  }, [month, query, attempt, t])
  // Selection only reads a full draft when the user opens a workout.
  async function open(id: string) {
    setOpening(true)
    setError("")
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const r = await fetch(`/api/workouts/${id}`, {
        cache: "no-store",
        signal: controller.signal,
      })
      if (!r.ok) throw new Error()
      onSelect(await r.json())
    } catch {
      setError(t.loadWorkoutsError)
    } finally {
      clearTimeout(timeout)
      setOpening(false)
    }
  }
  const first = new Date(`${month}-01T12:00:00Z`),
    start = (first.getUTCDay() + 6) % 7
  const last = new Date(first)
  last.setUTCMonth(last.getUTCMonth() + 1)
  last.setUTCDate(0)
  const count = last.getUTCDate(),
    cells = Math.ceil((start + count) / 7) * 7
  const format = (d: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(language, { ...options, timeZone: "UTC" }).format(d)
  function changeMonth(delta: number) {
    const next = new Date(first)
    next.setUTCMonth(next.getUTCMonth() + delta)
    const value = next.toISOString().slice(0, 7)
    onMonthChange(value)
    setLoading(true)
    setError("")
  }
  const pending = loading || loadedFor !== month + ":" + query
  const selected = items.filter((item) => item.date.slice(0, 10) === day)
  return (
    <div className="workout-calendar">
      <div className="workout-calendar-heading">
        <button
          type="button"
          aria-label={t.previousMonth}
          disabled={month === "0001-01" || opening}
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <strong aria-live="polite">
          {format(first, { month: "long", year: "numeric" })}
        </strong>
        <button
          type="button"
          aria-label={t.nextMonth}
          disabled={month === "9999-12" || opening}
          onClick={() => changeMonth(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      {error && !pending && (
        <div>
          <p role="alert">{error}</p>
          <button
            type="button"
            className="account-secondary"
            onClick={() => {
              setError("")
              setLoading(true)
              setAttempt((v) => v + 1)
            }}
          >
            {t.retryProgram}
          </button>
        </div>
      )}
      {pending ? (
        <p role="status">{t.loadingWorkouts}</p>
      ) : !error ? (
        <>
          <div className="workout-calendar-weekdays" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date("2026-11-23T12:00:00Z")
              d.setUTCDate(d.getUTCDate() + i)
              return <span key={i}>{format(d, { weekday: "short" })}</span>
            })}
          </div>
          <div
            className="workout-calendar-grid"
            role="group"
            aria-label={format(first, { month: "long", year: "numeric" })}
          >
            {Array.from({ length: cells }, (_, index) => {
              const number = index - start + 1
              if (number < 1 || number > count)
                return <span className="workout-calendar-empty" key={index} />
              const value = `${month}-${String(number).padStart(2, "0")}`,
                entries = items.filter(
                  (item) => item.date.slice(0, 10) === value
                )
              return (
                <button
                  type="button"
                  key={index}
                  className="workout-calendar-day"
                  aria-pressed={value === day}
                  aria-label={`${format(new Date(value + "T12:00:00Z"), { dateStyle: "full" })} · ${entries.length} ${t.title}`}
                  onClick={() => onDayChange(value)}
                >
                  <span>{number}</span>
                  {entries.length > 0 && (
                    <>
                      <small className="workout-calendar-count">
                        {entries.length}
                      </small>
                      <span className="workout-calendar-titles">
                        {entries.slice(0, 2).map((entry) => (
                          <small key={entry.id}>{entry.title}</small>
                        ))}
                        {entries.length > 2 && (
                          <small>+{entries.length - 2}</small>
                        )}
                      </span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
          <div className="workout-calendar-agenda">
            <h3>
              {format(new Date(day + "T12:00:00Z"), { dateStyle: "long" })}
            </h3>
            {selected.length ? (
              selected.map((entry) => (
                <button
                  type="button"
                  className="workout-history-card"
                  disabled={opening}
                  key={entry.id}
                  onClick={() => void open(entry.id)}
                >
                  <strong>{entry.title}</strong>
                  <small>{entry.date.slice(11, 16)}</small>
                </button>
              ))
            ) : (
              <p>{t.noWorkoutsOnDay}</p>
            )}
            {opening && <p role="status">{t.loadingWorkouts}</p>}
          </div>
        </>
      ) : null}
    </div>
  )
}
