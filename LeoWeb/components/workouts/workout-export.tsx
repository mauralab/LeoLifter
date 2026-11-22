"use client"
import { useState } from "react"
import { Download, ClipboardCopy } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { Messages } from "@/lib/i18n"
import {
  workoutText,
  workoutExcel,
  type WorkoutExportDraft,
} from "@/lib/workouts/export"
import { fileBase } from "@/components/programs/program-export-data"
export function WorkoutExport({
  draft,
  copy,
}: {
  draft: WorkoutExportDraft
  copy: Messages
}) {
  const t = copy.workouts,
    p = copy.programs
  const [open, setOpen] = useState(false),
    [username, setUsername] = useState(draft.username),
    [format, setFormat] = useState("txt"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("")
  const snapshot = { ...draft, username }
  const text = workoutText(snapshot, p.exercise)
  async function download() {
    setBusy(true)
    setError("")
    setStatus("")
    try {
      const data =
        format === "txt"
          ? text
          : await workoutExcel(snapshot, {
              exercise: p.exercise,
              group: p.group,
              repeatCount: p.repeatCount,
              set: p.set,
              result: t.result,
              weight: t.weight,
              timeSpent: t.timeSpent,
              rir: t.rir,
              summary: t.exportSummary,
            })
      const blob = new Blob([data], {
        type:
          format === "txt"
            ? "text/plain;charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob),
        link = document.createElement("a")
      link.href = url
      link.download = `${fileBase(draft.title)}.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch {
      setError(t.exportWorkoutError)
    } finally {
      setBusy(false)
    }
  }
  async function copyText() {
    setError("")
    setStatus("")
    try {
      await navigator.clipboard.writeText(text)
      setStatus(t.workoutCopied)
    } catch {
      setError(t.exportWorkoutError)
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("")
          setStatus("")
          setOpen(true)
        }}
      >
        <Download size={16} />
        {t.exportWorkout}
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value)
        }}
      >
        <DialogContent className="program-export-dialog workout-export-dialog">
          <DialogHeader>
            <DialogTitle>{t.exportWorkout}</DialogTitle>
            <DialogDescription>{t.exportHint}</DialogDescription>
          </DialogHeader>
          <label htmlFor="workout-export-user">{t.exportUsername}</label>
          <input
            id="workout-export-user"
            value={username}
            maxLength={100}
            disabled={busy}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label htmlFor="workout-export-format">{p.fileFormat}</label>
          <select
            id="workout-export-format"
            value={format}
            disabled={busy}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="txt">{p.textFile}</option>
            <option value="xlsx">{p.excelFile}</option>
          </select>
          <textarea
            className="workout-export-preview"
            aria-label={t.exportSummary}
            value={text}
            readOnly
            rows={9}
          />
          {error && <p role="alert">{error}</p>}
          {status && <p role="status">{status}</p>}
          <div className="workout-export-actions">
            <button
              type="button"
              className="account-secondary"
              disabled={busy}
              onClick={() => void copyText()}
            >
              <ClipboardCopy size={16} />
              {t.copyWorkout}
            </button>
            <button
              type="button"
              className="account-primary"
              disabled={busy}
              onClick={() => void download()}
            >
              <Download size={16} />
              {busy ? p.exporting : p.download}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
