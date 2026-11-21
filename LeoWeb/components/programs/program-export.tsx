"use client"
import { useState } from "react"
import { Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  exportExcel,
  exportText,
  fileBase,
  type ProgramDraft,
} from "./program-export-data"
export function ProgramExport({
  name,
  blocks,
  catalog,
  copy: t,
}: ProgramDraft) {
  const [open, setOpen] = useState(false),
    [filename, setFilename] = useState(""),
    [format, setFormat] = useState("txt"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  async function download() {
    setBusy(true)
    setError("")
    try {
      const draft = {
        name,
        blocks: blocks.map((b) => ({ ...b })),
        catalog,
        copy: t,
        exportedAt: new Date().toISOString(),
      }
      const data =
        format === "txt" ? exportText(draft) : await exportExcel(draft)
      const blob = new Blob([data], {
        type:
          format === "txt"
            ? "text/plain;charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob),
        link = document.createElement("a")
      link.href = url
      link.download = `${fileBase(filename || name)}.${format === "txt" ? "txt" : "xlsx"}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
      setOpen(false)
    } catch {
      setError(t.exportError)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button
        type="button"
        className="canvas-save-as"
        aria-label={t.saveAs}
        onClick={() => {
          setFilename(name || t.untitled)
          setError("")
          setOpen(true)
        }}
      >
        <Download size={14} />
        <span>{t.saveAs}</span>
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value)
        }}
      >
        <DialogContent className="program-export-dialog">
          <DialogHeader>
            <DialogTitle>{t.exportTitle}</DialogTitle>
            <DialogDescription>{t.exportIntro}</DialogDescription>
          </DialogHeader>
          <label htmlFor="export-name">{t.fileName}</label>
          <input
            id="export-name"
            value={filename}
            maxLength={100}
            onChange={(e) => setFilename(e.target.value)}
            disabled={busy}
          />
          <label htmlFor="export-format">{t.fileFormat}</label>
          <select
            id="export-format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={busy}
          >
            <option value="txt">{t.textFile}</option>
            <option value="xlsx">{t.excelFile}</option>
          </select>
          {error && (
            <p className="canvas-inspector-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="account-primary"
            disabled={busy}
            onClick={download}
          >
            <Download size={15} />
            {busy ? t.exporting : t.download}
          </button>
        </DialogContent>
      </Dialog>
    </>
  )
}
