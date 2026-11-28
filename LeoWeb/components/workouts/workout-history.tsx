"use client"
import { useEffect, useState } from "react"
import { CalendarDays, ArrowLeft, Search, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { Messages } from "@/lib/i18n"
import type { ExerciseOption } from "@/components/programs/canvas-layout"
import type { SavedWorkout } from "@/lib/workouts/validation"
import { WorkoutCalendar } from "./workout-calendar"
import type { Locale } from "@/lib/i18n"
import { exerciseResults, exportDate } from "@/lib/workouts/export"
export function WorkoutHistory({
  copy,
  locale,
  initialDate,
  catalog,
  onClose,
  onEdit,
  onDeleted,
}: {
  copy: Messages
  locale: Locale
  initialDate: string
  catalog: ExerciseOption[]
  onClose: () => void
  onDeleted: (id: string) => void
  onEdit: (item: SavedWorkout) => void
}) {
  const t = copy.workouts,
    p = copy.programs
  const [deleting,setDeleting] = useState(false)
  const [deleteError,setDeleteError] = useState("")
  async function removeWorkout() {
    if (!selected || deleting || !window.confirm(t.deleteWorkoutConfirm)) return
    setDeleting(true);setDeleteError("")
    try {
      const r=await fetch(`/api/workouts/${selected.id}`,{method:"DELETE",headers:{"If-Match":selected.revision}})
      if (!r.ok) { setDeleteError(r.status===409?t.deleteWorkoutChanged:t.deleteWorkoutError);return }
      onDeleted(selected.id);setSelected(null);refresh()
    } catch { setDeleteError(t.deleteWorkoutError) } finally {setDeleting(false)}
  }
  const referenceDate =
    /^\d{4}-\d{2}-\d{2}T/.test(initialDate) && !initialDate.startsWith("0000")
      ? initialDate
      : new Date().toISOString()
  const [calendarMonth, setCalendarMonth] = useState(referenceDate.slice(0, 7)),
    [calendarDay, setCalendarDay] = useState(referenceDate.slice(0, 10))
  const [view, setView] = useState<"list" | "calendar">("list")
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [attempt, setAttempt] = useState(0),
    [result, setResult] = useState<{
      total: number
      page: number
      items: SavedWorkout[]
    } | null>(null),
    [selected, setSelected] = useState<SavedWorkout | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("")
  useEffect(() => {
    if (view !== "list") return
    let active = true
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 30000)
    const delay = setTimeout(() => {
      fetch(`/api/workouts?page=${page}&q=${encodeURIComponent(query)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (r) => {
          if (!r.ok)
            throw new Error(
              r.status === 401 ? t.signInToSave : t.loadWorkoutsError
            )
          return r.json()
        })
        .then((data) => {
          if (!controller.signal.aborted) {
            setResult(data)
            setLoading(false)
          }
        })
        .catch(() => {
          if (active) {
            setError(t.loadWorkoutsError)
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
  }, [query, page, attempt, t, view])
  function refresh() {
    setLoading(true)
    setError("")
    setAttempt((v) => v + 1)
  }
  const lines = (item: SavedWorkout) =>
    item.draft.groups.flatMap((group) =>
      item.draft.exercises
        .filter((e) => e.groupId === group.id)
        .map((e) => ({
          id: e.id,
          name: catalog.find((x) => x.id === e.exerciseId)?.name || p.exercise,
          result: exerciseResults(e.sets),
          repeat: group.repeatCount,
        }))
    )
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !deleting) onClose()
      }}
    >
      <DialogContent className="exercise-picker-dialog workout-history-dialog">
        <DialogHeader>
          <DialogTitle>
            {selected ? selected.draft.title : t.savedWorkouts}
          </DialogTitle>
          <DialogDescription>
            {selected ? exportDate(selected.draft.date) : t.savedWorkoutsHint}
          </DialogDescription>
        </DialogHeader>
        {selected ? (
          <>
            <button
              type="button"
              className="account-secondary"
              disabled={deleting}
              onClick={() => {setSelected(null);setDeleteError("")}}
            >
              <ArrowLeft size={16} />
              {t.backToWorkouts}
            </button>
            <div className="workout-history-details">
              {lines(selected).map((line) => (
                <div key={line.id}>
                  <strong>{line.name}</strong>
                  <span>
                    {line.result}
                    {line.repeat > 1 ? ` · ×${line.repeat}` : ""}
                  </span>
                </div>
              ))}
            </div>
            {selected.draft.notes && (
              <p className="workout-history-notes">{selected.draft.notes}</p>
            )}
            <button
              type="button"
              className="account-primary"
              disabled={deleting}
              onClick={() => onEdit(selected)}
            >
              {t.openWorkout}
            </button>
            {deleteError && <p role="alert">{deleteError}</p>}
            <button type="button" className="account-secondary" disabled={deleting} onClick={removeWorkout}>
              <Trash2 size={16}/>{deleting?t.deletingWorkout:t.deleteWorkout}
            </button>
          </>
        ) : (
          <>
            <div
              className="workout-view-switch"
              role="group"
              aria-label={t.workoutLayout}
            >
              <button
                type="button"
                aria-pressed={view === "list"}
                onClick={() => {
                  if (view !== "list") {
                    setView("list")
                    setLoading(true)
                    setError("")
                  }
                }}
              >
                {t.listView}
              </button>
              <button
                type="button"
                aria-pressed={view === "calendar"}
                onClick={() => setView("calendar")}
              >
                {t.calendarView}
              </button>
            </div>
            <div className="picker-search">
              <Search size={17} />
              <input
                aria-label={t.searchWorkouts}
                placeholder={t.searchWorkouts}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                  setLoading(true)
                  setError("")
                }}
              />
            </div>
            {view === "calendar" ? (
              <WorkoutCalendar
                locale={locale}
                month={calendarMonth}
                day={calendarDay}
                onMonthChange={(month) => {
                  setCalendarMonth(month)
                  setCalendarDay(month + "-01")
                }}
                onDayChange={setCalendarDay}
                query={query}
                copy={copy}
                onSelect={setSelected}
              />
            ) : loading ? (
              <p role="status">{t.loadingWorkouts}</p>
            ) : error ? (
              <div>
                <p role="alert">{error}</p>
                <button
                  type="button"
                  className="account-secondary"
                  onClick={refresh}
                >
                  {t.retryProgram}
                </button>
              </div>
            ) : (
              <>
                <div className="workout-history-list">
                  {result?.items.map((item) => (
                    <button
                      type="button"
                      className="workout-history-card"
                      key={item.id}
                      onClick={() => setSelected(item)}
                    >
                      <strong>{item.draft.title}</strong>
                      <small>
                        <CalendarDays size={14} />
                        {exportDate(item.draft.date)}
                      </small>
                      {lines(item)
                        .slice(0, 3)
                        .map((line) => (
                          <span key={line.id}>
                            {line.name} · {line.result}
                          </span>
                        ))}
                      {lines(item).length > 3 && (
                        <span>+{lines(item).length - 3}</span>
                      )}
                    </button>
                  ))}
                  {!result?.items.length && <p>{t.noWorkouts}</p>}
                </div>
                {result && result.total > 12 && (
                  <div className="picker-pagination">
                    <button
                      type="button"
                      disabled={result.page <= 1}
                      onClick={() => {
                        setPage(result.page - 1)
                        setLoading(true)
                      }}
                    >
                      {p.previous}
                    </button>
                    <span>
                      {result.page}/{Math.ceil(result.total / 12)}
                    </span>
                    <button
                      type="button"
                      disabled={result.page >= Math.ceil(result.total / 12)}
                      onClick={() => {
                        setPage(result.page + 1)
                        setLoading(true)
                      }}
                    >
                      {p.next}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
