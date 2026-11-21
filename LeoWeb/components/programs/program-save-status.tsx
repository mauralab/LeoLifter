import {
  CircleCheck,
  LoaderCircle,
  CloudOff,
  CircleAlert,
  Clock3,
} from "lucide-react"
import type { Messages } from "@/lib/i18n"
export function ProgramSaveStatus({
  busy,
  error,
  errorKind,
  dirty,
  skipped,
  copy: t,
}: {
  busy: boolean
  error: string
  errorKind: "connection" | "save" | null
  dirty: boolean
  skipped: boolean
  copy: Messages["programs"]
}) {
  const state = busy
    ? "saving"
    : error
      ? errorKind === "connection"
        ? "connection"
        : "error"
      : skipped
        ? "incomplete"
        : dirty
          ? "pending"
          : "saved"
  const Icon =
    state === "saving"
      ? LoaderCircle
      : state === "connection"
        ? CloudOff
        : state === "error" || state === "incomplete"
          ? CircleAlert
          : state === "pending"
            ? Clock3
            : CircleCheck
  const label = {
    saving: t.saving,
    connection: t.connectionError,
    error: t.saveError,
    incomplete: t.pendingValidation,
    pending: t.pendingSave,
    saved: t.saved,
  }[state]
  return (
    <span
      className="program-save-status"
      data-state={state}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      title={error ? `${label}: ${error}` : label}
    >
      <Icon size={19} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
