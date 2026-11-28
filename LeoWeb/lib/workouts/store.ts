import { queueWorkout } from "@/lib/telegram/sharing"
import "server-only"
import { randomUUID } from "node:crypto"
import { getPool } from "@/lib/db"
import type { WorkoutInput, SavedWorkout } from "./validation"
export class WorkoutError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message)
  }
}
export async function loadWorkout(
  id: string,
  userId: string
): Promise<SavedWorkout> {
  const { rows } = await getPool().query(
    `SELECT w.id,d.revision,d.document,w.updated_at FROM workouts w JOIN workout_editor_documents d ON d.workout_id=w.id WHERE w.id=$1 AND w.user_id=$2`,
    [id, userId]
  )
  const row = rows[0]
  if (!row) throw new WorkoutError("Workout not found.", 404)
  return {
    id: row.id,
    revision: row.revision,
    draft: row.document,
    updatedAt: row.updated_at.toISOString(),
  }
}
export async function listWorkouts(
  userId: string,
  query: string,
  page: number,
  month?: string
) {
  if (month) {
    const { rows } = await getPool().query(
      `SELECT w.id,d.document->>'title' AS title,d.document->>'date' AS date FROM workouts w JOIN workout_editor_documents d ON d.workout_id=w.id WHERE w.user_id=$1 AND strpos(lower(d.document->>'title'),lower($2))>0 AND left(d.document->>'date',7)=$3 ORDER BY d.document->>'date',w.id`,
      [userId, query, month]
    )
    return { items: rows, total: rows.length, page: 1 }
  }
  const c = await getPool().connect()
  try {
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
    const where = `FROM workouts w JOIN workout_editor_documents d ON d.workout_id=w.id WHERE w.user_id=$1 AND strpos(lower(d.document->>'title'),lower($2))>0`
    const total = Number(
      (await c.query(`SELECT count(*) ${where}`, [userId, query])).rows[0].count
    )
    const current = Math.min(page, Math.max(1, Math.ceil(total / 12)))
    const { rows } = await c.query(
      `SELECT w.id,d.revision,d.document,w.updated_at ${where} ORDER BY w.scheduled_at DESC NULLS LAST,w.id DESC LIMIT 12 OFFSET $3`,
      [userId, query, (current - 1) * 12]
    )
    await c.query("COMMIT")
    return {
      total,
      page: current,
      items: rows.map((r) => ({
        id: r.id,
        revision: r.revision,
        draft: r.document,
        updatedAt: r.updated_at.toISOString(),
      })),
    }
  } catch (e) {
    await c.query("ROLLBACK")
    throw e
  } finally {
    c.release()
  }
}
export async function saveWorkout(
  draft: WorkoutInput,
  userId: string,
  id?: string
): Promise<SavedWorkout> {
  const creating = !id
  const c = await getPool().connect()
  try {
    await c.query("BEGIN")
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "workout:" + draft.clientKey,
    ])
    if (!id) {
      const previous = (
        await c.query(
          `SELECT w.id,w.user_id FROM workout_editor_documents d JOIN workouts w ON w.id=d.workout_id WHERE d.client_key=$1`,
          [draft.clientKey]
        )
      ).rows[0]
      if (previous) {
        if (previous.user_id !== userId)
          throw new WorkoutError("Workout key is unavailable.", 409)
        id = previous.id
      }
    }
    if (id) {
      const old = (
        await c.query(
          `SELECT w.id,d.revision,d.client_key FROM workouts w JOIN workout_editor_documents d ON d.workout_id=w.id WHERE w.id=$1 AND w.user_id=$2 FOR UPDATE OF w,d`,
          [id, userId]
        )
      ).rows[0]
      if (!old) throw new WorkoutError("Workout not found.", 404)
      if (old.client_key !== draft.clientKey)
        throw new WorkoutError("Workout key does not match.", 409)
      if (!draft.revision) {
        if (!creating)
          throw new WorkoutError("Reload the workout before saving.", 409)
        // Retrying a successful create must return it, never create a second workout.
        const previous = (
          await c.query(
            "SELECT * FROM workout_editor_documents WHERE workout_id=$1 AND client_key=$2",
            [id, draft.clientKey]
          )
        ).rows[0]
        if (!previous)
          throw new WorkoutError("Reload the workout before saving.", 409)
        await c.query("COMMIT")
        return {
          id,
          revision: previous.revision,
          draft: previous.document,
          updatedAt: previous.updated_at.toISOString(),
        }
      }
      if (draft.revision !== old.revision)
        throw new WorkoutError(
          "This workout changed in another tab. Reopen it before saving.",
          409
        )
    }
    if (draft.source) {
      const day = await c.query(
        `SELECT d.id FROM program_days d JOIN program_cycles c ON c.id=d.program_cycle_id JOIN programs p ON p.id=c.program_id WHERE d.id=$1 AND p.id=$2 AND p.author_id=$3`,
        [draft.source.dayId, draft.source.programId, userId]
      )
      if (!day.rowCount)
        throw new WorkoutError("The source program day is unavailable.", 409)
    }
    const exerciseIds = [
      ...new Set(
        draft.exercises.flatMap((e) => (e.exerciseId ? [e.exerciseId] : []))
      ),
    ]
    if (exerciseIds.length) {
      const found = await c.query(
        "SELECT id FROM exercises WHERE id=ANY($1::bigint[])",
        [exerciseIds]
      )
      if (found.rowCount !== exerciseIds.length)
        throw new WorkoutError("An exercise is no longer available.", 409)
    }
    if (!id)
      id = (
        await c.query(
          "INSERT INTO workouts(user_id,program_day_id,scheduled_at) VALUES($1,$2,$3) RETURNING id",
          [userId, draft.source?.dayId ?? null, draft.scheduledAt]
        )
      ).rows[0].id
    else
      await c.query(
        "UPDATE workouts SET program_day_id=$1,scheduled_at=$2,updated_at=now() WHERE id=$3",
        [draft.source?.dayId ?? null, draft.scheduledAt, id]
      )
    await c.query("DELETE FROM workout_groups WHERE workout_id=$1", [id])
    for (const [gi, g] of draft.groups.entries()) {
      const gid = (
        await c.query(
          "INSERT INTO workout_groups(workout_id,position,name,repeat_count) VALUES($1,$2,$3,$4) RETURNING id",
          [id, gi + 1, g.name, g.repeatCount]
        )
      ).rows[0].id
      for (const [ei, e] of draft.exercises
        .filter((e) => e.groupId === g.id && e.exerciseId)
        .entries()) {
        const eid = (
          await c.query(
            "INSERT INTO workout_sets(workout_group_id,position,exercise_id) VALUES($1,$2,$3) RETURNING id",
            [gid, ei + 1, e.exerciseId]
          )
        ).rows[0].id
        let pos = 0
        for (const s of e.sets) {
          if (s.value === "") continue
          await c.query(
            `INSERT INTO workout_set_exercises(workout_set_id,position,value,value_unit,additional_weight,weight_unit,time_spent,rir) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              eid,
              ++pos,
              s.value,
              s.unit,
              s.weight || null,
              s.weight ? s.weightUnit : null,
              s.seconds || null,
              s.rir || null,
            ]
          )
        }
      }
    }
    const revision = randomUUID(),
      stored = { ...draft, revision }
    await c.query(
      `INSERT INTO workout_editor_documents(workout_id,client_key,revision,document) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(workout_id) DO UPDATE SET revision=excluded.revision,document=excluded.document,updated_at=now()`,
      [id, draft.clientKey, revision, JSON.stringify(stored)]
    )
    await queueWorkout(c, userId, id!, revision)
    const updatedAt = (
      await c.query("SELECT updated_at FROM workouts WHERE id=$1", [id])
    ).rows[0].updated_at.toISOString()
    await c.query("COMMIT")
    return { id: id!, revision, draft: stored, updatedAt }
  } catch (e) {
    await c.query("ROLLBACK")
    throw e
  } finally {
    c.release()
  }
}

export async function deleteWorkout(id: string, userId: string, revision: string) {
  const c = await getPool().connect()
  try {
    await c.query("BEGIN")
    const row = (await c.query(`SELECT d.revision FROM workouts w JOIN workout_editor_documents d ON d.workout_id=w.id WHERE w.id=$1 AND w.user_id=$2 FOR UPDATE OF w,d`,[id,userId])).rows[0]
    if (!row) throw new WorkoutError("Workout not found.",404)
    if (row.revision !== revision) throw new WorkoutError("This workout changed. Reopen it before deleting.",409)
    // Preserve message IDs in the outbox before deleting the workout and its results.
    await c.query(`UPDATE workout_telegram_messages SET delete_requested=true,delete_attempts=0,delete_next_attempt_at=now(),cancelled_at=now() WHERE workout_id=$1`,[id])
    await c.query("DELETE FROM workouts WHERE id=$1 AND user_id=$2",[id,userId])
    await c.query("COMMIT")
  } catch(e) { await c.query("ROLLBACK"); throw e } finally { c.release() }
}
