"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import type { CanvasBlock } from "./canvas-layout"
import type { SavedProgram } from "@/lib/programs/validation"
import { normalizedDraft, saveableDraft } from "@/lib/programs/autosave"

export function useProgramAutosave({
  name,
  blocks,
  initialProgram,
  editing,
  locale,
  errorMessage,
}: {
  name: string
  blocks: CanvasBlock[]
  initialProgram?: SavedProgram
  editing: boolean
  locale: string
  errorMessage: string
}) {
  const [saved, setSaved] = useState(initialProgram)
  const [savedSnapshot, setSavedSnapshot] = useState(
    initialProgram
      ? JSON.stringify(
          normalizedDraft(initialProgram.name, initialProgram.blocks)
        )
      : ""
  )
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  const [errorKind, setErrorKind] = useState<"connection" | "save" | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const inFlight = useRef(false),
    lastAttempt = useRef("")
  const projected = saveableDraft(name, blocks, saved)
  const snapshot = projected.draft ? JSON.stringify(projected.draft) : ""
  const dirty = !!snapshot && snapshot !== savedSnapshot
  const save = useCallback(
    async (force = false) => {
      if (
        !editing ||
        !snapshot ||
        snapshot === savedSnapshot ||
        inFlight.current ||
        (!force && snapshot === lastAttempt.current)
      )
        return
      inFlight.current = true
      lastAttempt.current = snapshot
      setBusy(true)
      setError("")
      setErrorKind(null)
      let receivedResponse = false
      try {
        const response = await fetch(
          saved ? `/api/programs/${saved.id}` : "/api/programs",
          {
            method: saved ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...JSON.parse(snapshot),
              revision: saved?.revision,
            }),
            signal: AbortSignal.timeout(20000),
          }
        )
        receivedResponse = true
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || errorMessage)
        if (!mounted.current) return
        setSaved(data)
        setSavedSnapshot(snapshot)
        if (!saved)
          window.history.replaceState(
            null,
            "",
            `/${locale}/programs/${data.id}/edit`
          )
      } catch (e) {
        if (mounted.current)
          setErrorKind(receivedResponse ? "save" : "connection")
        if (mounted.current)
          setError(
            e instanceof Error && e.name !== "TimeoutError"
              ? e.message
              : errorMessage
          )
      } finally {
        inFlight.current = false
        if (mounted.current) setBusy(false)
      }
    },
    [editing, snapshot, savedSnapshot, saved, locale, errorMessage]
  )
  useEffect(() => {
    if (!editing || busy || !dirty || snapshot === lastAttempt.current) return
    const timer = window.setTimeout(() => {
      void save()
    }, 800)
    return () => window.clearTimeout(timer)
  }, [editing, busy, dirty, snapshot, save])
  useEffect(() => {
    if (!editing || errorKind !== "connection") return
    const retry = () => {
      void save(true)
    }
    window.addEventListener("online", retry)
    return () => window.removeEventListener("online", retry)
  }, [editing, errorKind, save])
  return {
    saved,
    busy,
    error,
    errorKind,
    dirty,
    skipped: projected.skipped,
  }
}
