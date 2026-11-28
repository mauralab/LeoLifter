import "server-only"
import type { PoolClient } from "pg"
import { getPool } from "@/lib/db"
export class SharingError extends Error {
  constructor(public code: string, public status = 400) { super(code) }
}
export async function sharingSettings(userId: string) {
  const db = getPool()
  const identity = (await db.query(`SELECT t.telegram_id,t.chat_id,COALESCE(p.private_enabled,true) AS enabled FROM user_telegram t LEFT JOIN telegram_workout_preferences p ON p.user_id=t.user_id WHERE t.user_id=$1`,[userId])).rows[0]
  if (!identity) return { linked: false, privateEnabled: false, groups: [], managed: [] }
  const groups = (await db.query(`SELECT c.chat_id AS id,c.title,c.chat_type AS type,c.active,c.locale,s.status,s.enabled,u.nickname AS inviter FROM telegram_workout_subscriptions s JOIN telegram_chats c ON c.chat_id=s.chat_id LEFT JOIN users u ON u.id=s.invited_by_user_id WHERE s.user_id=$1 AND c.active ORDER BY c.title,c.chat_id`,[userId])).rows
  const managed = (await db.query(`SELECT c.chat_id AS id,c.title,c.chat_type AS type,c.active,c.locale,c.bot_username,m.is_admin AND m.verified_at>now()-interval '90 seconds' AS can_manage FROM telegram_chats c JOIN telegram_chat_managers m ON m.chat_id=c.chat_id WHERE m.telegram_id=$1 AND c.active ORDER BY c.title,c.chat_id`,[identity.telegram_id])).rows
  // Verified administrators can opt in directly; connecting never enables sharing by itself.
  for (const chat of managed) {
    if (chat.can_manage && !groups.some(g => g.id === chat.id))
      groups.push({ id: chat.id, title: chat.title, type: chat.type, active: chat.active, locale: chat.locale, status: "available", enabled: false, inviter: null })
  }
  groups.sort((a,b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
  for (const chat of managed) {
    chat.people = chat.can_manage ? (await db.query(`SELECT s.user_id AS id,u.nickname,s.status,s.enabled FROM telegram_workout_subscriptions s JOIN users u ON u.id=s.user_id WHERE s.chat_id=$1 ORDER BY u.nickname,u.id LIMIT 200`,[chat.id])).rows : []
  }
  return { linked: true, privateEnabled: identity.enabled, groups, managed, botUsername: managed.find(c=>c.bot_username)?.bot_username ?? null }
}
export async function changeSharing(userId: string, form: FormData) {
  const action = form.get("action"), chat = form.get("chat"), value = form.get("enabled") === "true"
  const c = await getPool().connect()
  try {
    await c.query("BEGIN")
    const identity = (await c.query("SELECT telegram_id,chat_id FROM user_telegram WHERE user_id=$1",[userId])).rows[0]
    if (!identity) throw new SharingError("notLinked",409)
    if (action === "private") {
      await c.query(`INSERT INTO telegram_workout_preferences(user_id,private_enabled) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET private_enabled=excluded.private_enabled,updated_at=now()`,[userId,value])
      if (!value) await cancel(c,userId,identity.chat_id)
    } else {
      if (typeof chat !== "string" || !/^-[1-9]\d{0,18}$/.test(chat) || BigInt(chat)<BigInt("-9223372036854775808")) throw new SharingError("invalid")
      if (action === "subscription") {
        const status = form.get("status")
        if (status !== "accepted" && status !== "declined") throw new SharingError("invalid")
        // Only self-subscription is created here, and only for a freshly verified chat administrator.
        // Other users still need an explicit invitation.
        await c.query(`INSERT INTO telegram_workout_subscriptions(chat_id,user_id,invited_by_user_id)
          SELECT c.chat_id,$2,$2 FROM telegram_chats c JOIN telegram_chat_managers m ON m.chat_id=c.chat_id
          WHERE c.chat_id=$1 AND m.telegram_id=$3 AND m.is_admin
            AND m.verified_at>now()-interval '90 seconds' AND c.active
          ON CONFLICT(chat_id,user_id) DO NOTHING`,[chat,userId,identity.telegram_id])
        const result=await c.query(`UPDATE telegram_workout_subscriptions SET status=$3,enabled=$4,updated_at=now() WHERE chat_id=$1 AND user_id=$2 RETURNING user_id`,[chat,userId,status,status==='accepted'&&value])
        if (!result.rowCount) throw new SharingError("notFound",404)
        if (!value || status==='declined') await cancel(c,userId,chat)
      } else {
        const manager=await c.query(`SELECT c.chat_id FROM telegram_chats c JOIN telegram_chat_managers m ON m.chat_id=c.chat_id WHERE c.chat_id=$1 AND m.telegram_id=$2 AND m.is_admin AND m.verified_at>now()-interval '90 seconds' AND c.active FOR UPDATE OF c,m`,[chat,identity.telegram_id])
        if (!manager.rowCount) throw new SharingError("notManager",403)
        if (action === "invite") {
          const query=form.get("person")
          if(typeof query!=="string" || !query.trim() || query.length>100) throw new SharingError("invalid")
          // Exact nickname or numeric application ID. Never expose a searchable user directory.
          const found=await c.query(`SELECT u.id FROM users u JOIN user_telegram t ON t.user_id=u.id WHERE lower(u.nickname)=lower($1) OR u.id::text=$1 LIMIT 2`,[query.trim()])
          if(found.rowCount!==1) throw new SharingError("personNotFound",404)
          const count=await c.query('SELECT count(*)::int AS count FROM telegram_workout_subscriptions WHERE chat_id=$1',[chat])
          if(count.rows[0].count>=200) throw new SharingError("limit",409)
          await c.query(`INSERT INTO telegram_workout_subscriptions(chat_id,user_id,invited_by_user_id) VALUES($1,$2,$3) ON CONFLICT(chat_id,user_id) DO NOTHING`,[chat,found.rows[0].id,userId])
        } else if (action === "remove") {
          const person=form.get("person")
          if(typeof person!=="string" || !/^[1-9]\d{0,18}$/.test(person) || BigInt(person)>BigInt("9223372036854775807")) throw new SharingError("invalid")
          await c.query('DELETE FROM telegram_workout_subscriptions WHERE chat_id=$1 AND user_id=$2',[chat,person])
          await cancel(c,person,chat)
        } else if(action === "locale") {
          const locale=form.get("locale")
          if(typeof locale!=="string" || !['en','uk','nb','de','pl'].includes(locale)) throw new SharingError("invalid")
          await c.query('UPDATE telegram_chats SET locale=$2,updated_at=now() WHERE chat_id=$1',[chat,locale])
        } else throw new SharingError("invalid")
      }
    }
    await c.query("COMMIT")
  } catch(e) { await c.query("ROLLBACK"); throw e } finally { c.release() }
}
async function cancel(c: PoolClient,userId:string,chat:string) {
  await c.query(`UPDATE workout_telegram_messages m SET cancelled_at=now() FROM workouts w WHERE w.id=m.workout_id AND w.user_id=$1 AND m.chat_id=$2`,[userId,chat])
}
export async function queueWorkout(c: PoolClient,userId:string,workoutId:string,revision:string) {
  await c.query(`INSERT INTO workout_telegram_messages(workout_id,chat_id,desired_revision)
    SELECT $2,d.chat_id,$3::uuid FROM (
      SELECT t.chat_id FROM user_telegram t LEFT JOIN telegram_workout_preferences p ON p.user_id=t.user_id WHERE t.user_id=$1 AND COALESCE(p.private_enabled,true)
      UNION
      SELECT c.chat_id FROM telegram_workout_subscriptions s JOIN telegram_chats c ON c.chat_id=s.chat_id WHERE s.user_id=$1 AND s.status='accepted' AND s.enabled AND c.active
    ) d ON CONFLICT(workout_id,chat_id) DO UPDATE SET desired_revision=excluded.desired_revision,attempts=0,next_attempt_at=now()+interval '3 seconds',cancelled_at=NULL,last_error=NULL,updated_at=now()`,[userId,workoutId,revision])
}
