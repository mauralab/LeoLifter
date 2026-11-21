export type CanvasKind = "cycle" | "day" | "group" | "exercise" | "set"
export type CanvasBlock = {
  id: string
  kind: CanvasKind
  name: string
  repeatCount: number
  description: string
  x: number
  y: number
  setCount?: number
  setCountMin?: number
  exerciseId?: string
  targetRepsMin?: string
  targetRepsMax?: string
  valueMin?: string
  valueMax?: string
  valueUnit?: string
  parentId?: string
}
export type CanvasRect = {
  x: number
  y: number
  width: number
  height: number
  depth: number
}
export const MIN_DAY_WIDTH = 240
export type ExerciseOption = {
  id: string
  name: string
  type: string
  description?: string
  includesOwnWeight?: boolean
  includesAdditionalWeight?: boolean
}
export const parentKind: Record<CanvasKind, CanvasKind> = {
  cycle: "cycle",
  day: "cycle",
  group: "day",
  exercise: "group",
  set: "exercise",
}
export const headerHeight = (kind: CanvasKind) =>
  ({ cycle: 108, day: 88, group: 82, exercise: 88, set: 0 })[kind]
const PAD = 16,
  GAP = 16
export function descendants(blocks: CanvasBlock[], id: string): Set<string> {
  const result = new Set([id])
  let changed = true
  while (changed) {
    changed = false
    for (const b of blocks)
      if (b.parentId && result.has(b.parentId) && !result.has(b.id)) {
        result.add(b.id)
        changed = true
      }
  }
  return result
}
export function layoutCanvas(blocks: CanvasBlock[]) {
  const rects = new Map<string, CanvasRect>()
  const children = (id: string) => blocks.filter((b) => b.parentId === id)
  const memo = new Map<string, { width: number; height: number }>()
  function measure(block: CanvasBlock): { width: number; height: number } {
    const cached = memo.get(block.id)
    if (cached) return cached
    if (block.kind === "set") return { width: 220, height: 78 }
    const nested = children(block.id),
      days =
        block.kind === "cycle" ? nested.filter((b) => b.kind === "day") : [],
      stack =
        block.kind === "cycle"
          ? nested.filter((b) => b.kind === "cycle")
          : nested
    const sizes = stack.map(measure),
      daySizes = days.map(measure)
    const row = days.length
      ? Math.max(...daySizes.map((s) => s.height))
      : !stack.length
        ? { cycle: 200, day: 160, group: 100, exercise: 80 }[block.kind]
        : 0
    const width = Math.max(
      block.kind === "cycle"
        ? 440
        : block.kind === "day"
          ? MIN_DAY_WIDTH
          : block.kind === "group"
            ? 224
            : 192,
      days.length
        ? daySizes.reduce((n, s) => n + s.width, 0) +
            (days.length - 1) * GAP +
            PAD * 2
        : 0,
      ...sizes.map((s) => s.width + PAD * 2)
    )
    const size = {
      width,
      height:
        headerHeight(block.kind) +
        PAD +
        row +
        sizes.reduce((n, s) => n + s.height, 0) +
        Math.max(0, stack.length + (row ? 1 : 0) - 1) * GAP,
    }
    memo.set(block.id, size)
    return size
  }
  function arrange(
    block: CanvasBlock,
    x: number,
    y: number,
    width: number,
    height: number,
    depth: number
  ) {
    rects.set(block.id, { x, y, width, height, depth })
    if (block.kind === "set") return
    const nested = children(block.id),
      days =
        block.kind === "cycle" ? nested.filter((b) => b.kind === "day") : [],
      stack =
        block.kind === "cycle"
          ? nested.filter((b) => b.kind === "cycle")
          : nested
    const sizes = stack.map(measure)
    let top = y + headerHeight(block.kind)
    if (days.length) {
      const rowHeight =
        height -
        headerHeight(block.kind) -
        PAD -
        sizes.reduce((n, s) => n + s.height, 0) -
        stack.length * GAP
      const minimums = days.map(measure),
        extra =
          (width -
            PAD * 2 -
            (days.length - 1) * GAP -
            minimums.reduce((n, s) => n + s.width, 0)) /
          days.length
      let left = x + PAD
      days.forEach((day, i) => {
        const w = minimums[i].width + extra
        arrange(day, left, top, w, rowHeight, depth + 1)
        left += w + GAP
      })
      top += rowHeight + GAP
    }
    stack.forEach((child, i) => {
      arrange(child, x + PAD, top, width - PAD * 2, sizes[i].height, depth + 1)
      top += sizes[i].height + GAP
    })
  }
  blocks
    .filter((b) => b.kind === "cycle" && !b.parentId)
    .forEach((root) => {
      const size = measure(root)
      arrange(root, root.x, root.y, size.width, size.height, 0)
    })
  return {
    rects,
    width: Math.max(
      2400,
      ...[...rects.values()].map((r) => r.x + r.width + 80)
    ),
    height: Math.max(
      1600,
      ...[...rects.values()].map((r) => r.y + r.height + 80)
    ),
  }
}
export function targetError(block: Partial<CanvasBlock>) {
  const lo = block.targetRepsMin || "",
    hi = block.targetRepsMax || "",
    min = block.valueMin || "",
    max = block.valueMax || "",
    unit = block.valueUnit || ""
  if (
    (lo || hi) &&
    (!/^[1-9][0-9]*$/.test(lo) ||
      !/^[1-9][0-9]*$/.test(hi) ||
      Number(lo) > Number(hi) ||
      Number(hi) > 2147483647)
  )
    return "reps"
  const numeric = (s: string) => /^\d{1,9}(\.\d{1,3})?$/.test(s)
  if (
    (min || max || unit) &&
    (!numeric(min) ||
      !numeric(max) ||
      Number(min) > Number(max) ||
      !["kg", "lb", "percent_1rm", "km", "mi", "s"].includes(unit))
  )
    return "value"
  return ""
}

export function cloneBranch(
  branch: CanvasBlock[],
  rootId: string,
  parentId?: string,
  x = 0,
  y = 0
) {
  const ids = new Map(branch.map((b) => [b.id, crypto.randomUUID()]))
  return branch.map((b) => ({
    ...b,
    id: ids.get(b.id)!,
    parentId: b.id === rootId ? parentId : ids.get(b.parentId!),
    x: b.id === rootId ? x : b.x,
    y: b.id === rootId ? y : b.y,
  }))
}
export const targetFields = [
  "targetRepsMin",
  "targetRepsMax",
  "valueMin",
  "valueMax",
  "valueUnit",
] as const
export function sameTargets(a: Partial<CanvasBlock>, b: Partial<CanvasBlock>) {
  return targetFields.every((f) => (a[f] || "") === (b[f] || ""))
}

export function setCount(block: Partial<CanvasBlock>) {
  const amount = block.setCount ?? 1
  return Number.isInteger(amount) && amount >= 1 && amount <= 100 ? amount : 1
}

export function setMinimum(block: Partial<CanvasBlock>) {
  return block.setCountMin ?? setCount(block)
}
export function setCountLabel(block: Partial<CanvasBlock>) {
  const min = setMinimum(block),
    max = setCount(block)
  return min === max ? String(max) : `${min}–${max}`
}
export function setTotalLabel(blocks: CanvasBlock[]) {
  const min = blocks.reduce((n, b) => n + setMinimum(b), 0),
    max = blocks.reduce((n, b) => n + setCount(b), 0)
  return min === max ? String(max) : `${min}–${max}`
}
