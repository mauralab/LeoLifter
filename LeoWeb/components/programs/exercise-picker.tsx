"use client"
import { useState } from "react"
import { Check, Dumbbell, Search, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { Messages } from "@/lib/i18n"
import type { ExerciseOption } from "./canvas-layout"
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
export function ExercisePicker({
  catalog,
  currentId,
  copy: t,
  onPick,
  onClose,
}: {
  catalog: ExerciseOption[]
  currentId?: string
  copy: Messages["programs"]
  onPick: (exercise: ExerciseOption) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState(""),
    [type, setType] = useState(""),
    [weight, setWeight] = useState(""),
    [page, setPage] = useState(1)
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean)
  const filtered = catalog.filter(
    (e) =>
      (!type || e.type === type) &&
      (!weight ||
        (weight === "own"
          ? e.includesOwnWeight
          : weight === "additional"
            ? e.includesAdditionalWeight
            : !e.includesAdditionalWeight)) &&
      terms.every((term) =>
        normalize(e.name + " " + (e.description || "")).includes(term)
      )
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 12)),
    current = Math.min(page, pages)
  function clear() {
    setQuery("")
    setType("")
    setWeight("")
    setPage(1)
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent showCloseButton={false} className="exercise-picker-dialog">
        <DialogHeader>
          <DialogTitle>{t.chooseExercise}</DialogTitle>
          <DialogDescription>{t.pickerIntro}</DialogDescription>
        </DialogHeader>
        <button
          className="picker-close"
          type="button"
          aria-label={t.closePicker}
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <div className="picker-search">
          <Search size={18} />
          <input
            autoFocus
            aria-label={t.searchExercises}
            type="search"
            placeholder={t.searchExercises}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="picker-filters">
          <label>
            {t.filterType}
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                setPage(1)
              }}
            >
              <option value="">{t.all}</option>
              {(["repetitions", "distance", "duration"] as const).map((k) => (
                <option key={k} value={k}>
                  {t[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.filterWeight}
            <select
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value)
                setPage(1)
              }}
            >
              <option value="">{t.all}</option>
              <option value="own">{t.ownWeight}</option>
              <option value="additional">{t.additionalWeight}</option>
              <option value="none">{t.noAdditionalWeight}</option>
            </select>
          </label>
          <button type="button" onClick={clear}>
            {t.clearFilters}
          </button>
        </div>
        <p className="picker-count" role="status">
          {filtered.length} · {current}/{pages}
        </p>
        <div className="picker-results">
          {filtered.slice((current - 1) * 12, current * 12).map((e) => (
            <button
              className="picker-exercise"
              type="button"
              key={e.id}
              aria-pressed={e.id === currentId}
              onClick={() => onPick(e)}
            >
              <span className="picker-exercise-icon">
                <Dumbbell size={20} />
              </span>
              <span>
                <strong>{e.name}</strong>
                <small>{e.description}</small>
                <em>
                  {t[e.type as "repetitions" | "distance" | "duration"]}
                  {e.includesOwnWeight ? ` · ${t.ownWeight}` : ""}
                  {e.includesAdditionalWeight ? ` · ${t.additionalWeight}` : ""}
                </em>
              </span>
              {e.id === currentId && <Check size={17} />}
            </button>
          ))}
          {!filtered.length && <p className="picker-empty">{t.noExercises}</p>}
        </div>
        <div className="picker-pagination">
          <button
            type="button"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            {t.previous}
          </button>
          <button
            type="button"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            {t.next}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
