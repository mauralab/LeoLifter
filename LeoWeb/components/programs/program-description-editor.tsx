"use client"
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import Image from "next/image"
import {
  ImagePlus,
  Upload,
  Trash2,
  Languages,
  Plus,
  X,
  Check,
} from "lucide-react"
import type { Locale, Messages } from "@/lib/i18n"
import type { ProgramDescription } from "@/lib/programs/validation"
type Language = { id: string; code: string; nativeName: string }
export function ProgramDescriptionEditor({
  locale,
  copy,
  languages,
  descriptions,
  onChange,
}: {
  locale: Locale
  copy: Messages
  languages: Language[]
  descriptions: ProgramDescription[]
  onChange: Dispatch<SetStateAction<ProgramDescription[]>>
}) {
  const t = copy.programs,
    e = copy.exerciseEditor
  const [selected, setSelected] = useState(
      descriptions.find(
        (d) => d.languageId === languages.find((l) => l.code === locale)?.id
      )?.languageId ??
        descriptions[0]?.languageId ??
        ""
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dragging, setDragging] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(
    () => () => {
      request.current?.abort()
      request.current = null
    },
    []
  )
  const value = descriptions.find((d) => d.languageId === selected),
    language = languages.find((l) => l.id === selected)
  function change(patch: Partial<ProgramDescription>) {
    if (!selected) return
    onChange((rows) => {
      const exists = rows.some((row) => row.languageId === selected)
      return exists
        ? rows.map((row) =>
            row.languageId === selected ? { ...row, ...patch } : row
          )
        : [
            ...rows,
            {
              languageId: selected,
              description: "",
              imageUrl: "",
              imageAlt: "",
              ...patch,
            },
          ]
    })
  }
  async function upload(file?: File) {
    setDragging(false)
    if (!file || busy || !selected) return
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      !file.size ||
      file.size > 5 * 1024 * 1024
    ) {
      setError(e.invalidImage)
      return
    }
    const languageId = selected,
      controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError("")
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const body = new FormData()
      body.set("file", file)
      const r = await fetch("/api/programs/files", {
        method: "POST",
        body,
        signal: controller.signal,
      })
      const data = await r.json()
      if (!r.ok) throw new Error()
      if (request.current !== controller) return
      onChange((rows) =>
        rows.some((row) => row.languageId === languageId)
          ? rows.map((row) =>
              row.languageId === languageId
                ? { ...row, imageUrl: data.url }
                : row
            )
          : [
              ...rows,
              { languageId, description: "", imageUrl: data.url, imageAlt: "" },
            ]
      )
    } catch {
      if (request.current === controller) setError(e.imageFailed)
    } finally {
      clearTimeout(timeout)
      if (request.current === controller) {
        setBusy(false)
        request.current = null
      }
    }
  }

  function addLanguage(id: string) {
    if (!id || busy) return
    onChange((rows) =>
      rows.some((row) => row.languageId === id)
        ? rows
        : [
            ...rows,
            { languageId: id, description: "", imageUrl: "", imageAlt: "" },
          ]
    )
    setSelected(id)
    setError("")
  }
  function removeLanguage(id: string) {
    if (busy || !window.confirm(t.descriptionRemoveConfirm)) return
    const next = descriptions.filter((row) => row.languageId !== id)
    onChange(next)
    if (selected === id) setSelected(next[0]?.languageId ?? "")
    setError("")
  }
  return (
    <details className="program-description-editor">
      <summary>
        <Languages size={17} />
        {t.descriptionAndImage}
      </summary>
      <div className="program-description-content">
        <div className="editor-panel-heading">
          <div>
            <h2>{e.translations}</h2>
            <p>{t.descriptionHint}</p>
          </div>
          <span className="editor-language-count">
            {descriptions.length} / {languages.length}
          </span>
        </div>
        <div className="editor-translation-layout">
          <aside className="editor-language-sidebar">
            <ul className="editor-language-list" aria-label={e.translations}>
              {descriptions.map((row) => {
                const lang = languages.find((l) => l.id === row.languageId),
                  status = row.description.trim()
                    ? "ready"
                    : row.imageUrl
                      ? "inProgress"
                      : "empty"
                return (
                  <li
                    key={row.languageId}
                    data-selected={selected === row.languageId || undefined}
                  >
                    <button
                      type="button"
                      className="editor-language-select"
                      aria-pressed={selected === row.languageId}
                      disabled={busy}
                      onClick={() => {
                        setSelected(row.languageId)
                        setError("")
                      }}
                    >
                      <span className="editor-language-code">
                        {lang?.code.toUpperCase()}
                      </span>
                      <span>
                        <strong lang={lang?.code}>{lang?.nativeName}</strong>
                        <small data-ready={status === "ready" || undefined}>
                          {status === "ready" && <Check size={11} />}{" "}
                          {e[status]}
                        </small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="editor-language-remove"
                      aria-label={`${e.removeLanguage}: ${lang?.nativeName}`}
                      disabled={busy}
                      onClick={() => removeLanguage(row.languageId)}
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
                aria-label={e.addLanguage}
                value=""
                disabled={busy || descriptions.length === languages.length}
                onChange={(event) => addLanguage(event.target.value)}
              >
                <option value="">
                  {descriptions.length === languages.length
                    ? e.allLanguages
                    : e.addLanguage}
                </option>
                {languages
                  .filter(
                    (lang) =>
                      !descriptions.some((row) => row.languageId === lang.id)
                  )
                  .map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.nativeName}
                    </option>
                  ))}
              </select>
            </div>
          </aside>
          <div className="program-description-active">
            {selected ? (
              <>
                <p className="program-description-editing">
                  <Languages size={15} />
                  {e.editing} <strong>{language?.nativeName}</strong>
                </p>
                <div className="program-description-fields">
                  <div
                    className={`program-description-image ${dragging ? "is-dragging" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault()
                      if (!busy) setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault()
                      void upload(event.dataTransfer.files[0])
                    }}
                  >
                    <div className="program-description-image-preview">
                      {value?.imageUrl ? (
                        <Image
                          src={value.imageUrl}
                          alt={value.imageAlt || t.descriptionCover}
                          width={720}
                          height={450}
                          unoptimized
                          onError={() => setError(e.imageFailed)}
                        />
                      ) : (
                        <div>
                          <ImagePlus size={32} />
                          <span>{e.dropImage}</span>
                        </div>
                      )}
                    </div>
                    <input
                      className="sr-only"
                      id="program-description-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={busy || !selected}
                      onChange={(event) => {
                        void upload(event.target.files?.[0])
                        event.target.value = ""
                      }}
                    />
                    <div className="program-description-image-actions">
                      <label
                        className="account-secondary"
                        htmlFor="program-description-upload"
                        aria-disabled={busy}
                      >
                        <Upload size={15} />
                        {busy
                          ? t.descriptionUploading
                          : value?.imageUrl
                            ? e.changeImage
                            : e.chooseImage}
                      </label>
                      {value?.imageUrl && (
                        <button
                          type="button"
                          className="account-secondary"
                          disabled={busy}
                          onClick={() => {
                            change({ imageUrl: "", imageAlt: "" })
                            setError("")
                          }}
                        >
                          <Trash2 size={15} />
                          {e.removeImage}
                        </button>
                      )}
                    </div>
                    <small>{e.imageHint}</small>
                    {value?.imageUrl && (
                      <>
                        <label htmlFor="program-description-alt">
                          {t.descriptionImageAlt}
                        </label>
                        <input
                          id="program-description-alt"
                          maxLength={300}
                          value={value.imageAlt}
                          onChange={(event) =>
                            change({ imageAlt: event.target.value })
                          }
                        />
                      </>
                    )}
                    {busy && <p role="status">{t.descriptionUploading}</p>}
                    {error && (
                      <p role="alert" className="account-error">
                        {error}
                      </p>
                    )}
                  </div>
                  <div className="program-description-text">
                    <label htmlFor="program-description-text">
                      {e.description} · {language?.nativeName}
                    </label>
                    <textarea
                      id="program-description-text"
                      lang={language?.code}
                      rows={10}
                      maxLength={20000}
                      disabled={!selected}
                      value={value?.description ?? ""}
                      onChange={(event) =>
                        change({ description: event.target.value })
                      }
                    />
                    <small>{value?.description.length ?? 0} / 20000</small>
                  </div>
                </div>
              </>
            ) : (
              <p className="editor-text-note">{e.addLanguage}</p>
            )}
          </div>
        </div>
      </div>
    </details>
  )
}
