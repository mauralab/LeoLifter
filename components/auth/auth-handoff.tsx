"use client"

import { useEffect, useRef } from "react"

/** A blank hand-off: GET/prefetch never signs in; only the browser's same-origin POST does. */
export function AuthHandoff({
  action,
  fields,
}: {
  action: string
  fields: Record<string, string>
}) {
  const form = useRef<HTMLFormElement>(null)
  const submitted = useRef(false)
  useEffect(() => {
    if (submitted.current) return
    submitted.current = true
    window.history.replaceState(null, "", window.location.pathname)
    form.current?.requestSubmit()
  }, [])
  return (
    <form ref={form} action={action} method="post">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <noscript>
        <button type="submit">
          Continue / Продовжити / Fortsett / Weiter / Dalej
        </button>
      </noscript>
    </form>
  )
}
