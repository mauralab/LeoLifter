"use client"
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type KeyboardEvent,
} from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  CalendarDays,
  Dumbbell,
  GripVertical,
  ListOrdered,
  Plus,
  Minus,
  Save,
  History,
  FilePlus2,
  Settings2,
  Trash2,
  FilePenLine,
  Copy,
  ClipboardPaste,
  CopyPlus,
  FolderOpen,
  Layers3,
} from "lucide-react"
import { HeaderPreferences } from "@/components/landing/header-preferences"
import { TrainingNavigation } from "@/components/navigation/training-navigation"
import { ExercisePicker } from "@/components/programs/exercise-picker"
import type { ExerciseOption } from "@/components/programs/canvas-layout"
import { workoutDateTime, workoutDefaultName } from "./workout-defaults"
import type { Locale, Messages } from "@/lib/i18n"

import type {
  WorkoutSet,
  WorkoutGroup,
  WorkoutExercise,
  WorkoutSource,
  ProgramWorkoutTemplate,
} from "@/lib/workouts/draft"
import type { ProgramSummary } from "@/lib/programs/validation"
import {
  workoutFromProgram,
  workoutTargetLabel,
  targetRange,
} from "@/lib/workouts/program-template"
import { WorkoutHistory } from "./workout-history"
import type { SavedWorkout } from "@/lib/workouts/validation"
import { workoutInstant } from "@/lib/workouts/schedule"
import { WorkoutExport } from "./workout-export"
import { ProgramDayPicker } from "./program-day-picker"

type ClipboardItem =
  | { kind: "group"; group: WorkoutGroup; exercises: WorkoutExercise[] }
  | { kind: "exercise"; exercise: WorkoutExercise }
  | { kind: "set"; sets: WorkoutSet[] }

type Selection =
  | { kind: "day" }
  | { kind: "group"; id: string }
  | { kind: "exercise"; id: string }
  | { kind: "set"; id: string }
type Drag = {
  kind: "group" | "exercise" | "set"
  id?: string
  x: number
  y: number
  startX: number
  startY: number
  moved: boolean
}
// Rows stay expanded in the draft; batchId is presentation metadata only.
const newSet = (): WorkoutSet => {
  const id = crypto.randomUUID()
  return {
    id,
    batchId: id,
    value: "",
    unit: "rep",
    weight: "",
    weightUnit: "kg",
    seconds: "",
    rir: "",
  }
}
function visibleSets(exercise: WorkoutExercise) {
  const seen = new Set<string>()
  return exercise.sets.filter((s) => {
    if (seen.has(s.batchId)) return false
    seen.add(s.batchId)
    return true
  })
}
function batchRows(exercise: WorkoutExercise, set: WorkoutSet) {
  return exercise.sets.filter((s) => s.batchId === set.batchId)
}
function cloneRows(rows: WorkoutSet[]) {
  const batches = new Map<string, string>()
  return rows.map((s) => {
    if (!batches.has(s.batchId)) batches.set(s.batchId, crypto.randomUUID())
    return { ...s, id: crypto.randomUUID(), batchId: batches.get(s.batchId)! }
  })
}
const snapshotKey = (value: unknown) =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]])
        )
      : item
  )
const subscribeTimezone = () => () => {}
const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone
const serverTimezone = () => "UTC"

export function WorkoutEditor({
  locale,
  messages,
  catalog,
  initialInstant,
  primaryLocale,
  defaultNameTemplate,
  preferredTimezone,
  programs,
  signedIn,
  username,
}: {
  locale: Locale
  messages: Messages
  catalog: ExerciseOption[]
  initialInstant: string
  primaryLocale: Locale
  defaultNameTemplate: string
  preferredTimezone?: string
  programs: ProgramSummary[]
  signedIn: boolean
  username: string
}) {
  const t = messages.workouts,
    p = messages.programs
  const browserZone = useSyncExternalStore(
    subscribeTimezone,
    browserTimezone,
    serverTimezone
  )
  const [customTitle, setTitle] = useState<string | null>(null)
  const [customDate, setDate] = useState<string | null>(null)
  const date =
    customDate ??
    workoutDateTime(initialInstant, preferredTimezone ?? browserZone)
  const title =
    customTitle ?? workoutDefaultName(date, primaryLocale, defaultNameTemplate)
  const [notes, setNotes] = useState("")
  const [programPicker, setProgramPicker] = useState(false)
  const [source, setSource] = useState<WorkoutSource | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [savedIdentity, setSavedIdentity] = useState<{
    id: string
    revision: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [savedSnapshot, setSavedSnapshot] = useState("")
  const clientKey = useRef("")

  const [groups, setGroups] = useState<WorkoutGroup[]>([])
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [selection, setSelection] = useState<Selection>({ kind: "day" })
  const [picker, setPicker] = useState<string | null>(null),
    [notice, setNotice] = useState("")
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null)
  const [ghost, setGhost] = useState<Drag | null>(null)
  const drag = useRef<Drag | null>(null),
    suppressClick = useRef(false)
  const activeExercise =
    selection.kind === "day" || selection.kind === "group"
      ? undefined
      : exercises.find((e) =>
          selection.kind === "exercise"
            ? e.id === selection.id
            : e.sets.some((s) => s.id === selection.id)
        )
  const activeSet =
    selection.kind === "set"
      ? activeExercise?.sets.find((s) => s.id === selection.id)
      : undefined
  const activeGroup = groups.find((g) =>
    selection.kind === "group"
      ? g.id === selection.id
      : g.id === activeExercise?.groupId
  )

  const fingerprint = snapshotKey({
    title,
    date,
    notes,
    source,
    groups,
    exercises,
  })
  const dirty = savedSnapshot
    ? fingerprint !== savedSnapshot
    : !!(
        groups.length ||
        exercises.length ||
        notes ||
        customTitle ||
        customDate
      )
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  async function saveWorkoutDraft() {
    if (saving || !dirty) return
    if (!signedIn) {
      setSaveError(t.signInToSave)
      return
    }
    setSaving(true)
    setSaveError("")
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 30000)
    try {
      if (!clientKey.current) clientKey.current = crypto.randomUUID()
      const body = {
        clientKey: clientKey.current,
        revision: savedIdentity?.revision,
        title,
        date,
        scheduledAt: workoutInstant(date, preferredTimezone ?? browserZone),
        notes,
        source,
        groups,
        exercises,
      }
      const response = await fetch(
        savedIdentity ? `/api/workouts/${savedIdentity.id}` : "/api/workouts",
        {
          method: savedIdentity ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(
          response.status === 401
            ? t.signInToSave
            : response.status === 409
              ? t.workoutConflict
              : response.status === 400
                ? data?.error || t.saveWorkoutError
                : t.saveWorkoutError
        )
      }
      const saved: SavedWorkout = await response.json()
      setSavedIdentity({ id: saved.id, revision: saved.revision })
      setSavedSnapshot(
        snapshotKey({
          title: saved.draft.title,
          date: saved.draft.date,
          notes: saved.draft.notes,
          source: saved.draft.source,
          groups: saved.draft.groups,
          exercises: saved.draft.exercises,
        })
      )
      setNotice(t.workoutSaved)
    } catch (error) {
      setSaveError(
        error instanceof Error && error.name !== "AbortError"
          ? error.message
          : t.saveWorkoutError
      )
    } finally {
      clearTimeout(timeout)
      setSaving(false)
    }
  }
  function openSavedWorkout(item: SavedWorkout) {
    if (dirty && !window.confirm(t.replaceUnsaved)) return
    const d = item.draft
    setTitle(d.title)
    setDate(d.date)
    setNotes(d.notes)
    setSource(d.source)
    setGroups(d.groups)
    setExercises(d.exercises)
    clientKey.current = d.clientKey
    setSavedIdentity({ id: item.id, revision: item.revision })
    setSavedSnapshot(
      snapshotKey({
        title: d.title,
        date: d.date,
        notes: d.notes,
        source: d.source,
        groups: d.groups,
        exercises: d.exercises,
      })
    )
    setSaveError("")
    setSelection({ kind: "day" })
    setHistoryOpen(false)
    setNotice(t.workoutOpened)
  }
  function newWorkout() {
    if (dirty && !window.confirm(t.replaceUnsaved)) return
    const nextDate = workoutDateTime(
      new Date().toISOString(),
      preferredTimezone ?? browserZone
    )
    setTitle(null)
    setDate(nextDate)
    setNotes("")
    setSource(null)
    setGroups([])
    setExercises([])
    clientKey.current = ""
    setSavedIdentity(null)
    setSavedSnapshot(
      snapshotKey({
        title: workoutDefaultName(nextDate, primaryLocale, defaultNameTemplate),
        date: nextDate,
        notes: "",
        source: null,
        groups: [],
        exercises: [],
      })
    )
    setSaveError("")
    setSelection({ kind: "day" })
    setNotice("")
  }
  function importDay(
    program: ProgramWorkoutTemplate,
    dayId: string,
    optional: boolean
  ) {
    if (
      (groups.length || exercises.length) &&
      !window.confirm(t.replaceWorkout)
    )
      return
    const draft = workoutFromProgram(program, dayId, catalog, optional, p.day)
    setGroups(draft.groups)
    setExercises(draft.exercises)
    setSource(draft.source)
    setSelection({ kind: "day" })
    setProgramPicker(false)
    setNotice(t.programLoaded)
  }
  function targetPlaceholder(field: "value" | "weight" | "seconds" | "rir") {
    const target = activeSet?.target
    if (!target) return ""
    if (field === "value")
      return activeSet.unit === "rep"
        ? targetRange(target.repsMin, target.repsMax)
        : activeSet.unit === target.unit
          ? targetRange(target.valueMin, target.valueMax)
          : ""
    if (
      field === "weight" &&
      activeSet?.weightUnit === target.unit &&
      ["kg", "lb"].includes(target.unit)
    )
      return targetRange(target.valueMin, target.valueMax)
    if (field === "seconds" && target.unit === "s" && activeSet?.unit !== "s")
      return targetRange(target.valueMin, target.valueMax)
    return ""
  }
  function defaultGroup() {
    const group = { id: crypto.randomUUID(), name: "", repeatCount: 1 }
    setGroups((v) => [...v, group])
    return group.id
  }
  const exerciseName = (e: WorkoutExercise) =>
    catalog.find((c) => c.id === e.exerciseId)?.name || p.chooseExercise
  function add(kind: "group" | "exercise" | "set", parentId?: string) {
    if (kind === "group") {
      const id = defaultGroup()
      setSelection({ kind: "group", id })
      setNotice(t.groupAdded)
      return id
    }
    if (kind === "exercise") {
      const groupId =
        parentId ?? activeGroup?.id ?? groups.at(-1)?.id ?? defaultGroup()
      const e = { id: crypto.randomUUID(), groupId, sets: [] }
      setExercises((v) => [...v, e])
      setSelection({ kind: "exercise", id: e.id })
      setNotice(t.exerciseAdded)
      return e.id
    }
    const parent =
      parentId ??
      activeExercise?.id ??
      (activeGroup
        ? exercises.filter((e) => e.groupId === activeGroup.id).at(-1)?.id
        : exercises.at(-1)?.id)
    if (!parent) {
      setNotice(t.setNeedsExercise)
      return
    }
    const set = newSet()
    setExercises((v) =>
      v.map((e) => (e.id === parent ? { ...e, sets: [...e.sets, set] } : e))
    )
    setSelection({ kind: "set", id: set.id })
    setNotice(t.setAdded)
    return set.id
  }
  function updateSet(update: Partial<WorkoutSet>) {
    if (!activeSet) return
    setExercises((v) =>
      v.map((e) => ({
        ...e,
        sets: e.sets.map((s) =>
          s.batchId === activeSet.batchId ? { ...s, ...update } : s
        ),
      }))
    )
  }
  function resolve(target: Selection) {
    const exercise =
      target.kind === "day" || target.kind === "group"
        ? undefined
        : exercises.find((e) =>
            target.kind === "exercise"
              ? e.id === target.id
              : e.sets.some((s) => s.id === target.id)
          )
    return {
      exercise,
      set:
        target.kind === "set"
          ? exercise?.sets.find((s) => s.id === target.id)
          : undefined,
    }
  }
  function remove(target: Selection = selection) {
    if (target.kind === "group") {
      if (
        exercises.some((e) => e.groupId === target.id) &&
        !window.confirm(t.removeGroupConfirm)
      )
        return
      setGroups((v) => v.filter((g) => g.id !== target.id))
      setExercises((v) => v.filter((e) => e.groupId !== target.id))
      if (activeGroup?.id === target.id) setSelection({ kind: "day" })
      setNotice(t.removed)
      return
    }
    const { exercise, set } = resolve(target)
    if (!exercise) return
    if (set) {
      setExercises((v) =>
        v.map((e) => ({
          ...e,
          sets: e.sets.filter((s) => s.batchId !== set.batchId),
        }))
      )
      if (activeSet?.batchId === set.batchId)
        setSelection({ kind: "exercise", id: exercise.id })
    } else {
      if (exercise.sets.length && !window.confirm(t.removeExerciseConfirm))
        return
      setExercises((v) => v.filter((e) => e.id !== exercise.id))
      if (activeExercise?.id === exercise.id) setSelection({ kind: "day" })
    }
    setNotice(t.removed)
  }
  function snapshot(target: Selection = selection): ClipboardItem | null {
    if (target.kind === "group") {
      const group = groups.find((g) => g.id === target.id)
      return group
        ? {
            kind: "group",
            group: { ...group },
            exercises: exercises
              .filter((e) => e.groupId === group.id)
              .map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })),
          }
        : null
    }
    const { exercise, set } = resolve(target)
    return set
      ? { kind: "set", sets: batchRows(exercise!, set).map((s) => ({ ...s })) }
      : exercise
        ? {
            kind: "exercise",
            exercise: {
              ...exercise,
              sets: exercise.sets.map((s) => ({ ...s })),
            },
          }
        : null
  }
  function copy(target: Selection = selection) {
    const item = snapshot(target)
    if (item) {
      setClipboard(item)
      setNotice(p.copied)
    }
  }
  function paste(
    item: ClipboardItem | null = clipboard,
    destination: Selection = selection
  ) {
    if (!item) return
    const { exercise, set } = resolve(destination)
    const destinationGroup =
      destination.kind === "group"
        ? groups.find((g) => g.id === destination.id)
        : groups.find((g) => g.id === exercise?.groupId)
    if (item.kind === "group") {
      const group = { ...item.group, id: crypto.randomUUID() }
      setGroups((v) => {
        const next = [...v],
          i = destinationGroup
            ? next.findIndex((g) => g.id === destinationGroup.id) + 1
            : next.length
        next.splice(i, 0, group)
        return next
      })
      setExercises((v) => [
        ...v,
        ...item.exercises.map((e) => ({
          ...e,
          id: crypto.randomUUID(),
          groupId: group.id,
          sets: cloneRows(e.sets),
        })),
      ])
      setSelection({ kind: "group", id: group.id })
    } else if (item.kind === "exercise") {
      const groupId =
        destinationGroup?.id ?? groups.at(-1)?.id ?? defaultGroup()
      const clone = {
        ...item.exercise,
        groupId,
        id: crypto.randomUUID(),
        sets: cloneRows(item.exercise.sets),
      }
      setExercises((v) => {
        const next = [...v],
          index = exercise
            ? next.findIndex((e) => e.id === exercise.id) + 1
            : next.length
        next.splice(index, 0, clone)
        return next
      })
      setSelection({ kind: "exercise", id: clone.id })
    } else {
      const parent =
        exercise ??
        (destinationGroup
          ? exercises.filter((e) => e.groupId === destinationGroup.id).at(-1)
          : exercises.at(-1))
      if (!parent) {
        setNotice(t.setNeedsExercise)
        return
      }
      const clones = cloneRows(item.sets)
      setExercises((v) =>
        v.map((e) => {
          if (e.id !== parent.id) return e
          const sets = [...e.sets],
            index = set
              ? sets.findLastIndex((s) => s.batchId === set.batchId) + 1
              : sets.length
          sets.splice(index, 0, ...clones)
          return { ...e, sets }
        })
      )
      setSelection({ kind: "set", id: clones[0].id })
    }
    setNotice(t.pasted)
  }
  function duplicate(target: Selection = selection) {
    paste(snapshot(target), target)
  }
  function applyCount(raw: string) {
    const count = Number(raw)
    if (
      !activeExercise ||
      !activeSet ||
      !/^\d+$/.test(raw) ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 100
    )
      return
    const parentId = activeExercise.id,
      batchId = activeSet.batchId
    setExercises((v) =>
      v.map((e) => {
        if (e.id !== parentId) return e
        const existing = batchRows(e, activeSet),
          replacement = Array.from(
            { length: count },
            (_, i) => existing[i] ?? { ...activeSet, id: crypto.randomUUID() }
          )
        const index = e.sets.findIndex((s) => s.batchId === batchId),
          sets = e.sets.filter((s) => s.batchId !== batchId)
        sets.splice(index, 0, ...replacement)
        return { ...e, sets }
      })
    )
    setNotice(t.countApplied)
  }
  function shortcuts(event: KeyboardEvent<HTMLElement>) {
    if (
      picker ||
      programPicker ||
      (event.target as HTMLElement).closest(
        'input,textarea,select,[contenteditable="true"],[role="dialog"]'
      )
    )
      return
    if (event.key === "Delete") {
      event.preventDefault()
      remove()
      return
    }
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return
    const key = event.key.toLowerCase()
    if (!["c", "v", "d"].includes(key)) return
    if (key !== "v" && selection.kind === "day") return
    event.preventDefault()
    if (key === "c") copy()
    else if (key === "v") paste()
    else duplicate()
  }
  function actions(target: Selection) {
    const kind =
      target.kind === "group"
        ? p.group
        : target.kind === "exercise"
          ? p.exercise
          : p.set
    return (
      <div className="workout-row-actions">
        <button
          type="button"
          aria-label={`${p.copyBlock} ${kind}`}
          title={p.copyBlock}
          onClick={() => copy(target)}
        >
          <Copy size={14} />
        </button>
        <button
          type="button"
          aria-label={`${p.remove} ${kind}`}
          title={p.remove}
          onClick={() => remove(target)}
        >
          <Trash2 size={14} />
        </button>
      </div>
    )
  }
  function reorder(
    kind: "group" | "exercise" | "set",
    id: string,
    direction: number
  ) {
    if (kind === "group") {
      setGroups((v) => {
        const next = [...v],
          i = next.findIndex((g) => g.id === id),
          j = i + direction
        if (i < 0 || j < 0 || j >= next.length) return v
        ;[next[i], next[j]] = [next[j], next[i]]
        return next
      })
      setNotice(t.reordered)
      return
    }
    setExercises((v) => {
      if (kind === "exercise") {
        const groupId = v.find((e) => e.id === id)?.groupId
        const next = v.filter((e) => e.groupId === groupId),
          i = next.findIndex((e) => e.id === id),
          j = i + direction
        if (j < 0 || j >= next.length) return v
        ;[next[i], next[j]] = [next[j], next[i]]
        let position = 0
        return v.map((e) => (e.groupId === groupId ? next[position++] : e))
      }
      return v.map((e) => {
        const groups = visibleSets(e),
          i = groups.findIndex((s) => s.id === id),
          j = i + direction
        if (i < 0 || j < 0 || j >= groups.length) return e
        ;[groups[i], groups[j]] = [groups[j], groups[i]]
        return { ...e, sets: groups.flatMap((s) => batchRows(e, s)) }
      })
    })
    setNotice(t.reordered)
  }
  function start(
    event: PointerEvent<HTMLButtonElement>,
    kind: "group" | "exercise" | "set",
    id?: string
  ) {
    if (event.button !== 0) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      kind,
      id,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d) return
    if (Math.hypot(event.clientX - d.startX, event.clientY - d.startY) > 5)
      d.moved = true
    d.x = event.clientX
    d.y = event.clientY
    if (d.moved) setGhost({ ...d })
  }
  function drop(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current
    drag.current = null
    setGhost(null)
    if (!d?.moved) return
    suppressClick.current = true
    window.setTimeout(() => {
      suppressClick.current = false
    }, 0)
    const hit = document.elementFromPoint(event.clientX, event.clientY)
    const day = hit?.closest("[data-workout-day]"),
      group = hit?.closest<HTMLElement>("[data-workout-group]"),
      exercise = hit?.closest<HTMLElement>("[data-workout-exercise]"),
      set = hit?.closest<HTMLElement>("[data-workout-set]")
    if (!day) {
      setNotice(t.dropInsideDay)
      return
    }
    const parent =
      d.kind === "exercise"
        ? group?.dataset.workoutGroup
        : exercise?.dataset.workoutExercise
    if (d.kind === "exercise" && !parent) {
      setNotice(t.exerciseNeedsGroup)
      return
    }
    if (d.kind === "set" && !parent) {
      setNotice(t.setNeedsExercise)
      return
    }
    let id = d.id
    if (!id) id = add(d.kind, parent)
    if (!id) return
    const movedId = id
    const target =
      d.kind === "group" ? group : d.kind === "exercise" ? exercise : set
    const after = target
      ? event.clientY >
        target.getBoundingClientRect().top +
          target.getBoundingClientRect().height / 2
      : false
    const targetId =
      d.kind === "group"
        ? group?.dataset.workoutGroup
        : d.kind === "exercise"
          ? exercise?.dataset.workoutExercise
          : set?.dataset.workoutSet
    if (targetId === movedId) return
    if (d.kind === "group") {
      setGroups((v) => {
        const item = v.find((g) => g.id === movedId)
        if (!item) return v
        const next = v.filter((g) => g.id !== movedId),
          i = next.findIndex((g) => g.id === targetId)
        next.splice(i < 0 ? next.length : i + (after ? 1 : 0), 0, item)
        return next
      })
      setSelection({ kind: "group", id: movedId })
      setNotice(t.reordered)
      return
    }
    setExercises((v) => {
      if (d.kind === "exercise") {
        const item = v.find((e) => e.id === movedId)
        if (!item) return v
        const next = v.filter((e) => e.id !== movedId),
          i = next.findIndex((e) => e.id === targetId)
        next.splice(i < 0 ? next.length : i + (after ? 1 : 0), 0, {
          ...item,
          groupId: parent!,
        })
        return next
      }
      const item = v.flatMap((e) => e.sets).find((s) => s.id === movedId)
      if (!item) return v
      const source = v.find((e) => e.sets.some((s) => s.id === movedId))!
      const moved = batchRows(source, item)
      return v.map((e) => {
        const sets = e.sets.filter((s) => s.batchId !== item.batchId)
        if (e.id === parent) {
          const target = sets.find((s) => s.id === targetId)
          const i = target
            ? after
              ? sets.findLastIndex((s) => s.batchId === target.batchId) + 1
              : sets.findIndex((s) => s.batchId === target.batchId)
            : sets.length
          sets.splice(i, 0, ...moved)
        }
        return { ...e, sets }
      })
    })
    setSelection({ kind: d.kind, id: movedId })
    setNotice(t.reordered)
  }
  function grip(kind: "group" | "exercise" | "set", id?: string) {
    const label = id
      ? `${p.move} ${kind === "group" ? p.group : kind === "exercise" ? p.exercise : p.set}`
      : `${p.blocks}: ${kind === "group" ? p.group : kind === "exercise" ? p.exercise : p.set}`
    return (
      <button
        type="button"
        className={id ? "workout-grip" : "workout-palette-button"}
        aria-label={label}
        title={id ? t.reorderHint : t.paletteHint}
        onPointerDown={(e) => start(e, kind, id)}
        onPointerMove={move}
        onPointerUp={drop}
        onPointerCancel={() => {
          drag.current = null
          setGhost(null)
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (suppressClick.current) return
          if (id) setSelection({ kind, id })
          else add(kind)
        }}
        onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
          if (id && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault()
            reorder(kind, id, e.key === "ArrowUp" ? -1 : 1)
          }
        }}
      >
        {id ? (
          <GripVertical size={16} />
        ) : (
          <>
            {kind === "group" ? (
              <FolderOpen size={20} />
            ) : kind === "exercise" ? (
              <Dumbbell size={20} />
            ) : (
              <ListOrdered size={20} />
            )}
            <span>
              {kind === "group"
                ? p.group
                : kind === "exercise"
                  ? p.exercise
                  : p.set}
            </span>
            <Plus size={14} />
          </>
        )}
      </button>
    )
  }
  const numberFields = activeSet
    ? ([
        ["value", t.result, activeSet.unit === "rep" ? 1 : 0.001],
        ["weight", t.weight, 0.001],
        ["seconds", t.timeSpent, 0.001],
        ["rir", t.rir, 0.1],
      ] as const)
    : []
  const invalid =
    activeSet &&
    numberFields.some(
      ([key, , step]) =>
        activeSet[key] !== "" &&
        (!Number.isFinite(Number(activeSet[key])) ||
          Number(activeSet[key]) < 0 ||
          (step === 1 && !Number.isInteger(Number(activeSet[key]))) ||
          (key === "rir" && Number(activeSet[key]) > 999.9))
    )
  return (
    <main className="account-page workout-page" onKeyDown={shortcuts}>
      <header className="account-topbar exercises-topbar">
        <Link className="account-brand" href={`/${locale}`}>
          <Image src="/brand/leo-web.png" alt="" width={46} height={54} />
          <span>
            LeoLifter<span className="account-brand-dot">.</span>
          </span>
        </Link>
        <TrainingNavigation
          locale={locale}
          copy={messages.exercises}
          current="workouts"
        />
        <HeaderPreferences locale={locale} copy={messages} />
      </header>
      <div className="exercise-container program-builder-container">
        <Link prefetch={false} className="account-back" href={`/${locale}`}>
          <ArrowLeft size={15} />
          {messages.account.back}
        </Link>
        <div className="exercise-intro">
          <div>
            <p className="account-eyebrow">{t.eyebrow}</p>
            <h1>{t.editorTitle}</h1>
            <p>{t.intro}</p>
          </div>
          <span
            className="workout-local-draft"
            role="status"
            title={t.persistenceNote}
          >
            <FilePenLine size={16} />
            {saving
              ? t.savingWorkout
              : savedIdentity && !dirty
                ? t.workoutSaved
                : dirty
                  ? t.unsavedWorkout
                  : t.newWorkout}
          </span>
        </div>
        {saveError && (
          <p className="workout-save-error" role="alert">
            {saveError}
          </p>
        )}
        <div className="workout-toolbar" role="toolbar" aria-label={t.actions}>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void saveWorkoutDraft()}
          >
            <Save size={16} />
            {saving ? t.savingWorkout : t.saveWorkout}
          </button>
          <button
            type="button"
            disabled={saving || !signedIn}
            onClick={() => setHistoryOpen(true)}
          >
            <History size={16} />
            {t.savedWorkouts}
          </button>
          <button type="button" disabled={saving} onClick={newWorkout}>
            <FilePlus2 size={16} />
            {t.newWorkout}
          </button>
          <WorkoutExport
            draft={{ username, date, title, groups, exercises, catalog }}
            copy={messages}
          />
          <button type="button" onClick={() => setProgramPicker(true)}>
            <Layers3 size={16} />
            {t.fromProgram}
          </button>
        </div>
        <div
          className="workout-toolbar workout-edit-toolbar"
          role="toolbar"
          aria-label={t.editActions}
        >
          <button
            type="button"
            disabled={selection.kind === "day"}
            title={`${p.copyBlock} · Ctrl/Cmd+C`}
            onClick={() => copy()}
          >
            <Copy size={16} />
            {p.copyBlock}
          </button>
          <button
            type="button"
            disabled={
              !clipboard || (clipboard.kind === "set" && !exercises.length)
            }
            title={`${p.pasteBlock} · Ctrl/Cmd+V`}
            onClick={() => paste()}
          >
            <ClipboardPaste size={16} />
            {p.pasteBlock}
          </button>
          <button
            type="button"
            disabled={selection.kind === "day"}
            title={`${p.duplicateBlock} · Ctrl/Cmd+D`}
            onClick={() => duplicate()}
          >
            <CopyPlus size={16} />
            {p.duplicateBlock}
          </button>
          <button
            type="button"
            disabled={selection.kind === "day"}
            title={`${p.remove} · Delete`}
            onClick={() => remove()}
          >
            <Trash2 size={16} />
            {p.remove}
          </button>
        </div>
        <div className="workout-editor">
          <aside className="workout-palette" aria-label={p.blocks}>
            <h2>{p.blocks}</h2>
            <p>{t.paletteHint}</p>
            {grip("group")}
            {grip("exercise")}
            {grip("set")}
          </aside>
          <section className="workout-day" data-workout-day aria-label={p.day}>
            <button
              type="button"
              className="workout-day-heading"
              data-selected={selection.kind === "day"}
              onClick={() => setSelection({ kind: "day" })}
            >
              <CalendarDays size={23} />
              <span>
                <strong>{title || t.untitled}</strong>
                <small>{date ? date.replace("T", " · ") : t.dayHint}</small>
              </span>
              <Settings2 size={18} />
            </button>
            {source && (
              <div className="workout-program-source">
                <Layers3 size={16} />
                <span>
                  <strong>{t.basedOn}</strong> {source.programName} /{" "}
                  {source.dayName}
                </span>
              </div>
            )}
            {notes && <p className="workout-day-notes">{notes}</p>}
            <div className="workout-exercises">
              {!groups.length && (
                <div className="workout-empty">
                  <Dumbbell size={32} />
                  <h3>{t.emptyTitle}</h3>
                  <p>{t.emptyHint}</p>
                  <button
                    type="button"
                    className="account-secondary"
                    onClick={() => add("exercise")}
                  >
                    <Plus size={16} />
                    {t.addExercise}
                  </button>
                </div>
              )}
              {groups.map((group, groupIndex) => (
                <section
                  key={group.id}
                  className="workout-group"
                  data-workout-group={group.id}
                  data-selected={
                    selection.kind === "group" && selection.id === group.id
                  }
                >
                  <div className="workout-group-heading">
                    {grip("group", group.id)}
                    <button
                      type="button"
                      className="workout-select-group"
                      onClick={() =>
                        setSelection({ kind: "group", id: group.id })
                      }
                    >
                      <small>
                        {p.group} {groupIndex + 1}
                      </small>
                      <strong>
                        {group.name || `${p.group} ${groupIndex + 1}`}
                      </strong>
                    </button>
                    <span className="workout-count">×{group.repeatCount}</span>
                    {actions({ kind: "group", id: group.id })}
                  </div>
                  <div className="workout-group-exercises">
                    {exercises
                      .filter((e) => e.groupId === group.id)
                      .map((exercise, i) => (
                        <article
                          key={exercise.id}
                          className="workout-exercise"
                          data-workout-exercise={exercise.id}
                          data-selected={
                            activeExercise?.id === exercise.id &&
                            selection.kind === "exercise"
                          }
                        >
                          <div className="workout-exercise-heading">
                            {grip("exercise", exercise.id)}
                            <button
                              type="button"
                              className="workout-select-exercise"
                              onClick={() =>
                                setSelection({
                                  kind: "exercise",
                                  id: exercise.id,
                                })
                              }
                            >
                              <small>
                                {p.exercise} {i + 1}
                              </small>
                              <strong>{exerciseName(exercise)}</strong>
                            </button>
                            <button
                              type="button"
                              className="workout-choose"
                              aria-label={p.chooseExercise}
                              title={p.chooseExercise}
                              onClick={() => {
                                setSelection({
                                  kind: "exercise",
                                  id: exercise.id,
                                })
                                setPicker(exercise.id)
                              }}
                            >
                              <Dumbbell size={17} />
                            </button>
                            {actions({ kind: "exercise", id: exercise.id })}
                            <span className="workout-count">
                              {exercise.sets.length}
                            </span>
                          </div>
                          <div className="workout-sets">
                            {visibleSets(exercise).map((set, j) => (
                              <div
                                key={set.id}
                                data-workout-set={set.id}
                                className="workout-set"
                                data-selected={
                                  selection.kind === "set" &&
                                  selection.id === set.id
                                }
                              >
                                {grip("set", set.id)}
                                <button
                                  type="button"
                                  className="workout-select-set"
                                  onClick={() =>
                                    setSelection({ kind: "set", id: set.id })
                                  }
                                >
                                  <span>
                                    {p.set} {j + 1}
                                  </span>
                                  <strong>
                                    {set.value
                                      ? `${set.value} ${set.unit === "rep" ? p.reps : set.unit}`
                                      : t.noResult}
                                  </strong>
                                  <small>
                                    {[
                                      set.weight
                                        ? `${set.weight} ${set.weightUnit}`
                                        : "",
                                      set.seconds ? `${set.seconds} s` : "",
                                      set.rir ? `RIR ${set.rir}` : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </small>
                                  {set.target && (
                                    <small className="workout-target-summary">
                                      {t.target}:{" "}
                                      {workoutTargetLabel(
                                        set,
                                        p.reps,
                                        p.setAmount
                                      )}
                                    </small>
                                  )}
                                </button>
                                {batchRows(exercise, set).length > 1 && (
                                  <span
                                    className="workout-set-quantity"
                                    title={p.setAmount}
                                  >
                                    ×{batchRows(exercise, set).length}
                                  </span>
                                )}
                                {actions({ kind: "set", id: set.id })}
                              </div>
                            ))}
                            <button
                              type="button"
                              className="workout-add-set"
                              onClick={() => add("set", exercise.id)}
                            >
                              <Plus size={15} />
                              {t.addSet}
                            </button>
                          </div>
                        </article>
                      ))}
                    <button
                      type="button"
                      className="workout-add-set"
                      onClick={() => add("exercise", group.id)}
                    >
                      <Plus size={15} />
                      {t.addExercise}
                    </button>
                  </div>
                </section>
              ))}
            </div>
          </section>
          <aside
            className="canvas-inspector workout-options"
            aria-label={p.options}
          >
            <h2>
              <Settings2 size={17} />
              {p.options}
            </h2>
            <div className="workout-option-fields">
              {selection.kind === "day" ? (
                <>
                  <h3>{p.day}</h3>
                  <label htmlFor="workout-title">{p.objectTitle}</label>
                  <input
                    id="workout-title"
                    value={title}
                    maxLength={200}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.untitled}
                  />
                  <label htmlFor="workout-date">{t.scheduledAt}</label>
                  <input
                    id="workout-date"
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <label htmlFor="workout-notes">{t.notes}</label>
                  <textarea
                    id="workout-notes"
                    value={notes}
                    maxLength={10000}
                    rows={5}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </>
              ) : selection.kind === "group" && activeGroup ? (
                <>
                  <h3>{p.group}</h3>
                  <label htmlFor="workout-group-name">{p.objectTitle}</label>
                  <input
                    id="workout-group-name"
                    value={activeGroup.name}
                    maxLength={200}
                    onChange={(e) =>
                      setGroups((v) =>
                        v.map((g) =>
                          g.id === activeGroup.id
                            ? { ...g, name: e.target.value }
                            : g
                        )
                      )
                    }
                  />
                  <label htmlFor="workout-group-repeat">{p.repeatCount}</label>
                  <input
                    id="workout-group-repeat"
                    type="number"
                    min={1}
                    max={2147483647}
                    step={1}
                    value={activeGroup.repeatCount}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      if (Number.isInteger(n) && n >= 1 && n <= 2147483647)
                        setGroups((v) =>
                          v.map((g) =>
                            g.id === activeGroup.id
                              ? { ...g, repeatCount: n }
                              : g
                          )
                        )
                    }}
                  />
                  <button
                    type="button"
                    className="account-secondary"
                    onClick={() => add("exercise", activeGroup.id)}
                  >
                    <Plus size={15} />
                    {t.addExercise}
                  </button>
                </>
              ) : activeSet ? (
                <>
                  <span id="workout-set-count-label">{p.setAmount}</span>
                  <div
                    className="workout-set-stepper"
                    role="group"
                    aria-labelledby="workout-set-count-label"
                  >
                    <button
                      type="button"
                      aria-label={t.decreaseSets}
                      disabled={
                        batchRows(activeExercise!, activeSet).length <= 1
                      }
                      onClick={() =>
                        applyCount(
                          String(
                            batchRows(activeExercise!, activeSet).length - 1
                          )
                        )
                      }
                    >
                      <Minus size={18} />
                    </button>
                    <output
                      id="workout-set-count"
                      aria-labelledby="workout-set-count-label"
                      aria-live="polite"
                    >
                      {batchRows(activeExercise!, activeSet).length}
                    </output>
                    <button
                      type="button"
                      aria-label={t.increaseSets}
                      disabled={
                        batchRows(activeExercise!, activeSet).length >= 100
                      }
                      onClick={() =>
                        applyCount(
                          String(
                            batchRows(activeExercise!, activeSet).length + 1
                          )
                        )
                      }
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <p className="canvas-inspector-note">{t.countHint}</p>
                  {activeSet.target && (
                    <div className="workout-target-options">
                      <strong>{t.target}</strong>
                      <p>
                        {workoutTargetLabel(activeSet, p.reps, p.setAmount)}
                      </p>
                      <small>{t.actualResultsHint}</small>
                    </div>
                  )}
                  <h3>
                    {p.set}{" "}
                    {(activeExercise
                      ? visibleSets(activeExercise).findIndex(
                          (s) => s.id === activeSet.id
                        )
                      : 0) + 1}
                  </h3>
                  <label htmlFor="workout-set-parent">{p.exercise}</label>
                  <select
                    id="workout-set-parent"
                    value={activeExercise?.id}
                    onChange={(e) => {
                      const parent = e.target.value
                      setExercises((v) =>
                        v.map((x) => ({
                          ...x,
                          sets:
                            x.id === parent
                              ? [
                                  ...x.sets.filter(
                                    (s) => s.batchId !== activeSet.batchId
                                  ),
                                  ...batchRows(activeExercise!, activeSet),
                                ]
                              : x.sets.filter(
                                  (s) => s.batchId !== activeSet.batchId
                                ),
                        }))
                      )
                    }}
                  >
                    {exercises.map((e) => (
                      <option key={e.id} value={e.id}>
                        {exerciseName(e)}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="workout-unit">{p.unit}</label>
                  <select
                    id="workout-unit"
                    value={activeSet.unit}
                    onChange={(e) => updateSet({ unit: e.target.value })}
                  >
                    {["rep", "km", "mi", "s"].map((u) => (
                      <option key={u} value={u}>
                        {u === "rep" ? p.repetitions : u}
                      </option>
                    ))}
                  </select>
                  {numberFields.map(([field, label, step]) => (
                    <div className="workout-number-field" key={field}>
                      <label htmlFor={`workout-${field}`}>{label}</label>
                      <input
                        id={`workout-${field}`}
                        type="number"
                        min={0}
                        max={field === "rir" ? 999.9 : 999999999.999}
                        step={step}
                        value={activeSet[field]}
                        placeholder={targetPlaceholder(field)}
                        onChange={(e) => updateSet({ [field]: e.target.value })}
                      />
                    </div>
                  ))}
                  <label htmlFor="workout-weight-unit">{t.weightUnit}</label>
                  <select
                    id="workout-weight-unit"
                    value={activeSet.weightUnit}
                    onChange={(e) => updateSet({ weightUnit: e.target.value })}
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                  {invalid && (
                    <p className="canvas-inspector-error" role="alert">
                      {t.invalidResult}
                    </p>
                  )}
                </>
              ) : activeExercise ? (
                <>
                  <h3>{p.exercise}</h3>
                  <p>{exerciseName(activeExercise)}</p>
                  <label htmlFor="workout-exercise-group">{p.group}</label>
                  <select
                    id="workout-exercise-group"
                    value={activeExercise.groupId}
                    onChange={(e) =>
                      setExercises((v) =>
                        v.map((x) =>
                          x.id === activeExercise.id
                            ? { ...x, groupId: e.target.value }
                            : x
                        )
                      )
                    }
                  >
                    {groups.map((g, i) => (
                      <option key={g.id} value={g.id}>
                        {g.name || `${p.group} ${i + 1}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="account-secondary"
                    onClick={() => setPicker(activeExercise.id)}
                  >
                    {p.chooseExercise}
                  </button>
                  <button
                    type="button"
                    className="account-secondary"
                    onClick={() => add("set", activeExercise.id)}
                  >
                    <Plus size={15} />
                    {t.addSet}
                  </button>
                  <p className="canvas-inspector-note">{t.reorderHint}</p>
                </>
              ) : null}
              {selection.kind !== "day" && (
                <button
                  className="workout-delete"
                  type="button"
                  onClick={() => remove()}
                >
                  <Trash2 size={15} />
                  {p.remove}
                </button>
              )}
            </div>
          </aside>
        </div>
        <footer className="workout-footer">
          <FilePenLine size={15} />
          {t.persistenceNote}
        </footer>
        <p className="sr-only" role="status" aria-live="polite">
          {notice}
        </p>
      </div>
      {ghost && (
        <div
          className="workout-drag-ghost"
          style={{ left: ghost.x + 14, top: ghost.y + 14 }}
        >
          {ghost.kind === "group" ? (
            <FolderOpen size={17} />
          ) : ghost.kind === "exercise" ? (
            <Dumbbell size={17} />
          ) : (
            <ListOrdered size={17} />
          )}{" "}
          {ghost.kind === "group"
            ? p.group
            : ghost.kind === "exercise"
              ? p.exercise
              : p.set}
        </div>
      )}
      {historyOpen && (
        <WorkoutHistory
          locale={locale}
          initialDate={date}
          copy={messages}
          catalog={catalog}
          onClose={() => setHistoryOpen(false)}
          onEdit={openSavedWorkout}
          onDeleted={(id) => {
            if (savedIdentity?.id === id) {
              setSavedIdentity(null)
              clientKey.current = ""
              setSavedSnapshot("")
            }
            setNotice(t.workoutDeleted)
          }}
        />
      )}
      {programPicker && (
        <ProgramDayPicker
          catalog={catalog}
          programs={programs}
          signedIn={signedIn}
          copy={messages}
          onClose={() => setProgramPicker(false)}
          onPick={importDay}
        />
      )}
      {picker && (
        <ExercisePicker
          catalog={catalog}
          currentId={exercises.find((e) => e.id === picker)?.exerciseId}
          copy={p}
          onClose={() => setPicker(null)}
          onPick={(e) => {
            setExercises((v) =>
              v.map((x) => (x.id === picker ? { ...x, exerciseId: e.id } : x))
            )
            setPicker(null)
          }}
        />
      )}
    </main>
  )
}
