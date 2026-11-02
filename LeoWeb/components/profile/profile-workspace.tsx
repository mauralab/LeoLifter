"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Laptop,
  LockKeyhole,
  LogOut,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { HeaderPreferences } from "@/components/landing/header-preferences"
import { type Locale, type Messages, languages, locales } from "@/lib/i18n"
import type { ProfileData } from "@/lib/profile/store"

type Tab = "profile" | "settings" | "password" | "sessions"
export function ProfileWorkspace({
  data,
  locale,
  messages,
  initialTab,
  today,
  timezones,
}: {
  data: ProfileData
  locale: Locale
  messages: Messages
  initialTab: Tab
  today: string
  timezones: string[]
}) {
  const t = messages.account
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [invalid, setInvalid] = useState<string[]>([])
  const tabs = [
    { key: "profile", icon: UserRound },
    { key: "settings", icon: Settings2 },
    { key: "password", icon: LockKeyhole },
    { key: "sessions", icon: Laptop },
  ] as const
  const date = (value: string) =>
    new Intl.DateTimeFormat(
      locale === "uk" ? "uk-UA" : locale === "nb" ? "nb-NO" : locale,
      {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: (() => {
          try {
            new Intl.DateTimeFormat("en", {
              timeZone: data.profile.timezone || "UTC",
            })
            return data.profile.timezone || "UTC"
          } catch {
            return "UTC"
          }
        })(),
      }
    ).format(new Date(value))
  async function send(form: URLSearchParams, element?: HTMLFormElement) {
    setBusy(true)
    setNotice("")
    setError("")
    setInvalid([])
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        body: form,
      })
      const result = await response.json()
      if (!response.ok) {
        setError(t[result.error as keyof typeof t] ?? t.unavailable)
        setInvalid(result.fields ?? [])
        return
      }
      if (result.signedOut) {
        router.replace(`/${locale}`)
        return
      }
      const action = form.get("action")
      setNotice(
        action === "password"
          ? t.passwordSaved
          : action?.startsWith("revoke")
            ? t.sessionSaved
            : t.saved
      )
      if (action === "password") element?.reset()
      if (action === "settings" && form.get("language") !== locale) {
        router.push(`/${form.get("language")}/profile?tab=settings`)
      } else router.refresh()
    } catch {
      setError(t.unavailable)
    } finally {
      setBusy(false)
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    void send(
      new URLSearchParams(
        Array.from(new FormData(form).entries()) as [string, string][]
      ),
      form
    )
  }
  function revoke(id?: string) {
    if (!window.confirm(id ? t.confirmRevoke : t.confirmOthers)) return
    void send(
      new URLSearchParams({
        action: id ? "revoke" : "revokeOthers",
        ...(id ? { sessionId: id } : {}),
      })
    )
  }
  function field(
    name: string,
    label: string,
    control: ReactNode,
    hint?: string
  ) {
    return (
      <div
        className="account-field"
        data-invalid={invalid.includes(name) || undefined}
      >
        <label htmlFor={`account-${name}`}>{label}</label>
        {control}
        {hint && <small id={`hint-${name}`}>{hint}</small>}
      </div>
    )
  }
  const attributes = (name: string) => ({
    id: `account-${name}`,
    name,
    "aria-invalid": invalid.includes(name) || undefined,
  })
  return (
    <main className="account-page">
      <header className="account-topbar">
        <Link className="account-brand" href={`/${locale}`}>
          <Image src="/brand/leo-web.png" alt="" width={46} height={54} />
          <span>
            LeoLifter<span className="account-brand-dot">.</span>
          </span>
        </Link>
        <HeaderPreferences locale={locale} copy={messages} />
      </header>
      <div className="account-container">
        <Link className="account-back" href={`/${locale}`}>
          <ArrowLeft size={15} />
          {t.back}
        </Link>
        <div className="account-intro">
          <div>
            <p className="account-eyebrow">{t.profileTag}</p>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <div className="account-identity">
            <div className="account-avatar">
              {data.nickname.slice(0, 1).toLocaleUpperCase(locale)}
            </div>
            <div>
              <strong>{data.nickname}</strong>
              {data.telegramLinked && (
                <span>
                  <ShieldCheck size={13} />
                  {t.linked}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="account-shell">
          <aside className="account-sidebar">
            <nav aria-label={t.title}>
              {tabs.map(({ key, icon: Icon }) => (
                <button
                  type="button"
                  key={key}
                  aria-current={tab === key ? "page" : undefined}
                  disabled={busy}
                  onClick={() => {
                    setTab(key)
                    setNotice("")
                    setError("")
                    setInvalid([])
                  }}
                >
                  <Icon size={18} />
                  <span>{t[key]}</span>
                  {key === "sessions" && (
                    <span className="account-count">{data.total}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="account-sidebar-bottom">
              <ShieldCheck size={20} />
              <p>{t.security}</p>
              <span>{data.hasPassword ? t.hasPassword : t.noPassword}</span>
            </div>
            <form action="/api/auth/logout" method="post">
              <input type="hidden" name="locale" value={locale} />
              <button disabled={busy} type="submit" className="account-signout">
                <LogOut size={16} />
                {t.signOut}
              </button>
            </form>
          </aside>
          <div className="account-content" aria-busy={busy}>
            <div className="account-feedback" aria-live="polite">
              {notice && (
                <p role="status" className="account-success">
                  <Check size={16} />
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="account-error">
                  {error}
                  {invalid.length > 0 && tab === "profile" && (
                    <small>{t.validationHint}</small>
                  )}
                </p>
              )}
            </div>
            <section
              hidden={tab !== "profile"}
              aria-labelledby="profile-heading"
            >
              <div className="account-section-heading">
                <UserRound size={20} />
                <div>
                  <h2 id="profile-heading">{t.personalTitle}</h2>
                  <p>{t.personalNote}</p>
                </div>
              </div>
              <form onSubmit={submit}>
                <input type="hidden" name="action" value="profile" />
                <fieldset disabled={busy} className="account-form-grid">
                  {field(
                    "nickname",
                    `${t.nickname} *`,
                    <input
                      {...attributes("nickname")}
                      defaultValue={data.profile.nickname}
                      required
                      maxLength={100}
                      autoComplete="nickname"
                    />
                  )}
                  {field(
                    "birthDate",
                    t.birthDate,
                    <input
                      {...attributes("birthDate")}
                      type="date"
                      defaultValue={data.profile.birthDate}
                      min="1900-01-01"
                      max={today}
                      autoComplete="bday"
                    />
                  )}
                  {field(
                    "sex",
                    t.sex,
                    <select
                      {...attributes("sex")}
                      defaultValue={data.profile.sex}
                    >
                      <option value="">{t.notSpecified}</option>
                      <option value="male">{t.male}</option>
                      <option value="female">{t.female}</option>
                      <option value="other">{t.other}</option>
                      {data.profile.sex &&
                        !["male", "female", "other"].includes(
                          data.profile.sex
                        ) && (
                          <option value={data.profile.sex}>
                            {data.profile.sex}
                          </option>
                        )}
                    </select>
                  )}
                  <div className="account-height">
                    {field(
                      "height",
                      t.height,
                      <input
                        {...attributes("height")}
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        max="99999.99"
                        step="0.01"
                        defaultValue={data.profile.height}
                        placeholder="175"
                      />
                    )}
                    {field(
                      "heightUnit",
                      t.heightUnit,
                      <select
                        {...attributes("heightUnit")}
                        key={data.profile.heightUnit}
                        defaultValue={data.profile.heightUnit}
                      >
                        {["", "cm", "m", "in", "ft"].map((unit) => (
                          <option key={unit || "unspecified"} value={unit}>
                            {unit || "—"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {field(
                    "country",
                    t.country,
                    <input
                      {...attributes("country")}
                      defaultValue={data.profile.country}
                      maxLength={2}
                      pattern="[a-zA-Z]{2}"
                      autoComplete="country"
                      placeholder="UA"
                      aria-describedby="hint-country"
                    />,
                    t.countryHint
                  )}
                  {field(
                    "city",
                    t.city,
                    <input
                      {...attributes("city")}
                      defaultValue={data.profile.city}
                      maxLength={100}
                      autoComplete="address-level2"
                    />
                  )}
                  {field(
                    "timezone",
                    t.timezone,
                    <>
                      <input
                        {...attributes("timezone")}
                        defaultValue={data.profile.timezone}
                        list="timezones"
                        maxLength={100}
                        placeholder="Europe/Kyiv"
                        aria-describedby="hint-timezone"
                      />
                      <datalist id="timezones">
                        {[
                          "UTC",
                          ...timezones,
                          ...(data.profile.timezone
                            ? [data.profile.timezone]
                            : []),
                        ]
                          .filter((v, i, list) => list.indexOf(v) === i)
                          .map((zone) => (
                            <option key={zone}>{zone}</option>
                          ))}
                      </datalist>
                    </>,
                    t.timezoneHint
                  )}
                </fieldset>
                <div className="account-form-footer">
                  <span />
                  <button className="account-primary" disabled={busy}>
                    {busy ? t.saving : t.save}
                  </button>
                </div>
              </form>
            </section>
            <section
              hidden={tab !== "settings"}
              aria-labelledby="settings-heading"
            >
              <div className="account-section-heading">
                <Settings2 size={20} />
                <div>
                  <h2 id="settings-heading">{t.settingsTitle}</h2>
                  <p>{t.settingsNote}</p>
                </div>
              </div>
              <form onSubmit={submit}>
                <input type="hidden" name="action" value="settings" />
                <fieldset disabled={busy} className="account-form-grid">
                  {field(
                    "language",
                    t.language,
                    <select
                      {...attributes("language")}
                      defaultValue={data.settings.language}
                    >
                      {locales.map((value) => (
                        <option key={value} value={value}>
                          {languages[value]}
                        </option>
                      ))}
                    </select>
                  )}
                  {field(
                    "weightMeasureUnit",
                    t.weightMeasureUnit,
                    <select
                      {...attributes("weightMeasureUnit")}
                      defaultValue={data.settings.weightMeasureUnit}
                    >
                      {["kg", "lb"].map((unit) => (
                        <option key={unit}>{unit}</option>
                      ))}
                    </select>
                  )}
                  {field(
                    "lengthMeasureUnit",
                    t.lengthMeasureUnit,
                    <select
                      {...attributes("lengthMeasureUnit")}
                      defaultValue={data.settings.lengthMeasureUnit}
                    >
                      {["cm", "m", "in", "ft"].map((unit) => (
                        <option key={unit}>{unit}</option>
                      ))}
                    </select>
                  )}
                </fieldset>
                <div className="account-form-footer">
                  <Globe2 size={18} />
                  <button className="account-primary" disabled={busy}>
                    {busy ? t.saving : t.save}
                  </button>
                </div>
              </form>
            </section>
            <section
              hidden={tab !== "password"}
              aria-labelledby="password-heading"
            >
              <div className="account-section-heading">
                <LockKeyhole size={20} />
                <div>
                  <h2 id="password-heading">{t.passwordTitle}</h2>
                  <p>{t.passwordNote}</p>
                </div>
              </div>
              <p className="account-password-status">
                <ShieldCheck size={16} />
                {data.hasPassword ? t.hasPassword : t.noPassword}
              </p>
              <form onSubmit={submit}>
                <input type="hidden" name="action" value="password" />
                <fieldset disabled={busy} className="account-password-form">
                  {data.hasPassword ? (
                    field(
                      "currentPassword",
                      t.currentPassword,
                      <input
                        {...attributes("currentPassword")}
                        type="password"
                        required
                        autoComplete="current-password"
                        maxLength={128}
                      />
                    )
                  ) : (
                    <input type="hidden" name="currentPassword" value="" />
                  )}
                  {field(
                    "password",
                    t.newPassword,
                    <input
                      {...attributes("password")}
                      type="password"
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      aria-describedby="hint-password"
                    />,
                    t.passwordHint
                  )}
                  {field(
                    "confirmPassword",
                    t.confirmPassword,
                    <input
                      {...attributes("confirmPassword")}
                      type="password"
                      required
                      maxLength={128}
                      autoComplete="new-password"
                    />
                  )}
                </fieldset>
                <div className="account-form-footer">
                  <span />
                  <button className="account-primary" disabled={busy}>
                    {busy
                      ? t.saving
                      : data.hasPassword
                        ? t.changePassword
                        : t.setPassword}
                  </button>
                </div>
              </form>
            </section>
            <section
              hidden={tab !== "sessions"}
              aria-labelledby="sessions-heading"
            >
              <div className="account-section-heading">
                <Laptop size={20} />
                <div>
                  <h2 id="sessions-heading">{t.sessionsTitle}</h2>
                  <p>{t.sessionsNote}</p>
                </div>
              </div>
              <div className="account-session-actions">
                <button
                  className="account-secondary"
                  disabled={busy}
                  onClick={() => revoke()}
                >
                  {t.revokeOthers}
                </button>
              </div>
              <div className="account-session-list">
                {data.sessions.map((session) => {
                  const status = session.status
                  return (
                    <article key={session.id} className="account-session">
                      <div className="account-device-icon">
                        <Laptop size={22} />
                      </div>
                      <div className="account-session-body">
                        <h3>
                          {session.device || t.unknownDevice}
                          {session.current && (
                            <span className="account-current">{t.current}</span>
                          )}
                        </h3>
                        <p>
                          <span className={`account-session-status ${status}`}>
                            {t[status]}
                          </span>
                        </p>
                        <dl>
                          <div>
                            <dt>{t.created}</dt>
                            <dd>{date(session.createdAt)}</dd>
                          </div>
                          <div>
                            <dt>{t.lastUsed}</dt>
                            <dd>{date(session.updatedAt)}</dd>
                          </div>
                          <div>
                            <dt>{t.expires}</dt>
                            <dd>{date(session.expiresAt)}</dd>
                          </div>
                        </dl>
                      </div>
                      {status === "active" && (
                        <button
                          disabled={busy}
                          className="account-revoke"
                          onClick={() => revoke(session.id)}
                        >
                          {t.revoke}
                        </button>
                      )}
                    </article>
                  )
                })}
                {!data.sessions.length && <p>{t.emptySessions}</p>}
              </div>
              <nav className="account-pagination" aria-label={t.sessions}>
                <Link
                  aria-disabled={data.page <= 1 || busy}
                  tabIndex={data.page <= 1 || busy ? -1 : undefined}
                  href={`/${locale}/profile?tab=sessions&page=${Math.max(1, data.page - 1)}`}
                >
                  <ChevronLeft size={16} />
                  {t.previous}
                </Link>
                <span>
                  {t.page} {data.page} {t.of} {data.pages}
                </span>
                <Link
                  aria-disabled={data.page >= data.pages || busy}
                  tabIndex={data.page >= data.pages || busy ? -1 : undefined}
                  href={`/${locale}/profile?tab=sessions&page=${Math.min(data.pages, data.page + 1)}`}
                >
                  {t.next}
                  <ChevronRight size={16} />
                </Link>
              </nav>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
