"use client"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowUpRight, Layers3, Plus } from "lucide-react"
import { HeaderPreferences } from "@/components/landing/header-preferences"
import { TrainingNavigation } from "@/components/navigation/training-navigation"
import type { Locale, Messages } from "@/lib/i18n"

export function ProgramWorkspace({
  locale,
  messages,
  editing = false,
}: {
  locale: Locale
  messages: Messages
  editing?: boolean
}) {
  const [name, setName] = useState("")
  const t = messages.programs
  return (
    <main className="account-page programs-page">
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
          current="programs"
        />
        <HeaderPreferences locale={locale} copy={messages} />
      </header>
      <div className="exercise-container">
        <Link
          className="account-back"
          href={editing ? `/${locale}/programs` : `/${locale}`}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          {editing ? t.back : messages.account.back}
        </Link>
        <div className="exercise-intro">
          <div>
            <p className="account-eyebrow">{t.eyebrow}</p>
            <h1>{editing ? t.create : t.title}</h1>
            <p>{editing ? t.editorIntro : t.intro}</p>
          </div>
          {editing ? (
            <span className="program-draft">
              <span />
              {t.draft}
            </span>
          ) : (
            <Link
              className="account-primary exercise-create-link"
              href={`/${locale}/programs/create`}
            >
              <Plus size={16} aria-hidden="true" />
              {t.create}
            </Link>
          )}
        </div>
        {editing ? (
          <section className="program-editor" aria-label={t.create}>
            <div className="program-tabbar" role="tablist" aria-label={t.title}>
              <button
                id="program-general-tab"
                className="program-tab"
                type="button"
                role="tab"
                aria-selected="true"
                aria-controls="program-general-panel"
              >
                <Layers3 size={16} aria-hidden="true" />
                {t.tab}
              </button>
              <span className="program-tab-title">
                {name.trim() || t.untitled}
              </span>
            </div>
            <div
              id="program-general-panel"
              className="program-panel"
              role="tabpanel"
              aria-labelledby="program-general-tab"
            >
              <div className="program-panel-icon">
                <Layers3 size={25} strokeWidth={1.4} aria-hidden="true" />
              </div>
              <div className="account-field">
                <label htmlFor="program-name">{t.name}</label>
                <input
                  id="program-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                  placeholder={t.namePlaceholder}
                  aria-describedby="program-name-hint"
                  autoComplete="off"
                />
                <div className="program-field-meta">
                  <small id="program-name-hint">{t.nameHint}</small>
                  <span>{name.length} / 200</span>
                </div>
              </div>
            </div>
            <footer className="program-editor-footer">
              <span className="program-draft-dot" />
              {t.draftNote}
            </footer>
          </section>
        ) : (
          <section
            className="program-empty"
            aria-labelledby="program-empty-heading"
          >
            <div className="program-empty-icon">
              <Layers3 size={30} strokeWidth={1.3} aria-hidden="true" />
            </div>
            <h2 id="program-empty-heading">{t.emptyTitle}</h2>
            <p>{t.emptyBody}</p>
            <Link
              className="account-secondary exercise-create-link"
              href={`/${locale}/programs/create`}
            >
              {t.create}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </section>
        )}
      </div>
    </main>
  )
}
