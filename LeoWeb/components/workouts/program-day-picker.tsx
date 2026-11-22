"use client"
import {
  Search,
  Layers3,
  CalendarDays,
  ChevronRight,
  Check,
  X,
  ArrowLeft,
  LoaderCircle,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { ExerciseOption } from "@/components/programs/canvas-layout"
import { programDayPreview } from "@/lib/workouts/program-preview"
import type { Messages } from "@/lib/i18n"
import type { ProgramSummary } from "@/lib/programs/validation"
import type { ProgramWorkoutTemplate } from "@/lib/workouts/draft"
import { programDayChoices } from "@/lib/workouts/program-template"
export function ProgramDayPicker({
  programs,
  catalog,
  signedIn,
  copy,
  onClose,
  onPick,
}: {
  catalog: ExerciseOption[]
  programs: ProgramSummary[]
  signedIn: boolean
  copy: Messages
  onClose: () => void
  onPick: (
    program: ProgramWorkoutTemplate,
    dayId: string,
    includeOptional: boolean
  ) => void
}) {
  const t = copy.workouts,
    p = copy.programs
  const [stage, setStage] = useState<"programs" | "days">("programs")
  const [page, setPage] = useState(1),
    [dayQuery, setDayQuery] = useState("")
  const [query, setQuery] = useState(""),
    [programId, setProgramId] = useState(""),
    [program, setProgram] = useState<ProgramWorkoutTemplate | null>(null),
    [dayId, setDayId] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("")
  const request = useRef<AbortController | null>(null)
  useEffect(
    () => () => {
      request.current?.abort()
      request.current = null
    },
    []
  )
  async function choose(id: string) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setStage("days")
    setPage(1)
    setDayQuery("")
    setProgramId(id)
    setProgram(null)
    setDayId("")
    setError("")
    setLoading(!!id)
    if (!id) return
    const timeout = window.setTimeout(() => controller.abort(), 30000)
    try {
      const response = await fetch(`/api/programs/${id}/workout-template`, {
        cache: "no-store",
        signal: controller.signal,
      })
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? t.signInForPrograms
            : response.status === 404
              ? t.programUnavailable
              : t.templateError
        )
      const data = await response.json()
      if (request.current === controller && !controller.signal.aborted)
        setProgram(data)
    } catch (e) {
      if (request.current === controller)
        setError(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : t.templateError
        )
    } finally {
      window.clearTimeout(timeout)
      if (request.current === controller) setLoading(false)
    }
  }
  const days = program ? programDayChoices(program, p.day) : []
  const dayGroups =
    program?.blocks.filter((b) => b.kind === "group" && b.parentId === dayId) ??
    []
  const groupIds = new Set(dayGroups.map((g) => g.id)),
    exerciseCount =
      program?.blocks.filter(
        (b) => b.kind === "exercise" && b.parentId && groupIds.has(b.parentId)
      ).length ?? 0
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
  const filtered = programs.filter((item) =>
    normalize(item.name).includes(normalize(query.trim()))
  )
  const filteredDays = days.filter((day) =>
    normalize(
      day.label +
        " " +
        programDayPreview(program!, day.id, catalog, p.exercise).join(" ")
    ).includes(normalize(dayQuery.trim()))
  )
  const choices = stage === "programs" ? filtered : filteredDays
  const pages = Math.max(1, Math.ceil(choices.length / 12)),
    current = Math.min(page, pages)
  function back() {
    request.current?.abort()
    request.current = null
    setLoading(false)
    setError("")
    setStage("programs")
    setPage(1)
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="exercise-picker-dialog workout-program-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t.fromProgram}</DialogTitle>
          <DialogDescription>{t.programIntro}</DialogDescription>
        </DialogHeader>
        <button
          type="button"
          className="picker-close"
          aria-label={t.closeProgramPicker}
          onClick={onClose}
        >
          <X size={20} />
        </button>
        {!signedIn ? (
          <p className="picker-empty">{t.signInForPrograms}</p>
        ) : !programs.length ? (
          <p className="picker-empty">{t.noSavedPrograms}</p>
        ) : (
          <>
            {stage === "days" && (
              <div className="workout-program-step">
                <button type="button" onClick={back}>
                  <ArrowLeft size={15} />
                  {p.back}
                </button>
                <strong>
                  {programs.find((item) => item.id === programId)?.name}
                </strong>
              </div>
            )}
            {(stage === "programs" || program) && (
              <div className="picker-search">
                <Search size={17} />
                <input
                  autoFocus
                  aria-label={
                    stage === "programs" ? p.searchPrograms : t.searchDays
                  }
                  placeholder={
                    stage === "programs" ? p.searchPrograms : t.searchDays
                  }
                  value={stage === "programs" ? query : dayQuery}
                  onChange={(e) => {
                    if (stage === "programs") setQuery(e.target.value)
                    else setDayQuery(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
            )}
            {loading && (
              <p className="workout-program-loading" role="status">
                <LoaderCircle size={18} />
                {t.loadingProgram}
              </p>
            )}
            {error && (
              <div className="workout-program-load-error">
                <p role="alert">{error}</p>
                <button
                  type="button"
                  className="account-secondary"
                  onClick={() => {
                    void choose(programId)
                  }}
                >
                  {t.retryProgram}
                </button>
              </div>
            )}
            {(stage === "programs" || program) && (
              <>
                <p className="picker-count" role="status">
                  {choices.length} · {current}/{pages}
                </p>
                <div className="picker-results">
                  {stage === "programs"
                    ? filtered
                        .slice((current - 1) * 12, current * 12)
                        .map((item) => (
                          <button
                            type="button"
                            className="picker-exercise workout-program-card"
                            key={item.id}
                            onClick={() => {
                              void choose(item.id)
                            }}
                          >
                            <span className="picker-exercise-icon">
                              <Layers3 size={21} />
                            </span>
                            <span>
                              <strong>{item.name}</strong>
                              <small>{p.eyebrow}</small>
                            </span>
                            <ChevronRight size={18} />
                          </button>
                        ))
                    : program!.blocks
                        .filter((cycle) => cycle.kind === "cycle")
                        .map((cycle) => {
                          const cycleDays = filteredDays
                            .slice((current - 1) * 12, current * 12)
                            .filter(
                              (day) =>
                                program!.blocks.find(
                                  (block) => block.id === day.id
                                )?.parentId === cycle.id
                            )
                          if (!cycleDays.length) return null
                          const firstPath = cycleDays[0].label
                            .split(" / ")
                            .slice(0, -1)
                            .join(" / ")
                          return (
                            <section
                              className="workout-cycle-preview"
                              key={cycle.id}
                              aria-label={firstPath || p.cycle}
                            >
                              <div className="workout-cycle-preview-heading">
                                <Layers3 size={18} />
                                <strong>
                                  {firstPath || cycle.name || p.cycle}
                                </strong>
                                {cycle.repeatCount > 1 && (
                                  <span>×{cycle.repeatCount}</span>
                                )}
                              </div>
                              {cycle.description && (
                                <p className="workout-cycle-description">
                                  {cycle.description}
                                </p>
                              )}
                              <div className="workout-cycle-days">
                                {cycleDays.map((day) => {
                                  const lines = programDayPreview(
                                    program!,
                                    day.id,
                                    catalog,
                                    p.exercise
                                  )
                                  return (
                                    <button
                                      type="button"
                                      className="picker-exercise workout-day-card"
                                      key={day.id}
                                      aria-label={day.label}
                                      aria-pressed={day.id === dayId}
                                      onClick={() => setDayId(day.id)}
                                    >
                                      <span className="picker-exercise-icon">
                                        <CalendarDays size={21} />
                                      </span>
                                      <span className="workout-day-preview-content">
                                        <strong>
                                          {day.label.split(" / ").at(-1)}
                                        </strong>
                                        {lines.map((line, index) => (
                                          <span
                                            className="workout-day-prescription"
                                            key={index}
                                          >
                                            {line}
                                          </span>
                                        ))}
                                        {!lines.length && (
                                          <small>0 {p.exercise}</small>
                                        )}
                                      </span>
                                      {day.id === dayId && <Check size={18} />}
                                    </button>
                                  )
                                })}
                              </div>
                            </section>
                          )
                        })}
                  {!choices.length && (
                    <p className="picker-empty">
                      {stage === "programs"
                        ? p.noProgramsFound
                        : days.length
                          ? t.noDaysFound
                          : t.noProgramDays}
                    </p>
                  )}
                </div>
                {pages > 1 && (
                  <div className="picker-pagination">
                    <button
                      type="button"
                      disabled={current === 1}
                      onClick={() => setPage(current - 1)}
                    >
                      {p.previous}
                    </button>
                    <button
                      type="button"
                      disabled={current === pages}
                      onClick={() => setPage(current + 1)}
                    >
                      {p.next}
                    </button>
                  </div>
                )}
              </>
            )}
            {stage === "days" && program && (
              <div className="workout-program-confirm">
                {dayId && (
                  <p>
                    {dayGroups.length} {p.group} · {exerciseCount} {p.exercise}
                  </p>
                )}
                <button
                  type="button"
                  className="account-primary"
                  disabled={!dayId || loading}
                  onClick={() => onPick(program, dayId, false)}
                >
                  {t.useDay}
                </button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
