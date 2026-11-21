import { blockInput, programInput, type SavedProgram } from "./validation"
import {
  targetError,
  parentKind,
  targetFields,
  type CanvasBlock,
} from "@/components/programs/canvas-layout"

// Normalize defaults and object-key order so a server round trip does not schedule another save.
export function normalizedDraft(name: string, blocks: CanvasBlock[]) {
  return {
    name: name.trim(),
    blocks: blocks.map((b) =>
      blockInput.parse(
        b.kind === "set"
          ? {
              ...b,
              setCount: b.setCount ?? 1,
              setCountMin: b.setCountMin ?? b.setCount ?? 1,
              ...Object.fromEntries(targetFields.map((f) => [f, b[f] ?? ""])),
            }
          : b
      )
    ),
  }
}
export function saveableDraft(
  name: string,
  blocks: CanvasBlock[],
  previous?: SavedProgram
) {
  const old = new Map(previous?.blocks.map((b) => [b.id, b]) ?? [])
  const candidate = new Map<string, CanvasBlock>()
  let skipped = false
  for (const b of blocks) {
    const valid =
      blockInput.safeParse(b).success &&
      (b.kind !== "cycle" || !!b.name.trim()) &&
      (b.kind !== "exercise" || !!b.exerciseId) &&
      (b.kind !== "set" ||
        (!targetError(b) &&
          (b.setCountMin ?? b.setCount ?? 1) <= (b.setCount ?? 1)))
    if (valid) candidate.set(b.id, b)
    else {
      skipped = true
      const fallback = old.get(b.id)
      if (fallback) candidate.set(b.id, fallback)
    }
  }
  // New incomplete parents omit their new children too. Existing invalid objects retain their saved branch.
  let changed = true
  while (changed) {
    changed = false
    for (const [id, b] of candidate) {
      if (b.parentId && !candidate.has(b.parentId)) {
        const fallback = old.get(id),
          parent = fallback?.parentId ? old.get(fallback.parentId) : undefined
        if (fallback && (!fallback.parentId || parent)) {
          candidate.set(id, fallback)
          if (parent) candidate.set(parent.id, parent)
        } else candidate.delete(id)
        changed = true
        skipped = true
      }
    }
  }
  const effectiveName = name.trim() || previous?.name || ""
  if (!name.trim()) skipped = true
  const parsed = programInput.safeParse({
    name: effectiveName,
    blocks: [...candidate.values()],
  })
  if (!parsed.success) return { draft: null, skipped: true }
  // Invalid hierarchy, duplicates and global limits remain blocked by the shared server validator.
  for (const b of parsed.data.blocks)
    if (b.parentId && candidate.get(b.parentId)?.kind !== parentKind[b.kind])
      return { draft: null, skipped: true }
  return {
    draft: normalizedDraft(parsed.data.name, parsed.data.blocks),
    skipped,
  }
}
