// External React script resource: safe on both initial loads and client navigation.
// Keep this first-paint preference logic aligned with components/theme-provider.tsx.
;(() => {
  let preference = "system"
  try {
    const saved = localStorage.getItem("theme")
    if (saved === "light" || saved === "dark") preference = saved
  } catch {
    /* Storage is optional; respect the device preference. */
  }
  const theme =
    preference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference
  document.documentElement.classList.remove("light", "dark")
  document.documentElement.classList.add(theme)
  document.documentElement.style.colorScheme = theme
})()
