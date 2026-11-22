import "server-only"
import { createHash } from "node:crypto"
import type { PoolClient, QueryResultRow } from "pg"
import { getPool } from "@/lib/db"
import type {
  CanvasBlock,
  CanvasKind,
} from "@/components/programs/canvas-layout"
import type { ProgramInput, SavedProgram } from "./validation"

type Row = QueryResultRow & { id: string }
type Node = {
  id: string
  kind: CanvasKind
  rows: string[]
  name: string
  x: number
  y: number
}
const tables = {
  cycle: "program_cycles",
  day: "program_days",
  group: "program_day_groups",
  exercise: "program_day_sets",
  set: "program_set_exercises",
} as const
const kinds = Object.keys(tables) as CanvasKind[]
export class ProgramError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message)
  }
}
const numeric = (v: unknown) => (v == null ? "" : String(Number(v)))
const targets = (r: Row) => ({
  targetRepsMin: numeric(r.target_reps_min),
  targetRepsMax: numeric(r.target_reps_max),
  valueMin: numeric(r.value_min),
  valueMax: numeric(r.value_max),
  valueUnit: r.value_unit ?? "",
})

async function read(c: PoolClient, id: string, userId: string) {
  const p = (
    await c.query("SELECT * FROM programs WHERE id=$1 AND author_id=$2", [
      id,
      userId,
    ])
  ).rows[0]
  if (!p) throw new ProgramError("Program not found.", 404)
  const rows: Record<CanvasKind, Row[]> = {
    cycle: [],
    day: [],
    group: [],
    exercise: [],
    set: [],
  }
  rows.cycle = (
    await c.query(
      "SELECT * FROM program_cycles WHERE program_id=$1 ORDER BY position,id",
      [id]
    )
  ).rows
  rows.day = (
    await c.query(
      "SELECT d.* FROM program_days d JOIN program_cycles c ON c.id=d.program_cycle_id WHERE c.program_id=$1 ORDER BY day_index,d.id",
      [id]
    )
  ).rows
  rows.group = (
    await c.query(
      "SELECT g.* FROM program_day_groups g JOIN program_days d ON d.id=g.program_day_id JOIN program_cycles c ON c.id=d.program_cycle_id WHERE c.program_id=$1 ORDER BY position,g.id",
      [id]
    )
  ).rows
  rows.exercise = (
    await c.query(
      "SELECT e.* FROM program_day_sets e JOIN program_day_groups g ON g.id=e.program_group_id JOIN program_days d ON d.id=g.program_day_id JOIN program_cycles c ON c.id=d.program_cycle_id WHERE c.program_id=$1 ORDER BY position,e.id",
      [id]
    )
  ).rows
  rows.set = (
    await c.query(
      "SELECT s.* FROM program_set_exercises s JOIN program_day_sets e ON e.id=s.program_day_set_id JOIN program_day_groups g ON g.id=e.program_group_id JOIN program_days d ON d.id=g.program_day_id JOIN program_cycles c ON c.id=d.program_cycle_id WHERE c.program_id=$1 ORDER BY s.position,s.id",
      [id]
    )
  ).rows
  const doc = (
    await c.query(
      "SELECT document FROM program_editor_layouts WHERE program_id=$1",
      [id]
    )
  ).rows[0]?.document as { nodes: Node[] } | undefined
  const revision = createHash("sha256")
    .update(JSON.stringify({ p, rows, doc }))
    .digest("hex")
  const blocks: CanvasBlock[] = []
  const nodes: Node[] = []
  const parentId = (kind: CanvasKind, rowId: string) =>
    nodes.find((n) => n.kind === kind && n.rows.includes(rowId))?.id
  for (const kind of kinds) {
    const consumed = new Set<string>()
    for (const r of rows[kind]) {
      if (consumed.has(r.id)) continue
      const meta = doc?.nodes.find(
        (n) => n.kind === kind && n.rows.includes(r.id)
      )
      let members = [r]
      if (kind === "set" && meta) {
        const candidates = rows.set.filter((s) => meta.rows.includes(s.id))
        const same = candidates.every(
          (s) =>
            s.program_day_set_id === r.program_day_set_id &&
            JSON.stringify(targets(s)) === JSON.stringify(targets(r))
        )
        const consecutive = candidates.every(
          (s, i) => Number(s.position) === Number(candidates[0].position) + i
        )
        const ordered = candidates.every(
          (s, i) =>
            !s.is_optional || candidates.slice(i).every((t) => t.is_optional)
        )
        if (same && consecutive && ordered && candidates.length <= 100)
          members = candidates
      }
      members.forEach((s) => consumed.add(s.id))
      const uiId =
        meta && !nodes.some((n) => n.id === meta.id)
          ? meta.id
          : `${kind}:${r.id}`
      const parent =
        kind === "cycle"
          ? r.parent_cycle_id
            ? parentId("cycle", r.parent_cycle_id)
            : undefined
          : kind === "day"
            ? parentId("cycle", r.program_cycle_id)
            : kind === "group"
              ? parentId("day", r.program_day_id)
              : kind === "exercise"
                ? parentId("group", r.program_group_id)
                : parentId("exercise", r.program_day_set_id)
      // Cycle parents may appear later in the position-sorted result; resolve them below.
      const b: CanvasBlock = {
        id: uiId,
        kind,
        name:
          kind === "cycle" || kind === "group"
            ? (r.name ?? "")
            : (meta?.name ?? ""),
        description: kind === "cycle" ? (r.description ?? "") : "",
        repeatCount: r.repeat_count ?? 1,
        x: meta?.x ?? 80,
        y: meta?.y ?? 80,
        parentId: parent,
      }
      if (kind === "exercise") b.exerciseId = r.exercise_id
      if (kind === "set")
        Object.assign(b, targets(r), {
          setCount: members.length,
          setCountMin: members.filter((s) => !s.is_optional).length,
        })
      blocks.push(b)
      nodes.push({
        id: uiId,
        kind,
        rows: members.map((s) => s.id),
        name: b.name,
        x: b.x,
        y: b.y,
      })
    }
  }
  for (const r of rows.cycle)
    if (r.parent_cycle_id) {
      const b = blocks.find((b) => b.id === parentId("cycle", r.id))!
      b.parentId = parentId("cycle", r.parent_cycle_id)
    }
  return { id, name: p.name, revision, blocks, nodes, rows }
}
export async function loadProgram(
  id: string,
  userId: string
): Promise<SavedProgram> {
  const c = await getPool().connect()
  try {
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
    const p = await read(c, id, userId)
    await c.query("COMMIT")
    return { id: p.id, name: p.name, revision: p.revision, blocks: p.blocks }
  } catch (e) {
    await c.query("ROLLBACK")
    throw e
  } finally {
    c.release()
  }
}
export async function listPrograms(userId: string) {
  return (
    await getPool().query(
      "SELECT id,name FROM programs WHERE author_id=$1 ORDER BY updated_at DESC,id DESC",
      [userId]
    )
  ).rows as { id: string; name: string }[]
}
export async function saveProgram(
  input: ProgramInput,
  userId: string,
  id?: string
): Promise<SavedProgram> {
  const c = await getPool().connect()
  try {
    await c.query("BEGIN")
    let old: Awaited<ReturnType<typeof read>> | undefined
    if (id) {
      // Match the root-row lock used by LeoCore's ProgramManager.
      if (
        !(
          await c.query(
            "SELECT id FROM programs WHERE id=$1 AND author_id=$2 FOR UPDATE",
            [id, userId]
          )
        ).rowCount
      )
        throw new ProgramError("Program not found.", 404)
      old = await read(c, id, userId)
      if (input.revision !== old.revision)
        throw new ProgramError(
          "This program changed elsewhere. Reopen it before saving to avoid overwriting those changes.",
          409
        )
    } else {
      id = (
        await c.query(
          "INSERT INTO programs(name,author_id,is_public) VALUES($1,$2,false) RETURNING id",
          [input.name, userId]
        )
      ).rows[0].id
    }
    const programId = id!
    const nodes: Node[] = []
    // Move existing positions out of the way of immediate unique indexes. The whole update is atomic.
    if (old)
      for (const kind of kinds) {
        const col = kind === "day" ? "day_index" : "position"
        const ids = old.rows[kind].map((r) => r.id)
        if (ids.length) {
          const max = Math.max(...old.rows[kind].map((r) => Number(r[col])))
          if (max > 2100000000 - ids.length)
            throw new ProgramError(
              "Existing positions exceed the supported editor range."
            )
          for (let i = 0; i < ids.length; i++)
            await c.query(`UPDATE ${tables[kind]} SET ${col}=$1 WHERE id=$2`, [
              max + i + 1,
              ids[i],
            ])
        }
      }
    const pending = [...input.blocks]
    const positions = new Map<string, number>()
    while (pending.length) {
      const index = pending.findIndex(
        (b) => !b.parentId || nodes.some((n) => n.id === b.parentId)
      )
      if (index < 0) throw new ProgramError("Invalid program hierarchy.")
      const b = pending.splice(index, 1)[0]
      const parent = nodes.find((n) => n.id === b.parentId)?.rows[0]
      const key = `${b.kind}:${b.parentId ?? "root"}`
      const count = b.kind === "set" ? (b.setCount ?? 1) : 1
      const prior = old?.nodes.find((n) => n.id === b.id && n.kind === b.kind)
      const ids: string[] = []
      for (let i = 0; i < count; i++) {
        const pos = (positions.get(key) ?? 0) + 1
        positions.set(key, pos)
        const values: Record<string, unknown> =
          b.kind === "cycle"
            ? {
                program_id: programId,
                parent_cycle_id: parent ?? null,
                position: pos,
                name: b.name.trim(),
                description: b.description || null,
                repeat_count: b.repeatCount,
              }
            : b.kind === "day"
              ? { program_cycle_id: parent, day_index: pos }
              : b.kind === "group"
                ? {
                    program_day_id: parent,
                    position: pos,
                    name: b.name.trim() || null,
                    repeat_count: b.repeatCount,
                  }
                : b.kind === "exercise"
                  ? {
                      program_group_id: parent,
                      position: pos,
                      exercise_id: b.exerciseId,
                    }
                  : {
                      program_day_set_id: parent,
                      position: pos,
                      is_optional: i >= (b.setCountMin ?? count),
                      target_reps_min: b.targetRepsMin || null,
                      target_reps_max: b.targetRepsMax || null,
                      value_min: b.valueMin || null,
                      value_max: b.valueMax || null,
                      value_unit: b.valueUnit || null,
                    }
        const cols = Object.keys(values),
          args = Object.values(values)
        const priorId = prior?.rows[i]
        let row: Row
        if (priorId) {
          row = (
            await c.query(
              `UPDATE ${tables[b.kind]} SET ${cols.map((k, j) => `${k}=$${j + 1}`).join(",")},updated_at=now() WHERE id=$${args.length + 1} RETURNING id`,
              [...args, priorId]
            )
          ).rows[0]
        } else {
          row = (
            await c.query(
              `INSERT INTO ${tables[b.kind]}(${cols.join(",")}) VALUES(${args.map((_, j) => `$${j + 1}`).join(",")}) RETURNING id`,
              args
            )
          ).rows[0]
        }
        ids.push(row.id)
      }
      nodes.push({
        id: b.id,
        kind: b.kind,
        rows: ids,
        name: b.name,
        x: b.x,
        y: b.y,
      })
    }
    // Reparent retained descendants before removing old ancestors; stable day IDs keep workout links intact.
    if (old)
      for (const kind of [...kinds].reverse()) {
        const keep = new Set(
          nodes.filter((n) => n.kind === kind).flatMap((n) => n.rows)
        )
        const removed = old.rows[kind]
          .filter((r) => !keep.has(r.id))
          .map((r) => r.id)
        if (removed.length)
          await c.query(
            `DELETE FROM ${tables[kind]} WHERE id=ANY($1::bigint[])`,
            [removed]
          )
      }
    await c.query("UPDATE programs SET name=$1,updated_at=now() WHERE id=$2", [
      input.name,
      programId,
    ])
    await c.query(
      "INSERT INTO program_editor_layouts(program_id,document) VALUES($1,$2::jsonb) ON CONFLICT(program_id) DO UPDATE SET document=excluded.document,updated_at=now()",
      [programId, JSON.stringify({ nodes })]
    )
    const saved = await read(c, programId, userId)
    await c.query("COMMIT")
    return {
      id: programId,
      name: saved.name,
      revision: saved.revision,
      blocks: saved.blocks,
    }
  } catch (e) {
    await c.query("ROLLBACK")
    throw e
  } finally {
    c.release()
  }
}

/** Read-only, ownership-scoped source for creating a local workout draft. */
export async function loadProgramForWorkout(id: string, userId: string) {
  const c = await getPool().connect()
  try {
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
    const p = await read(c, id, userId)
    const result = {
      id: p.id,
      name: p.name,
      blocks: p.blocks,
      dayIds: Object.fromEntries(
        p.nodes.filter((n) => n.kind === "day").map((n) => [n.id, n.rows[0]])
      ),
    }
    await c.query("COMMIT")
    return result
  } catch (e) {
    await c.query("ROLLBACK")
    throw e
  } finally {
    c.release()
  }
}
