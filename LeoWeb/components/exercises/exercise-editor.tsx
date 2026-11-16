"use client"
import { exerciseCopy } from "@/lib/exercises/copy"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ExerciseShell } from "./exercise-shell"
import type { ExerciseData, Language } from "@/lib/exercises/types"
import type { Locale, Messages } from "@/lib/i18n"
const blank: ExerciseData = {
  name: "",
  description: "",
  type: "repetitions",
  includesOwnWeight: false,
  includesAdditionalWeight: false,
  translations: [],
  media: [],
}
export function ExerciseEditor({
  locale,
  messages,
  languages,
  initial,
}: {
  locale: Locale
  messages: Messages
  languages: Language[]
  initial?: ExerciseData
}) {
  const router = useRouter()
  const [value, setValue] = useState<ExerciseData>(
    initial ?? {
      ...blank,
      translations: languages.find((l) => l.code === locale)
        ? [
            {
              languageId: languages.find((l) => l.code === locale)!.id,
              title: "",
              description: "",
            },
          ]
        : [],
    }
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [deleting, setDeleting] = useState(false)
  const t = messages.exerciseEditor
  const c = exerciseCopy(locale)
  function change(update: Partial<ExerciseData>) {
    setValue((v) => ({ ...v, ...update }))
  }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    const missing = value.translations.find((tr) => !tr.title.trim())
    if (missing) {
      setSelected(missing.languageId)
      setError(
        `${messages.exerciseEditor.title}: ${languages.find((l) => l.id === missing.languageId)?.nativeName}`
      )
      return
    }
    setBusy(true)
    setError("")
    try {
      const response = await fetch(
        `/api/exercises${value.id ? `/${value.id}` : ""}`,
        {
          method: value.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...value,
            name:
              value.name.trim() ||
              value.translations.find((t) => t.title.trim())?.title ||
              "",
          }),
        }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      router.push(`/${locale}/exercises`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.")
      setBusy(false)
    }
  }
  async function remove() {
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/exercises/${value.id}`, {
        method: "DELETE",
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      router.push(`/${locale}/exercises`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete.")
      setBusy(false)
    }
  }
  async function upload(
    file: File | undefined,
    index: number,
    translation: number
  ) {
    if (!file) return
    setBusy(true)
    setError("")
    try {
      const data = new FormData()
      data.set("file", file)
      const response = await fetch("/api/exercises/files", {
        method: "POST",
        body: data,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setValue((v) => ({
        ...v,
        media: v.media.map((m, i) =>
          i === index
            ? {
                ...m,
                translations: m.translations.map((t, j) =>
                  j === translation ? { ...t, url: result.url } : t
                ),
              }
            : m
        ),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.")
    } finally {
      setBusy(false)
    }
  }
  const [selected, setSelected] = useState(
    initial?.translations[0]?.languageId ??
      languages.find((l) => l.code === locale)?.id ??
      languages[0]?.id ??
      ""
  )
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const draft = value.translations.find((t) => t.languageId === selected)
  const language = languages.find((l) => l.id === selected)
  const imageIndex = value.media.findIndex((m) => m.type === "image")
  const primary = value.media[imageIndex]
  const image =
    primary?.translations.find((t) => t.languageId === selected) ??
    primary?.translations[0]
  function updateTranslation(field: "title" | "description", text: string) {
    change({
      translations: value.translations.map((t) =>
        t.languageId === selected ? { ...t, [field]: text } : t
      ),
    })
  }
  function addLanguage(id: string) {
    if (!id) return
    change({
      translations: [
        ...value.translations,
        { languageId: id, title: "", description: "" },
      ],
    })
    setSelected(id)
  }
  function removeLanguage(id: string) {
    const next = value.translations.filter((t) => t.languageId !== id)
    change({ translations: next })
    if (selected === id) setSelected(next[0]?.languageId ?? "")
  }
  async function chooseImage(file?: File) {
    setDragging(false)
    if (!file || busy) return
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024 ||
      !file.size
    ) {
      setError(t.invalidImage)
      return
    }
    setBusy(true)
    setError("")
    try {
      const data = new FormData()
      data.set("file", file)
      const response = await fetch("/api/exercises/files", {
        method: "POST",
        body: data,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      const languageId =
        selected ||
        languages.find((l) => l.code === locale)?.id ||
        languages[0]?.id
      if (!languageId) throw new Error(t.addLanguage)
      setValue((v) => {
        const index = v.media.findIndex((m) => m.type === "image")
        const entry = {
          languageId,
          url: result.url,
          title: "",
          description: "",
          altText: "",
        }
        return {
          ...v,
          media:
            index < 0
              ? [{ type: "image", translations: [entry] }, ...v.media]
              : v.media.map((m, i) =>
                  i !== index
                    ? m
                    : {
                        ...m,
                        translations: m.translations.some(
                          (t) => t.languageId === languageId
                        )
                          ? m.translations.map((t) =>
                              t.languageId === languageId
                                ? { ...t, url: result.url }
                                : t
                            )
                          : [...m.translations, entry],
                      }
                ),
        }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t.imageFailed)
    } finally {
      setBusy(false)
    }
  }
  function removeImage() {
    if (!image) return
    change({
      media: value.media.flatMap((m, i) => {
        if (i !== imageIndex) return [m]
        const translations = m.translations.filter(
          (t) => t.languageId !== image.languageId
        )
        return translations.length ? [{ ...m, translations }] : []
      }),
    })
  }
  function imageContent() {
    return image ? (
      <Image
        src={image.url}
        alt={image.altText || t.imageAlt}
        width={720}
        height={450}
        unoptimized
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
        <div className="editor-preview-copy" lang={language?.code}>
          <span className="editor-preview-locale">
            {language?.nativeName ?? c.general}
          </span>
          <h3>{draft?.title.trim() || value.name || t.titlePreview}</h3>
          <p>
            {draft?.description.trim() ||
              value.description ||
              t.descriptionPreview}
          </p>
        </div>
      </article>
    )
  }
  return (
    <ExerciseShell locale={locale} messages={messages}>
      <Link className="account-back" href={`/${locale}/exercises`}>
        <ArrowLeft size={15} aria-hidden="true" />
        {t.back}
      </Link>
      <div className="exercise-intro">
        <div>
          <p className="account-eyebrow">{t.eyebrow}</p>
          <h1>{initial ? `${c.edit}: ${initial.name}` : t.create}</h1>
          <p>{t.intro}</p>
        </div>
        <button
          className="account-secondary"
          type="button"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye size={15} aria-hidden="true" />
          {t.preview}
        </button>
      </div>
      <form className="exercise-editor-form" onSubmit={save}>
        <fieldset disabled={busy}>
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
                  type="file"
                  className="sr-only"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label={t.chooseImage}
                  onChange={(e) => {
                    chooseImage(e.target.files?.[0])
                    e.target.value = ""
                  }}
                />
                <div
                  className="editor-upload"
                  data-dragging={dragging || undefined}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={(e) => {
                    if (
                      !e.currentTarget.contains(e.relatedTarget as Node | null)
                    )
                      setDragging(false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    chooseImage(e.dataTransfer.files[0])
                  }}
                >
                  {image ? (
                    <div className="editor-upload-preview">
                      {imageContent()}
                    </div>
                  ) : (
                    <>
                      <div className="editor-upload-icon">
                        <Upload
                          size={25}
                          strokeWidth={1.4}
                          aria-hidden="true"
                        />
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
                        onClick={removeImage}
                      >
                        <X size={14} />
                        {t.removeImage}
                      </button>
                    )}
                  </div>
                </div>
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
                    {value.translations.length} / {languages.length}
                  </span>
                </div>
                <div className="editor-translation-layout">
                  <aside className="editor-language-sidebar">
                    <ul
                      className="editor-language-list"
                      aria-label={t.translations}
                    >
                      {value.translations.map((tr) => {
                        const lang = languages.find(
                          (l) => l.id === tr.languageId
                        )
                        const status =
                          tr.title.trim() && tr.description.trim()
                            ? "ready"
                            : tr.title.trim() || tr.description.trim()
                              ? "inProgress"
                              : "empty"
                        return (
                          <li
                            key={tr.languageId}
                            data-selected={
                              selected === tr.languageId || undefined
                            }
                          >
                            <button
                              type="button"
                              className="editor-language-select"
                              aria-pressed={selected === tr.languageId}
                              onClick={() => setSelected(tr.languageId)}
                            >
                              <span className="editor-language-code">
                                {lang?.code.toUpperCase()}
                              </span>
                              <span>
                                <strong lang={lang?.code}>
                                  {lang?.nativeName}
                                </strong>
                                <small
                                  data-ready={status === "ready" || undefined}
                                >
                                  {status === "ready" && <Check size={11} />}{" "}
                                  {t[status]}
                                </small>
                              </span>
                            </button>
                            <button
                              type="button"
                              className="editor-language-remove"
                              aria-label={`${t.removeLanguage}: ${lang?.nativeName}`}
                              onClick={() => removeLanguage(tr.languageId)}
                            >
                              <X size={13} />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                    <div className="editor-add-language">
                      <Plus size={14} />
                      <select
                        aria-label={t.addLanguage}
                        value=""
                        disabled={
                          value.translations.length === languages.length
                        }
                        onChange={(e) => addLanguage(e.target.value)}
                      >
                        <option value="">
                          {value.translations.length === languages.length
                            ? t.allLanguages
                            : t.addLanguage}
                        </option>
                        {languages
                          .filter(
                            (l) =>
                              !value.translations.some(
                                (t) => t.languageId === l.id
                              )
                          )
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nativeName}
                            </option>
                          ))}
                      </select>
                    </div>
                  </aside>
                  <div className="editor-text-fields">
                    {draft ? (
                      <>
                        <div className="editor-editing">
                          <Globe2 size={14} />
                          {t.editing} <strong>{language?.nativeName}</strong>
                        </div>
                        <div className="account-field">
                          <label htmlFor="editor-title">{t.title}</label>
                          <input
                            id="editor-title"
                            lang={language?.code}
                            value={draft.title}
                            maxLength={200}
                            placeholder={t.titlePlaceholder}
                            onChange={(e) =>
                              updateTranslation("title", e.target.value)
                            }
                          />
                          <small className="editor-character-count">
                            {draft.title.length} / 200
                          </small>
                        </div>
                        <div className="account-field">
                          <label htmlFor="editor-description">
                            {t.description}
                          </label>
                          <textarea
                            id="editor-description"
                            lang={language?.code}
                            value={draft.description}
                            maxLength={10000}
                            rows={6}
                            placeholder={t.descriptionPlaceholder}
                            onChange={(e) =>
                              updateTranslation("description", e.target.value)
                            }
                          />
                          <small className="editor-character-count">
                            {draft.description.length} / 10000
                          </small>
                        </div>
                        <p className="editor-text-note">{t.textNote}</p>
                      </>
                    ) : (
                      <p className="editor-text-note">{t.addLanguage}</p>
                    )}
                  </div>
                </div>
              </section>
              <div className="editor-advanced crud-fields">
                <section className="editor-panel">
                  <h2>{c.general}</h2>
                  <label>
                    {c.defaultTitle}
                    <input
                      maxLength={200}
                      value={value.name}
                      onChange={(e) => change({ name: e.target.value })}
                    />
                  </label>
                  <label>
                    {t.description}
                    <textarea
                      maxLength={10000}
                      value={value.description}
                      onChange={(e) => change({ description: e.target.value })}
                    />
                  </label>
                  <label>
                    {c.type}
                    <select
                      value={value.type}
                      onChange={(e) =>
                        change({ type: e.target.value as ExerciseData["type"] })
                      }
                    >
                      {["repetitions", "distance", "duration"].map((t) => (
                        <option key={t} value={t}>
                          {c[t as "repetitions" | "distance" | "duration"]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={value.includesOwnWeight}
                      onChange={(e) =>
                        change({ includesOwnWeight: e.target.checked })
                      }
                    />{" "}
                    {c.ownWeight}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={value.includesAdditionalWeight}
                      onChange={(e) =>
                        change({ includesAdditionalWeight: e.target.checked })
                      }
                    />{" "}
                    {c.additionalWeight}
                  </label>
                </section>
                <details className="editor-media-details">
                  <summary>
                    {c.media} <span>{value.media.length}</span>
                  </summary>{" "}
                  <section className="editor-panel">
                    <h2>{c.media}</h2>
                    {value.media.map((media, index) => (
                      <div className="crud-translation" key={index}>
                        <div className="crud-actions">
                          <strong>
                            {index + 1}. {c[media.type]}
                          </strong>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => {
                              const next = [...value.media]
                              ;[next[index - 1], next[index]] = [
                                next[index],
                                next[index - 1],
                              ]
                              change({ media: next })
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === value.media.length - 1}
                            onClick={() => {
                              const next = [...value.media]
                              ;[next[index + 1], next[index]] = [
                                next[index],
                                next[index + 1],
                              ]
                              change({ media: next })
                            }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              change({
                                media: value.media.filter(
                                  (_, i) => i !== index
                                ),
                              })
                            }
                          >
                            {c.removeMedia}
                          </button>
                        </div>
                        {media.translations.map((tr, j) => (
                          <div className="crud-translation" key={tr.languageId}>
                            <h3>
                              {
                                languages.find((l) => l.id === tr.languageId)
                                  ?.nativeName
                              }
                            </h3>
                            {(
                              [
                                "url",
                                "title",
                                "description",
                                "altText",
                              ] as const
                            ).map((field) => (
                              <label key={field}>
                                {c[field]}
                                <input
                                  required={field === "url"}
                                  maxLength={
                                    field === "description"
                                      ? 10000
                                      : field === "url"
                                        ? 2048
                                        : 200
                                  }
                                  value={tr[field]}
                                  onChange={(e) =>
                                    change({
                                      media: value.media.map((m, i) =>
                                        i === index
                                          ? {
                                              ...m,
                                              translations: m.translations.map(
                                                (v, k) =>
                                                  k === j
                                                    ? {
                                                        ...v,
                                                        [field]: e.target.value,
                                                      }
                                                    : v
                                              ),
                                            }
                                          : m
                                      ),
                                    })
                                  }
                                />
                              </label>
                            ))}
                            <label>
                              {c.upload} {c[media.type]}
                              <input
                                type="file"
                                accept={
                                  media.type === "image"
                                    ? "image/png,image/jpeg,image/webp"
                                    : "video/mp4,video/webm"
                                }
                                onChange={(e) =>
                                  upload(e.target.files?.[0], index, j)
                                }
                              />
                            </label>
                            {tr.url &&
                              (media.type === "image" ? (
                                <Image
                                  unoptimized
                                  width={720}
                                  height={450}
                                  className="crud-preview"
                                  src={tr.url}
                                  alt={tr.altText}
                                />
                              ) : (
                                <video
                                  className="crud-preview"
                                  src={tr.url}
                                  controls
                                  preload="metadata"
                                />
                              ))}
                            <button
                              type="button"
                              onClick={() =>
                                change({
                                  media: value.media.map((m, i) =>
                                    i === index
                                      ? {
                                          ...m,
                                          translations: m.translations.filter(
                                            (_, k) => k !== j
                                          ),
                                        }
                                      : m
                                  ),
                                })
                              }
                            >
                              {t.removeLanguage}
                            </button>
                          </div>
                        ))}
                        <select
                          aria-label={t.addLanguage}
                          value=""
                          onChange={(e) => {
                            if (e.target.value)
                              change({
                                media: value.media.map((m, i) =>
                                  i === index
                                    ? {
                                        ...m,
                                        translations: [
                                          ...m.translations,
                                          {
                                            languageId: e.target.value,
                                            url: "",
                                            title: "",
                                            description: "",
                                            altText: "",
                                          },
                                        ],
                                      }
                                    : m
                                ),
                              })
                          }}
                        >
                          <option value="">{t.addLanguage}</option>
                          {languages
                            .filter(
                              (l) =>
                                !media.translations.some(
                                  (t) => t.languageId === l.id
                                )
                            )
                            .map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.nativeName}
                              </option>
                            ))}
                        </select>
                      </div>
                    ))}
                    <div className="crud-actions">
                      {(["image", "video"] as const).map((type) => (
                        <button
                          type="button"
                          key={type}
                          onClick={() =>
                            change({
                              media: [
                                ...value.media,
                                {
                                  type,
                                  translations: [
                                    {
                                      languageId:
                                        languages.find((l) => l.code === locale)
                                          ?.id ?? languages[0].id,
                                      url: "",
                                      title: "",
                                      description: "",
                                      altText: "",
                                    },
                                  ],
                                },
                              ],
                            })
                          }
                        >
                          + {c[type]}
                        </button>
                      ))}
                    </div>
                  </section>
                </details>
              </div>
            </div>
            <aside className="editor-preview">
              <div className="editor-preview-heading">
                <Eye size={17} />
                <h2>{t.livePreview}</h2>
              </div>
              <p>{t.previewNote}</p>
              {previewCard()}
            </aside>
          </div>
          <footer className="editor-footer">
            <div>
              {value.id && (
                <button
                  className="editor-remove-image"
                  type="button"
                  onClick={() => setDeleting(true)}
                >
                  {c.delete}
                </button>
              )}
            </div>
            <div>
              <Link className="account-secondary" href={`/${locale}/exercises`}>
                {t.cancel}
              </Link>
              <button className="account-primary" type="submit">
                {busy ? c.saving : c.save}
              </button>
            </div>
          </footer>
          {deleting && (
            <div className="editor-panel" role="alert">
              <p>{c.question}</p>
              <div className="editor-image-actions">
                <button
                  className="account-secondary"
                  type="button"
                  onClick={remove}
                >
                  {c.confirm}
                </button>
                <button
                  className="account-secondary"
                  type="button"
                  onClick={() => setDeleting(false)}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}
        </fieldset>
        {error && (
          <p className="editor-image-error" role="alert">
            {error}
          </p>
        )}
      </form>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          showCloseButton={false}
          className="editor-preview-dialog"
        >
          <DialogHeader>
            <DialogTitle>{t.preview}</DialogTitle>
            <DialogDescription>{t.previewNote}</DialogDescription>
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
    </ExerciseShell>
  )
}
