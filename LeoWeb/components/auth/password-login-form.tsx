"use client"
import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react"
import { HeaderPreferences } from "@/components/landing/header-preferences"
import type { Locale, Messages } from "@/lib/i18n"
type Phase =
  | "checking"
  | "nickname"
  | "password"
  | "pending"
  | "denied"
  | "expired"
  | "signedIn"
export function PasswordLoginForm({
  locale,
  messages,
}: {
  locale: Locale
  messages: Messages
}) {
  const t = messages.login,
    router = useRouter()
  const [phase, setPhase] = useState<Phase>("checking")
  const [nickname, setNickname] = useState("")
  const [password, setPassword] = useState("")
  const [reference, setReference] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (phase !== "checking" && phase !== "pending") return
    const abort = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    async function poll() {
      try {
        const response = await fetch("/api/auth/password/status", {
          method: "POST",
          body: new URLSearchParams({ action: "status" }),
          signal: abort.signal,
        })
        const result = await response.json()
        if (abort.signal.aborted) return
        if (!response.ok) {
          setError(t[result.error as keyof typeof t] ?? t.unavailable)
          timer = setTimeout(poll, 3000)
          return
        }
        setError("")
        if (result.status === "pending") {
          setReference(result.reference)
          setExpiresAt(result.expiresAt)
          setPhase("pending")
          timer = setTimeout(poll, 2000)
        } else if (result.status === "signedIn") {
          setPhase("signedIn")
          router.replace(`/${locale}/profile`)
          router.refresh()
        } else
          setPhase(
            result.status === "denied"
              ? "denied"
              : result.status === "none" && phase === "checking"
                ? "nickname"
                : "expired"
          )
      } catch {
        if (!abort.signal.aborted) {
          setError(t.unavailable)
          timer = setTimeout(poll, 3000)
        }
      }
    }
    void poll()
    return () => {
      abort.abort()
      clearTimeout(timer)
    }
  }, [phase, locale, router, t])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (phase === "nickname") {
      setNickname(nickname.trim())
      setPhase("password")
      return
    }
    setBusy(true)
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        body: new URLSearchParams({ nickname, password, locale }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(t[result.error as keyof typeof t] ?? t.unavailable)
        return
      }
      setPassword("")
      setReference(result.reference)
      setExpiresAt(result.expiresAt)
      setPhase("pending")
    } catch {
      setError(t.unavailable)
    } finally {
      setBusy(false)
    }
  }
  async function cancel() {
    setBusy(true)
    try {
      const response = await fetch("/api/auth/password/status", {
        method: "POST",
        body: new URLSearchParams({ action: "cancel" }),
      })
      if (!response.ok) {
        setError(t.unavailable)
        return
      }
      setPhase("nickname")
      setPassword("")
      setError("")
    } catch {
      setError(t.unavailable)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="account-page login-page">
      <header className="account-topbar">
        <Link className="account-brand" href={`/${locale}`}>
          <Image src="/brand/leo-web.png" alt="" width={46} height={54} />
          <span>LeoLifter.</span>
        </Link>
        <HeaderPreferences locale={locale} copy={messages} />
      </header>
      <div className="login-container">
        <Link className="account-back" href={`/${locale}`}>
          <ArrowLeft size={15} />
          {t.home}
        </Link>
        <section className="login-card" aria-busy={busy}>
          <div className="login-symbol">
            {phase === "pending" ? (
              <Smartphone size={27} />
            ) : phase === "denied" || phase === "expired" ? (
              <X size={27} />
            ) : phase === "signedIn" ? (
              <Check size={27} />
            ) : (
              <ShieldCheck size={27} />
            )}
          </div>
          <h1>
            {phase === "pending"
              ? t.pendingTitle
              : phase === "denied"
                ? t.deniedTitle
                : phase === "expired"
                  ? t.expiredTitle
                  : t.title}
          </h1>
          <p>
            {phase === "pending"
              ? t.pendingBody
              : phase === "denied"
                ? t.deniedBody
                : phase === "expired"
                  ? t.expiredBody
                  : t.subtitle}
          </p>
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          {(phase === "checking" || phase === "signedIn") && (
            <p role="status">
              {phase === "checking" ? t.checking : t.approved}
            </p>
          )}
          {(phase === "nickname" || phase === "password") && (
            <form onSubmit={submit}>
              <fieldset disabled={busy}>
                <div className="login-steps" aria-label={t.title}>
                  <span data-active={phase === "nickname"}>
                    1 · {t.nickname}
                  </span>
                  <span data-active={phase === "password"}>
                    2 · {t.password}
                  </span>
                  <span>3 · Telegram</span>
                </div>
                {phase === "nickname" ? (
                  <div className="account-field">
                    <label htmlFor="login-nickname">{t.nickname}</label>
                    <input
                      id="login-nickname"
                      name="nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      required
                      maxLength={100}
                      autoComplete="username"
                    />
                  </div>
                ) : (
                  <>
                    <p className="login-nickname">{nickname}</p>
                    <input
                      type="hidden"
                      autoComplete="username"
                      name="nickname"
                      value={nickname}
                    />
                    <div className="account-field">
                      <label htmlFor="login-password">{t.password}</label>
                      <input
                        id="login-password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        maxLength={128}
                        autoComplete="current-password"
                        aria-describedby="password-help"
                      />
                      <small id="password-help">{t.passwordHint}</small>
                    </div>
                  </>
                )}
                <button className="account-primary" type="submit">
                  {busy ? t.checking : phase === "nickname" ? t.next : t.submit}
                </button>
                {phase === "password" && (
                  <button
                    type="button"
                    className="login-back"
                    onClick={() => {
                      setPhase("nickname")
                      setPassword("")
                      setError("")
                    }}
                  >
                    {t.back}
                  </button>
                )}
              </fieldset>
            </form>
          )}
          {phase === "pending" && (
            <>
              <div className="login-reference">
                <span>{t.reference}</span>
                <strong>{reference}</strong>
                <small>
                  {t.expires}:{" "}
                  <time dateTime={expiresAt}>
                    {new Intl.DateTimeFormat(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "UTC",
                    }).format(new Date(expiresAt))}{" "}
                    UTC
                  </time>
                </small>
              </div>
              <p className="login-private-note">
                <LockKeyhole size={15} />
                {t.privateNote}
              </p>
              <button
                className="account-secondary"
                disabled={busy}
                onClick={() => void cancel()}
              >
                {t.cancel}
              </button>
            </>
          )}
          {(phase === "denied" || phase === "expired") && (
            <button
              className="account-primary"
              onClick={() => {
                setPhase("nickname")
                setError("")
              }}
            >
              {t.retry}
            </button>
          )}
        </section>
        <p className="login-telegram-help">{t.telegramHelp}</p>
      </div>
    </main>
  )
}
