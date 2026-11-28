"use client"
import type { CanvasBlock, ExerciseOption } from "./canvas-layout"
import { ProgramCard } from "./program-card"
import { ProgramDescriptionEditor } from "./program-description-editor"
import type { ProgramDescription } from "@/lib/programs/validation"
import { ProgramSaveStatus } from "./program-save-status"
import { ProgramCanvas } from "./program-canvas"
import { useState } from "react"
import Link from "next/link"
import { useProgramAutosave } from "./use-program-autosave"
import Image from "next/image"
import { ArrowLeft, ArrowUpRight, Layers3, Plus } from "lucide-react"
import { HeaderPreferences } from "@/components/landing/header-preferences"
import { TrainingNavigation } from "@/components/navigation/training-navigation"
import type { SavedProgram, ProgramSummary } from "@/lib/programs/validation"
import type { Locale, Messages } from "@/lib/i18n"

export function ProgramWorkspace({
  locale,
  messages,
  editing = false,
  catalog = [],
  initialProgram,
  programs = [],
  languages = [],
}: {
  locale: Locale
  messages: Messages
  editing?: boolean
  catalog?: ExerciseOption[]
  initialProgram?: SavedProgram
  programs?: ProgramSummary[]
  languages?: { id: string; code: string; nativeName: string }[]
}) {
  const [query, setQuery] = useState("")
  const filteredPrograms = programs.filter((p) =>
    p.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  )
  const [name, setName] = useState(initialProgram?.name ?? "")
  const [blocks, setBlocks] = useState<CanvasBlock[]>(
    initialProgram?.blocks ?? []
  )
  const [descriptions, setDescriptions] = useState<ProgramDescription[]>(
    initialProgram?.descriptions ?? []
  )
  const t = messages.programs
  const { saved, busy, error, errorKind, dirty, skipped } = useProgramAutosave({
    name,
    blocks,
    descriptions,
    initialProgram,
    editing,
    locale,
    errorMessage: t.saveError,
  })
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(filteredPrograms.length / 12))
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
      <div
        className={`exercise-container ${editing ? "program-builder-container" : ""}`}
      >
        <Link
          prefetch={false}
          className="account-back"
          href={editing ? `/${locale}/programs` : `/${locale}`}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          {editing ? t.back : messages.account.back}
        </Link>
        <div className="exercise-intro">
          <div>
            <p className="account-eyebrow">{t.eyebrow}</p>
            <h1>{editing ? (saved ? t.edit : t.create) : t.title}</h1>
            <p>{editing ? t.editorIntro : t.intro}</p>
          </div>
          {editing ? null : (
            <Link
              prefetch={false}
              className="account-primary exercise-create-link"
              href={`/${locale}/programs/create`}
            >
              <Plus size={16} aria-hidden="true" />
              {t.create}
            </Link>
          )}
        </div>
        {editing ? (
          <section
            className="program-editor"
            aria-label={saved ? t.edit : t.create}
          >
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
              className="program-panel program-name-panel"
              role="tabpanel"
              aria-labelledby="program-general-tab"
            >
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
            <ProgramDescriptionEditor
              locale={locale}
              copy={messages}
              languages={languages}
              descriptions={descriptions}
              onChange={setDescriptions}
            />
            <ProgramCanvas
              copy={t}
              catalog={catalog}
              programName={name}
              blocks={blocks}
              setBlocks={setBlocks}
              saveStatus={
                <ProgramSaveStatus
                  busy={busy}
                  error={error}
                  errorKind={errorKind}
                  dirty={dirty}
                  skipped={skipped}
                  copy={t}
                />
              }
            />
            {error && (
              <p role="alert" className="account-error">
                {error}
              </p>
            )}
            <footer className="program-editor-footer">
              <span className="program-draft-dot" />
              {skipped ? t.waitingForValid : t.autosaveNote}
            </footer>
          </section>
        ) : programs.length ? (
          <section aria-label={t.myPrograms}>
            <div className="program-list-heading">
              <h2>
                {t.myPrograms} <small>({programs.length})</small>
              </h2>
              <input
                type="search"
                aria-label={t.searchPrograms}
                placeholder={t.searchPrograms}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="exercise-grid program-card-grid">
              {filteredPrograms
                .slice((page - 1) * 12, page * 12)
                .map((program) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    copy={t}
                    href={`/${locale}/programs/${program.id}/edit`}
                  />
                ))}
              {!filteredPrograms.length && <p>{t.noProgramsFound}</p>}
              {pageCount > 1 && (
                <nav className="program-list-pagination" aria-label={t.title}>
                  <button
                    type="button"
                    className="account-secondary"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    {t.previous}
                  </button>
                  <span>
                    {page} / {pageCount}
                  </span>
                  <button
                    type="button"
                    className="account-secondary"
                    disabled={page === pageCount}
                    onClick={() => setPage(page + 1)}
                  >
                    {t.next}
                  </button>
                </nav>
              )}
            </div>
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
              prefetch={false}
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
