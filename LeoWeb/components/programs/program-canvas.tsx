"use client"

import { useRef, useState, type PointerEvent, type KeyboardEvent } from "react"
import {
  CalendarDays,
  GripVertical,
  Layers3,
  Minus,
  Plus,
  Settings2,
  FolderOpen,
  Dumbbell,
  ListOrdered,
  X,
  Copy,
  ClipboardPaste,
  CopyPlus,
} from "lucide-react"
import { ProgramExport } from "./program-export"
import { ExercisePicker } from "./exercise-picker"
import {
  TargetFields,
  IdenticalSets,
  SetCountFields,
} from "./set-target-fields"
import type { Messages } from "@/lib/i18n"

import {
  layoutCanvas,
  cloneBranch,
  setCount,
  setMinimum,
  setCountLabel,
  setTotalLabel,
  targetFields,
  parentKind,
  headerHeight,
  targetError,
  type ExerciseOption,
  descendants,
  type CanvasBlock as Block,
  type CanvasKind as Kind,
} from "./canvas-layout"

type Drag = {
  kind: Kind
  id?: string
  startX: number
  startY: number
  x: number
  y: number
  offsetX: number
  offsetY: number
  moved: boolean
  targetId?: string
}
const snap = (n: number) => Math.round(n / 8) * 8

const icons = {
  cycle: Layers3,
  day: CalendarDays,
  group: FolderOpen,
  exercise: Dumbbell,
  set: ListOrdered,
}
const Icon = ({ kind }: { kind: Kind }) => {
  const Component = icons[kind]
  return <Component size={17} aria-hidden="true" />
}

export function ProgramCanvas({
  copy: t,
  catalog = [],
  programName = "",
  blocks,
  setBlocks,
  saveStatus,
}: {
  copy: Messages["programs"]
  catalog?: ExerciseOption[]
  programName?: string
  blocks: Block[]
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>
  saveStatus?: React.ReactNode
}) {
  const [pickerId, setPickerId] = useState<string | null>(null)
  const [clipboard, setClipboard] = useState<{
    rootId: string
    nodes: Block[]
  } | null>(null)
  const rule = {
    cycle: t.invalidCycle,
    day: t.dayNeedsCycle,
    group: t.groupNeedsDay,
    exercise: t.exerciseNeedsGroup,
    set: t.setNeedsExercise,
  }
  const dropCopy = {
    cycle: t.dropChildren,
    day: t.dropGroups,
    group: t.dropExercises,
    exercise: t.dropSets,
    set: "",
  }
  const [selected, setSelected] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [ghost, setGhost] = useState<Drag | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const viewport = useRef<HTMLDivElement>(null)
  const world = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const pan = useRef<{
    x: number
    y: number
    left: number
    top: number
  } | null>(null)
  const suppressClick = useRef(false)
  const cycles = blocks.filter((b) => b.kind === "cycle")
  const days = blocks.filter((b) => b.kind === "day")
  const active = blocks.find((b) => b.id === selected)
  const activeSiblings = active
    ? blocks.filter(
        (b) => b.parentId === active.parentId && b.kind === active.kind
      )
    : []
  const draggedClick = useRef(false)

  const layout = layoutCanvas(blocks)
  const WIDTH = layout.width,
    HEIGHT = layout.height

  function snapshot() {
    if (!active) return null
    const included = descendants(blocks, active.id)
    return {
      rootId: active.id,
      nodes: blocks.filter((b) => included.has(b.id)).map((b) => ({ ...b })),
    }
  }
  function copy() {
    const value = snapshot()
    if (value) {
      setClipboard(value)
      setAnnouncement(t.copied)
    }
  }
  function paste(value = clipboard) {
    if (!value) return
    const root = value.nodes.find((b) => b.id === value.rootId)!
    let parent: Block | undefined
    if (active?.kind === root.kind)
      parent = blocks.find((b) => b.id === active.parentId)
    else {
      parent = active
      while (parent && parent.kind !== parentKind[root.kind])
        parent = blocks.find((b) => b.id === parent?.parentId)
    }
    if (!active && root.parentId)
      parent = blocks.find(
        (b) => b.id === root.parentId && b.kind === parentKind[root.kind]
      )
    if (root.kind !== "cycle" && !parent) {
      setAnnouncement(t.pasteNeedsParent)
      return
    }
    if (parent && parent.kind !== parentKind[root.kind]) {
      setAnnouncement(t.pasteNeedsParent)
      return
    }
    const origin = active?.kind === root.kind ? active : root
    const clones = cloneBranch(
      value.nodes,
      value.rootId,
      parent?.id,
      parent ? 0 : origin.x + 40,
      parent ? 0 : origin.y + 40
    )
    const copiedRoot = clones.find(
      (b) => b.parentId === parent?.id && b.kind === root.kind
    )!
    const index =
      active?.kind === root.kind
        ? blocks.findIndex((b) => b.id === active.id) + 1
        : blocks.length
    setBlocks([...blocks.slice(0, index), ...clones, ...blocks.slice(index)])
    setSelected(copiedRoot.id)
  }
  function applySets(
    exercise: Block,
    amount: number,
    template: Partial<Block>,
    minimum: number
  ) {
    const existing = blocks.filter(
      (b) => b.parentId === exercise.id && b.kind === "set"
    )
    const values = Object.fromEntries(
      targetFields.map((f) => [f, template[f] || ""])
    )
    const rows = [
      {
        ...existing[0],
        id: existing[0]?.id ?? crypto.randomUUID(),
        kind: "set" as const,
        name: "",
        repeatCount: 1,
        description: "",
        x: 0,
        y: 0,
        parentId: exercise.id,
        ...values,
        setCount: amount,
        setCountMin: minimum,
      },
    ]
    const old = new Set(existing.map((s) => s.id))
    setBlocks((previous) => [
      ...previous.filter((b) => !old.has(b.id)),
      ...rows,
    ])
    setAnnouncement(t.setsApplied)
  }
  function absolute(block: Block) {
    return (
      layout.rects.get(block.id) ?? {
        x: 0,
        y: 0,
        width: 440,
        height: 324,
        depth: 0,
      }
    )
  }
  function targetAt(x: number, y: number, kind: Kind, id?: string) {
    return blocks
      .filter((b) => b.kind === parentKind[kind])
      .filter((c) => c.id !== id)
      .reverse()
      .sort((a, b) => absolute(b).depth - absolute(a).depth)
      .find((c) => {
        const r = absolute(c)
        return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height
      })
  }
  function point(clientX: number, clientY: number) {
    const rect = world.current!.getBoundingClientRect()
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom }
  }
  function place(
    kind: Kind,
    x: number,
    y: number,
    id?: string,
    targetX = x,
    targetY = y,
    forcedParent?: string
  ) {
    const parent = forcedParent
      ? blocks.find((b) => b.id === forcedParent)
      : targetAt(targetX, targetY, kind, id)
    if (
      (kind !== "cycle" && !parent) ||
      (parent && parent.kind !== parentKind[kind])
    ) {
      setAnnouncement(rule[kind])
      return
    }
    if (id && parent && descendants(blocks, id).has(parent.id)) {
      setAnnouncement(t.invalidCycle)
      return
    }
    const key = id ?? crypto.randomUUID()
    const next: Block = {
      ...(blocks.find((b) => b.id === id) ?? {
        id: key,
        kind,
        name: "",
        repeatCount: 1,
        description: "",
      }),
      x: Math.max(0, snap(x)),
      y: Math.max(0, snap(y)),
      parentId: parent?.id,
    }
    const siblings = blocks.filter(
      (b) => b.id !== id && b.parentId === parent?.id && b.kind === kind
    )
    const before =
      id && parent && !forcedParent
        ? siblings.find((b) => {
            const r = absolute(b)
            return kind === "day"
              ? targetX < r.x + r.width / 2
              : targetY < r.y + r.height / 2
          })
        : undefined
    const remaining = blocks.filter((b) => b.id !== id)
    const index = before
      ? remaining.findIndex((b) => b.id === before.id)
      : remaining.length
    setBlocks([...remaining.slice(0, index), next, ...remaining.slice(index)])
    setSelected(key)

    setAnnouncement(
      `${t[kind]} · ${parent?.name || (parent ? t.cycle : t.canvas)}`
    )
  }
  function add(kind: Kind) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    let block = blocks.find((b) => b.id === selected)
    while (block && block.kind !== parentKind[kind])
      block = blocks.find((b) => b.id === block?.parentId)
    const parent =
      block ?? blocks.filter((b) => b.kind === parentKind[kind]).at(-1)
    if (parent) {
      const r = absolute(parent)
      place(
        kind,
        r.x + 16,
        r.y + 108,
        undefined,
        r.x + 20,
        r.y + 120,
        parent.id
      )
      return
    }
    if (kind !== "cycle") {
      setAnnouncement(rule[kind])
      return
    }
    const view = viewport.current!
    place(
      kind,
      (view.scrollLeft + view.clientWidth / 2) / zoom - 220,
      (view.scrollTop + view.clientHeight / 2) / zoom - 162
    )
  }
  function start(
    event: PointerEvent<HTMLButtonElement>,
    kind: Kind,
    block?: Block
  ) {
    if (event.button !== 0) return
    suppressClick.current = false
    draggedClick.current = false
    const origin = block ? absolute(block) : null
    const cursor = point(event.clientX, event.clientY)
    drag.current = {
      kind,
      id: block?.id,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      offsetX: origin ? cursor.x - origin.x : 28,
      offsetY: origin ? cursor.y - origin.y : 20,
      moved: false,
    }
    if (block) {
      setSelected(block.id)
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function move(event: PointerEvent) {
    if (pan.current && viewport.current) {
      viewport.current.scrollLeft =
        pan.current.left - (event.clientX - pan.current.x)
      viewport.current.scrollTop =
        pan.current.top - (event.clientY - pan.current.y)
    }
    const current = drag.current
    if (!current) return
    if (
      Math.hypot(
        event.clientX - current.startX,
        event.clientY - current.startY
      ) > 5
    )
      current.moved = true
    if (current.moved) draggedClick.current = true
    current.x = event.clientX
    current.y = event.clientY
    if (current.moved) {
      const cursor = point(event.clientX, event.clientY)
      const target = targetAt(cursor.x, cursor.y, current.kind, current.id)
      current.targetId =
        target &&
        (!current.id || !descendants(blocks, current.id).has(target.id))
          ? target.id
          : undefined
      setGhost({ ...current })
    }
  }
  function end(event: PointerEvent) {
    pan.current = null
    const current = drag.current
    drag.current = null
    setGhost(null)
    if (!current?.moved) return
    suppressClick.current = !current.id
    const rect = viewport.current!.getBoundingClientRect()
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      return
    const cursor = point(event.clientX, event.clientY)
    place(
      current.kind,
      cursor.x - current.offsetX,
      cursor.y - current.offsetY,
      current.id,
      cursor.x,
      cursor.y
    )
  }
  function remove(block: Block) {
    const removed = descendants(blocks, block.id)
    if (removed.size > 1 && !window.confirm(t.removeBranch)) return
    setBlocks((previous) => previous.filter((b) => !removed.has(b.id)))
    setSelected(null)
  }
  function keyboard(event: KeyboardEvent, block: Block) {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault()
      remove(block)
      return
    }
    const direction: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowDown: 1,
    }
    if (!direction[event.key]) return
    event.preventDefault()
    if (block.parentId) {
      if (
        block.kind === "day" &&
        !["ArrowLeft", "ArrowRight"].includes(event.key)
      )
        return
      if (block.kind !== "day" && !["ArrowUp", "ArrowDown"].includes(event.key))
        return
      const siblings = blocks.filter(
        (b) => b.parentId === block.parentId && b.kind === block.kind
      )
      const neighbor =
        siblings[
          siblings.findIndex((b) => b.id === block.id) + direction[event.key]
        ]
      if (!neighbor) return
      const next = [...blocks],
        a = next.findIndex((b) => b.id === block.id),
        b = next.findIndex((b) => b.id === neighbor.id)
      ;[next[a], next[b]] = [next[b], next[a]]
      setBlocks(next)
    } else {
      const delta = (event.shiftKey ? 40 : 8) * direction[event.key]
      setBlocks((previous) =>
        previous.map((b) =>
          b.id === block.id
            ? {
                ...b,
                x: Math.max(
                  0,
                  b.x +
                    (["ArrowLeft", "ArrowRight"].includes(event.key)
                      ? delta
                      : 0)
                ),
                y: Math.max(
                  0,
                  b.y +
                    (["ArrowUp", "ArrowDown"].includes(event.key) ? delta : 0)
                ),
              }
            : b
        )
      )
    }
  }
  function changeZoom(next: number) {
    const value = Math.max(0.5, Math.min(1.5, next))
    const view = viewport.current!
    const centerX = (view.scrollLeft + view.clientWidth / 2) / zoom
    const centerY = (view.scrollTop + view.clientHeight / 2) / zoom
    setZoom(value)
    requestAnimationFrame(() => {
      view.scrollLeft = centerX * value - view.clientWidth / 2
      view.scrollTop = centerY * value - view.clientHeight / 2
    })
  }
  function nameField(block: Block) {
    return (
      <input
        className="canvas-name"
        aria-label={
          block.kind === "cycle"
            ? t.cycleName
            : block.kind === "day"
              ? t.dayName
              : t.groupName
        }
        maxLength={200}
        value={block.name}
        placeholder={
          block.kind === "cycle"
            ? t.cyclePlaceholder
            : block.kind === "day"
              ? t.dayPlaceholder
              : t.groupPlaceholder
        }
        onFocus={() => setSelected(block.id)}
        onChange={(event) =>
          setBlocks((previous) =>
            previous.map((b) =>
              b.id === block.id ? { ...b, name: event.target.value } : b
            )
          )
        }
      />
    )
  }
  function handle(block: Block) {
    return (
      <button
        type="button"
        className="canvas-drag-handle"
        aria-label={`${t.move}: ${block.name || t[block.kind]}`}
        onPointerDown={(event) => start(event, block.kind, block)}
        onKeyDown={(event) => keyboard(event, block)}
      >
        <GripVertical size={15} aria-hidden="true" />
        <span>{t[block.kind]}</span>
      </button>
    )
  }
  function updateActive(update: Partial<Block>) {
    if (!active) return
    setBlocks((previous) =>
      previous.map((b) => (b.id === active.id ? { ...b, ...update } : b))
    )
  }
  function reparent(parentId: string) {
    if (!active || (!parentId && active.kind !== "cycle")) return
    if (
      parentId &&
      (!blocks.some(
        (c) => c.id === parentId && c.kind === parentKind[active.kind]
      ) ||
        descendants(blocks, active.id).has(parentId))
    )
      return
    const next = { ...active, parentId: parentId || undefined }
    setBlocks((previous) => [
      ...previous.filter((b) => b.id !== active.id),
      next,
    ])
  }
  function reorder(position: number) {
    if (
      !active ||
      !Number.isInteger(position) ||
      position < 1 ||
      position > activeSiblings.length
    )
      return
    const ordered = [...activeSiblings.filter((b) => b.id !== active.id)]
    ordered.splice(position - 1, 0, active)
    const replacements = new Map(
      activeSiblings.map((b, i) => [b.id, ordered[i]])
    )
    setBlocks((previous) => previous.map((b) => replacements.get(b.id) ?? b))
  }
  function summary(block: Block) {
    return [
      block.targetRepsMin && block.targetRepsMax
        ? `${block.targetRepsMin === block.targetRepsMax ? block.targetRepsMin : `${block.targetRepsMin}–${block.targetRepsMax}`} ${t.reps}`
        : "",
      block.valueMin && block.valueMax
        ? `${block.valueMin}–${block.valueMax} ${block.valueUnit === "percent_1rm" ? "% 1RM" : block.valueUnit || ""}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ")
  }
  function nodeCard(block: Block): React.ReactNode {
    const rect = absolute(block),
      nested = blocks.filter((b) => b.parentId === block.id)
    const childDays =
        block.kind === "cycle" ? nested.filter((b) => b.kind === "day") : [],
      stack =
        block.kind === "cycle"
          ? nested.filter((b) => b.kind === "cycle")
          : nested
    const index =
      blocks
        .filter((b) => b.parentId === block.parentId && b.kind === block.kind)
        .findIndex((b) => b.id === block.id) + 1
    return (
      <article
        key={block.id}
        data-canvas-node={block.kind}
        data-block-id={block.id}
        data-parent-id={block.parentId || ""}
        data-drop-target={ghost?.targetId === block.id || undefined}
        className={`canvas-tree-node canvas-${block.kind}`}
        data-selected={selected === block.id || undefined}
        onClick={(e) => {
          e.stopPropagation()
          if (
            !draggedClick.current &&
            !(e.target as HTMLElement).closest(".canvas-delete")
          ) {
            setSelected(block.id)
            if (
              !(e.target as HTMLElement).closest("input,textarea,button,select")
            )
              viewport.current?.focus({ preventScroll: true })
          }
          draggedClick.current = false
        }}
        style={{
          position: block.parentId ? "relative" : "absolute",
          left: block.parentId ? undefined : rect.x,
          top: block.parentId ? undefined : rect.y,
          width: rect.width,
          height: rect.height,
          flexShrink: 0,
          padding: 0,
        }}
      >
        <div
          className={`canvas-tree-header ${block.kind === "cycle" ? "canvas-cycle-header" : ""}`}
          style={{
            height: block.kind === "set" ? 78 : headerHeight(block.kind) - 16,
          }}
        >
          <div className="canvas-node-heading">
            <Icon kind={block.kind} />
            {handle(block)}
            {block.kind === "exercise" &&
              nested.some((b) => b.kind === "set") &&
              setTotalLabel(nested.filter((b) => b.kind === "set")) !== "1" && (
                <span className="canvas-repeat-badge" title={t.setAmount}>
                  × {setTotalLabel(nested.filter((b) => b.kind === "set"))}
                </span>
              )}
            {["cycle", "group"].includes(block.kind) && (
              <span className="canvas-repeat-badge" title={t.repeatCount}>
                × {block.repeatCount ?? 1}
              </span>
            )}
            <button
              type="button"
              className="canvas-delete"
              aria-label={`${t.remove}: ${block.name || t[block.kind]}`}
              onClick={() => remove(block)}
            >
              <X size={13} />
            </button>
          </div>
          {["cycle", "day", "group"].includes(block.kind) ? (
            nameField(block)
          ) : (
            <button
              type="button"
              className="canvas-object-title"
              onClick={() => {
                setSelected(block.id)
                if (block.kind === "exercise") setPickerId(block.id)
              }}
            >
              {block.kind === "exercise"
                ? catalog.find((e) => e.id === block.exerciseId)?.name ||
                  t.chooseExercise
                : `${t.set} ${index}`}
            </button>
          )}
          {block.kind === "set" &&
            (setCount(block) > 1 || setMinimum(block) !== setCount(block)) && (
              <span className="canvas-quantity-badge">
                ×{setCountLabel(block)}
              </span>
            )}
          {block.kind === "set" && (
            <p
              className="canvas-set-summary"
              data-invalid={!!targetError(block) || undefined}
            >
              {summary(block) || "—"}
            </p>
          )}
        </div>
        {block.kind !== "set" && (
          <div
            className={`canvas-tree-content ${block.kind === "cycle" ? "canvas-cycle-content" : ""}`}
            style={{ top: headerHeight(block.kind) }}
          >
            {!nested.length && (
              <span className="canvas-drop-hint">
                <Icon kind={block.kind} />
                {dropCopy[block.kind]}
              </span>
            )}
            {!!childDays.length && (
              <div
                className="canvas-days-row"
                style={{ height: absolute(childDays[0]).height }}
              >
                {childDays.map(nodeCard)}
              </div>
            )}
            {stack.map(nodeCard)}
          </div>
        )}
      </article>
    )
  }
  return (
    <div
      className="program-canvas-builder"
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={() => {
        drag.current = null
        pan.current = null
        setGhost(null)
      }}
      onKeyDown={(event) => {
        if (
          pickerId ||
          (event.target as HTMLElement).closest('[role="dialog"]')
        )
          return
        const typing = (event.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable=true]"
        )
        if (!typing && (event.ctrlKey || event.metaKey) && !event.altKey) {
          const key = event.key.toLowerCase()
          if (key === "c" && active) {
            event.preventDefault()
            copy()
            return
          }
          if (key === "v" && clipboard) {
            event.preventDefault()
            paste()
            return
          }
          if (key === "d" && active) {
            event.preventDefault()
            paste(snapshot())
            return
          }
        }
        if (event.key === "Escape") {
          drag.current = null
          pan.current = null
          setGhost(null)
        }
      }}
    >
      <aside className="canvas-palette" aria-label={t.blocks}>
        <div className="canvas-palette-intro">
          <h2>{t.blocks}</h2>
          <p>{t.blocksHint}</p>
          <p className="canvas-layout-hint">{t.layoutHint}</p>
          <p>{t.allBlocksHint}</p>
          {!cycles.length && <p>{t.dayNeedsCycle}</p>}
        </div>
        <div className="canvas-palette-blocks">
          {(["cycle", "day", "group", "exercise", "set"] as const).map(
            (kind) => (
              <button
                className={`canvas-palette-item palette-${kind}`}
                type="button"
                key={kind}
                aria-label={`${t.blocks}: ${t[kind]}`}
                disabled={
                  kind !== "cycle" &&
                  !blocks.some((b) => b.kind === parentKind[kind])
                }
                onPointerDown={(event) => start(event, kind)}
                onClick={() => add(kind)}
              >
                <span className="canvas-palette-icon">
                  <Icon kind={kind} />
                </span>
                <strong>{t[kind]}</strong>
                <GripVertical
                  size={14}
                  className="canvas-palette-grip"
                  aria-hidden="true"
                />
              </button>
            )
          )}
        </div>
      </aside>
      <section className="canvas-workspace" aria-label={t.canvas}>
        <div className="canvas-toolbar">
          {saveStatus}
          <span>
            <Layers3 size={14} />
            {t.canvas}
          </span>
          <div className="canvas-command-bar">
            <ProgramExport
              name={programName}
              blocks={blocks}
              catalog={catalog}
              copy={t}
            />
            <div className="canvas-clipboard-tools">
              <button
                type="button"
                aria-label={t.copyBlock}
                title={`${t.copyBlock} · Ctrl/Cmd+C`}
                disabled={!active}
                onClick={copy}
              >
                <Copy size={14} />
              </button>
              <button
                type="button"
                aria-label={t.pasteBlock}
                title={`${t.pasteBlock} · Ctrl/Cmd+V`}
                disabled={!clipboard}
                onClick={() => paste()}
              >
                <ClipboardPaste size={14} />
              </button>
              <button
                type="button"
                aria-label={t.duplicateBlock}
                title={`${t.duplicateBlock} · Ctrl/Cmd+D`}
                disabled={!active}
                onClick={() => paste(snapshot())}
              >
                <CopyPlus size={14} />
              </button>
            </div>
            <div className="canvas-zoom">
              <button
                type="button"
                disabled={zoom <= 0.5}
                aria-label={t.zoomOut}
                onClick={() => changeZoom(zoom - 0.1)}
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                aria-label={t.resetZoom}
                onClick={() => changeZoom(1)}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                disabled={zoom >= 1.5}
                aria-label={t.zoomIn}
                onClick={() => changeZoom(zoom + 0.1)}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
        <div
          className="canvas-viewport"
          ref={viewport}
          tabIndex={0}
          aria-label={t.canvas}
        >
          <div
            style={{ width: WIDTH * zoom, height: HEIGHT * zoom }}
            className="canvas-scroll-size"
          >
            <div
              className="canvas-world"
              ref={world}
              style={{
                width: WIDTH,
                height: HEIGHT,
                transform: `scale(${zoom})`,
              }}
              onPointerDown={(event) => {
                if (
                  (event.button === 0 || event.button === 1) &&
                  !(event.target as HTMLElement).closest("[data-canvas-node]")
                ) {
                  event.preventDefault()
                  setSelected(null)
                  pan.current = {
                    x: event.clientX,
                    y: event.clientY,
                    left: viewport.current!.scrollLeft,
                    top: viewport.current!.scrollTop,
                  }
                  event.currentTarget.setPointerCapture(event.pointerId)
                }
              }}
            >
              {cycles.filter((c) => !c.parentId).map(nodeCard)}
            </div>
          </div>
          {!blocks.length && (
            <div className="canvas-empty">
              <span>
                <Layers3 size={30} strokeWidth={1.2} />
              </span>
              <h3>{t.emptyCanvas}</h3>
              <p>{t.emptyCanvasHint}</p>
            </div>
          )}
        </div>
        <footer className="canvas-status">
          {[
            ...Object.values(rule),
            t.pasteNeedsParent,
            t.copied,
            t.setsApplied,
          ].includes(announcement) && (
            <span
              className="canvas-feedback"
              data-error={
                [...Object.values(rule), t.pasteNeedsParent].includes(
                  announcement
                ) || undefined
              }
            >
              {announcement}
            </span>
          )}
          <span>{t.canvasHint}</span>
          <span>
            {t.counts
              .replace("{cycles}", String(cycles.length))
              .replace("{days}", String(days.length))}
          </span>
        </footer>
      </section>
      <aside className="canvas-inspector" aria-label={t.options}>
        <header>
          <div>
            <Settings2 size={16} aria-hidden="true" />
            <h2>{t.options}</h2>
          </div>
          {active && (
            <button
              type="button"
              aria-label={t.closeOptions}
              onClick={() => setSelected(null)}
            >
              <X size={16} />
            </button>
          )}
        </header>
        {active ? (
          <div className="canvas-inspector-fields" key={active.id}>
            <div className="canvas-inspector-kind">
              <Icon kind={active.kind} />
              <strong>{t[active.kind]}</strong>
            </div>
            {["cycle", "day", "group"].includes(active.kind) && (
              <>
                {" "}
                <label htmlFor="object-title">{t.objectTitle}</label>
                <input
                  id="object-title"
                  value={active.name}
                  maxLength={200}
                  onChange={(e) => updateActive({ name: e.target.value })}
                  placeholder={
                    active.kind === "cycle"
                      ? t.cyclePlaceholder
                      : active.kind === "day"
                        ? t.dayPlaceholder
                        : t.groupPlaceholder
                  }
                />
              </>
            )}
            {active.kind === "exercise" && (
              <>
                <label>{t.chooseExercise}</label>
                <button
                  className="exercise-picker-trigger"
                  type="button"
                  onClick={() => setPickerId(active.id)}
                >
                  <Dumbbell size={17} />
                  <span>
                    {catalog.find((e) => e.id === active.exerciseId)?.name ||
                      t.chooseExercise}
                  </span>
                </button>
                <IdenticalSets
                  key={active.id}
                  sets={blocks.filter(
                    (b) => b.parentId === active.id && b.kind === "set"
                  )}
                  copy={t}
                  onApply={(amount, template, minimum) =>
                    applySets(active, amount, template, minimum)
                  }
                />
              </>
            )}
            {active.kind === "set" && (
              <>
                <SetCountFields
                  key={active.id}
                  prefix="object-set-count"
                  value={active}
                  copy={t}
                  onChange={updateActive}
                />
              </>
            )}
            {active.kind === "set" && (
              <TargetFields
                key={active.id}
                prefix="target"
                value={active}
                copy={t}
                onChange={updateActive}
              />
            )}
            {["cycle", "group"].includes(active.kind) && (
              <>
                <label htmlFor="object-repeats">{t.repeatCount}</label>
                <input
                  id="object-repeats"
                  type="number"
                  min={1}
                  max={2147483647}
                  step={1}
                  value={active.repeatCount ?? 1}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isInteger(n) && n >= 1 && n <= 2147483647)
                      updateActive({ repeatCount: n })
                  }}
                />
                {active.kind === "cycle" && (
                  <>
                    <label htmlFor="object-description">{t.description}</label>
                    <textarea
                      id="object-description"
                      value={active.description ?? ""}
                      maxLength={10000}
                      rows={5}
                      onChange={(e) =>
                        updateActive({ description: e.target.value })
                      }
                    />
                  </>
                )}
              </>
            )}
            <label htmlFor="object-parent">
              {["cycle", "day"].includes(active.kind)
                ? t.parentCycle
                : t.parent}
            </label>
            <select
              id="object-parent"
              value={active.parentId || ""}
              onChange={(e) => reparent(e.target.value)}
            >
              {active.kind === "cycle" && (
                <option value="">{t.topLevel}</option>
              )}
              {blocks
                .filter(
                  (c) =>
                    c.kind === parentKind[active.kind] &&
                    !descendants(blocks, active.id).has(c.id)
                )
                .map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {c.name || `${t[c.kind]} ${i + 1}`}
                  </option>
                ))}
            </select>
            <label htmlFor="object-position">{t.position}</label>
            <input
              id="object-position"
              type="number"
              min={1}
              max={activeSiblings.length}
              step={1}
              value={activeSiblings.findIndex((b) => b.id === active.id) + 1}
              onChange={(e) => reorder(Number(e.target.value))}
            />
            {active.kind === "day" && (
              <p className="canvas-inspector-note">{t.minDayWidthHint}</p>
            )}
            <button
              className="canvas-inspector-remove"
              type="button"
              onClick={() => remove(active)}
            >
              <X size={14} />
              {t.remove}
            </button>
          </div>
        ) : (
          <div className="canvas-inspector-empty">
            <Settings2 size={28} strokeWidth={1.2} />
            <p>{t.optionsHint}</p>
          </div>
        )}
      </aside>
      {ghost && (
        <div
          className={`canvas-drag-ghost palette-${ghost.kind}`}
          style={{ left: ghost.x + 14, top: ghost.y + 14 }}
        >
          <Icon kind={ghost.kind} />
          {t[ghost.kind]}
        </div>
      )}
      {pickerId && (
        <ExercisePicker
          key={pickerId}
          copy={t}
          catalog={catalog}
          currentId={blocks.find((b) => b.id === pickerId)?.exerciseId}
          onClose={() => setPickerId(null)}
          onPick={(exercise) => {
            setBlocks((previous) =>
              previous.map((b) =>
                b.id === pickerId
                  ? { ...b, exerciseId: exercise.id, name: exercise.name }
                  : b
              )
            )
            setPickerId(null)
          }}
        />
      )}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  )
}
