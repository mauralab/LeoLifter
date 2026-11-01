"use client"

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react"

export type ThemePreference = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"
const changeEvent = "leolifter:theme-change"
let fallbackPreference: ThemePreference = "system"

function getPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem("theme")
    return saved === "light" || saved === "dark" ? saved : "system"
  } catch {
    return fallbackPreference
  }
}

function getSnapshot(): ResolvedTheme {
  const preference = getPreference()
  return preference === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : preference
}

function applyTheme() {
  const theme = getSnapshot()
  document.documentElement.classList.remove("light", "dark")
  document.documentElement.classList.add(theme)
  document.documentElement.style.colorScheme = theme
}

function subscribe(notify: () => void) {
  const update = () => {
    applyTheme()
    notify()
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === "theme" || event.key === null) update()
  }
  const media = window.matchMedia("(prefers-color-scheme: dark)")
  window.addEventListener(changeEvent, update)
  window.addEventListener("storage", onStorage)
  media.addEventListener("change", update)
  return () => {
    window.removeEventListener(changeEvent, update)
    window.removeEventListener("storage", onStorage)
    media.removeEventListener("change", update)
  }
}

function setTheme(theme: ThemePreference) {
  fallbackPreference = theme
  try {
    localStorage.setItem("theme", theme)
  } catch {
    /* Private browsing can block storage. */
  }
  applyTheme()
  window.dispatchEvent(new Event(changeEvent))
}

const ThemeContext = createContext<{
  resolvedTheme: ResolvedTheme
  setTheme: typeof setTheme
} | null>(null)
const getServerSnapshot = (): ResolvedTheme => "light"

/** Browser preference store only; rendering this provider never inserts a script. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  useEffect(() => {
    applyTheme()
  }, [resolvedTheme])
  return (
    <ThemeContext.Provider value={{ resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme requires ThemeProvider")
  return context
}
