"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  Check,
  Eye,
  Globe2,
  ImageIcon,
  Plus,
  Upload,
  X,
} from "lucide-react"
import { HeaderPreferences } from "@/components/landing/header-preferences"
import { TrainingNavigation } from "@/components/navigation/training-navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { languages, locales, type Locale, type Messages } from "@/lib/i18n"
type Translation = { title: string; description: string }
type LocalImage = { url: string; name: string }
const emptyTranslations = (): Record<Locale, Translation> => ({
  en: { title: "", description: "" },
  uk: { title: "", description: "" },
  nb: { title: "", description: "" },
  de: { title: "", description: "" },
  pl: { title: "", description: "" },
})
export function ExerciseEditor({
  locale,
  messages,
}: {
  locale: Locale
  messages: Messages
}) {
  const t = messages.exerciseEditor
  const [enabled, setEnabled] = useState<Locale[]>([locale])
  const [selected, setSelected] = useState<Locale>(locale)
  const [translations, setTranslations] = useState(emptyTranslations)
  const [image, setImage] = useState<LocalImage | null>(null)
  const [imageError, setImageError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const draft = translations[selected]
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url)
    },
    [image]
  )
  function chooseImage(file?: File) {
    setDragging(false)
    if (!file) return
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024 ||
      file.size === 0
    ) {
      setImageError(t.invalidImage)
      return
    }
    setImageError("")
    setImage({ url: URL.createObjectURL(file), name: file.name })
  }
  function addLanguage(value: string) {
    if (!locales.some((l) => l === value)) return
    const language = value as Locale
    if (enabled.includes(language)) return
    setEnabled([...enabled, language])
    setSelected(language)
  }
  function removeLanguage(language: Locale) {
    if (enabled.length === 1) return
    const remaining = enabled.filter((l) => l !== language)
    setEnabled(remaining)
    setTranslations((previous) => ({
      ...previous,
      [language]: { title: "", description: "" },
    }))
    if (selected === language) setSelected(remaining[0])
  }
  function update(field: keyof Translation, value: string) {
    setTranslations((previous) => ({
      ...previous,
      [selected]: { ...previous[selected], [field]: value },
    }))
  }
  function imageContent() {
    return image ? (
      <Image
        src={image.url}
        alt={t.imageAlt}
        width={720}
        height={450}
        unoptimized
        onError={() => {
          setImageError(t.imageFailed)
          setImage(null)
        }}
      />
    ) : (
      <div className="editor-image-empty">
        <ImageIcon size={30} strokeWidth={1.2} aria-hidden="true" />
        <span>{messages.exercises.image}</span>
      </div>
    )
  }
  function previewCard() {
    return (
      <article className="editor-preview-card">
        <div className="editor-preview-media">{imageContent()}</div>
        <div className="editor-preview-copy" lang={selected}>
          <span className="editor-preview-locale">{languages[selected]}</span>
          <h3>{draft.title.trim() || t.titlePreview}</h3>
          <p>{draft.description.trim() || t.descriptionPreview}</p>
        </div>
      </article>
    )
  }
  return (
    <main className="account-page exercise-editor-page">
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
          current="exercises"
        />
        <HeaderPreferences locale={locale} copy={messages} />
      </header>
      <div className="exercise-container">
        <Link className="account-back" href={`/${locale}/exercises`}>
          <ArrowLeft size={15} aria-hidden="true" />
          {t.back}
        </Link>
        <div className="exercise-intro">
          <div>
            <p className="account-eyebrow">{t.eyebrow}</p>
            <h1>{t.create}</h1>
            <p>{t.intro}</p>
          </div>
          <span className="exercise-sample">
            <span />
            {t.draft}
          </span>
        </div>
        <div className="editor-layout">
          <div className="editor-main">
            <section
              className="editor-panel"
              aria-labelledby="editor-image-heading"
            >
              <div className="editor-panel-heading">
                <div>
                  <h2 id="editor-image-heading">
                    {t.imageTitle} <span>{t.optional}</span>
                  </h2>
                  <p>{t.imageNote}</p>
                </div>
                <Upload size={18} aria-hidden="true" />
              </div>
              <input
                ref={input}
                id="exercise-image-file"
                type="file"
                className="sr-only"
                accept="image/png,image/jpeg,image/webp"
                aria-label={t.chooseImage}
                onChange={(event) => {
                  chooseImage(event.target.files?.[0])
                  event.target.value = ""
                }}
              />
              <div
                className="editor-upload"
                data-dragging={dragging || undefined}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(
                      event.relatedTarget as Node | null
                    )
                  )
                    setDragging(false)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  chooseImage(event.dataTransfer.files[0])
                }}
              >
                {image ? (
                  <div className="editor-upload-preview">{imageContent()}</div>
                ) : (
                  <>
                    <div className="editor-upload-icon">
                      <Upload size={25} strokeWidth={1.4} aria-hidden="true" />
                    </div>
                    <p>{t.dropImage}</p>
                    <span>{t.imageHint}</span>
                  </>
                )}
                <div className="editor-image-actions">
                  <button
                    type="button"
                    className="account-secondary"
                    onClick={() => input.current?.click()}
                  >
                    {image ? t.changeImage : t.chooseImage}
                  </button>
                  {image && (
                    <button
                      type="button"
                      className="editor-remove-image"
                      onClick={() => {
                        setImage(null)
                        setImageError("")
                      }}
                    >
                      <X size={14} aria-hidden="true" />
                      {t.removeImage}
                    </button>
                  )}
                </div>
              </div>
              {image && <p className="editor-filename">{image.name}</p>}
              {imageError && (
                <p className="editor-image-error" role="alert">
                  {imageError}
                </p>
              )}
            </section>
            <section
              className="editor-panel"
              aria-labelledby="editor-translations-heading"
            >
              <div className="editor-panel-heading">
                <div>
                  <h2 id="editor-translations-heading">{t.translations}</h2>
                  <p>{t.translationNote}</p>
                </div>
                <span className="editor-language-count">
                  {enabled.length} / {locales.length}
                </span>
              </div>
              <div className="editor-translation-layout">
                <aside className="editor-language-sidebar">
                  <ul
                    className="editor-language-list"
                    aria-label={t.translations}
                  >
                    {enabled.map((language) => {
                      const text = translations[language],
                        status =
                          text.title.trim() && text.description.trim()
                            ? "ready"
                            : text.title.trim() || text.description.trim()
                              ? "inProgress"
                              : "empty"
                      return (
                        <li
                          key={language}
                          data-selected={selected === language || undefined}
                        >
                          <button
                            type="button"
                            className="editor-language-select"
                            aria-pressed={selected === language}
                            onClick={() => setSelected(language)}
                          >
                            <span className="editor-language-code">
                              {language.toUpperCase()}
                            </span>
                            <span>
                              <strong lang={language}>
                                {languages[language]}
                              </strong>
                              <small
                                data-ready={status === "ready" || undefined}
                              >
                                {status === "ready" && (
                                  <Check size={11} aria-hidden="true" />
                                )}
                                {t[status]}
                              </small>
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={enabled.length === 1}
                            className="editor-language-remove"
                            aria-label={`${t.removeLanguage}: ${languages[language]}`}
                            onClick={() => removeLanguage(language)}
                          >
                            <X size={13} aria-hidden="true" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="editor-add-language">
                    <Plus size={14} aria-hidden="true" />
                    <label className="sr-only" htmlFor="editor-add-language">
                      {t.addLanguage}
                    </label>
                    <select
                      id="editor-add-language"
                      value=""
                      disabled={enabled.length === locales.length}
                      onChange={(event) => addLanguage(event.target.value)}
                    >
                      <option value="" disabled>
                        {enabled.length === locales.length
                          ? t.allLanguages
                          : t.addLanguage}
                      </option>
                      {locales
                        .filter((language) => !enabled.includes(language))
                        .map((language) => (
                          <option key={language} value={language}>
                            {languages[language]}
                          </option>
                        ))}
                    </select>
                  </div>
                </aside>
                <div className="editor-text-fields">
                  <div className="editor-editing">
                    <Globe2 size={14} aria-hidden="true" />
                    {t.editing} <strong>{languages[selected]}</strong>
                  </div>
                  <div className="account-field">
                    <label htmlFor="editor-title">{t.title}</label>
                    <input
                      id="editor-title"
                      lang={selected}
                      value={draft.title}
                      onChange={(event) => update("title", event.target.value)}
                      maxLength={100}
                      placeholder={t.titlePlaceholder}
                      autoComplete="off"
                    />
                    <small className="editor-character-count">
                      {draft.title.length} / 100
                    </small>
                  </div>
                  <div className="account-field">
                    <label htmlFor="editor-description">{t.description}</label>
                    <textarea
                      id="editor-description"
                      lang={selected}
                      value={draft.description}
                      onChange={(event) =>
                        update("description", event.target.value)
                      }
                      maxLength={2000}
                      rows={6}
                      placeholder={t.descriptionPlaceholder}
                    />
                    <small className="editor-character-count">
                      {draft.description.length} / 2000
                    </small>
                  </div>
                  <p className="editor-text-note">{t.textNote}</p>
                </div>
              </div>
            </section>
          </div>
          <aside className="editor-preview">
            <div className="editor-preview-heading">
              <Eye size={17} aria-hidden="true" />
              <h2>{t.livePreview}</h2>
            </div>
            <p>{t.previewNote}</p>
            {previewCard()}
            <p className="editor-draft-note">{t.draftNote}</p>
          </aside>
        </div>
        <footer className="editor-footer">
          <p>
            <span className="editor-draft-dot" />
            {t.draft}
          </p>
          <div>
            <Link className="account-secondary" href={`/${locale}/exercises`}>
              {t.cancel}
            </Link>
            <button
              type="button"
              className="account-primary"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye size={15} aria-hidden="true" />
              {t.preview}
            </button>
          </div>
        </footer>
      </div>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          showCloseButton={false}
          className="editor-preview-dialog"
        >
          <DialogHeader>
            <DialogTitle>{t.preview}</DialogTitle>
            <DialogDescription>{t.draftNote}</DialogDescription>
          </DialogHeader>
          {previewCard()}
          <button
            type="button"
            className="account-secondary"
            onClick={() => setPreviewOpen(false)}
          >
            {t.close}
          </button>
        </DialogContent>
      </Dialog>
    </main>
  )
}
