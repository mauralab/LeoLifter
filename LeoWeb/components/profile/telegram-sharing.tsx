"use client"
import { useEffect, useState } from "react"
import { Send, RefreshCw, Users } from "lucide-react"
import { languages, locales, type Messages } from "@/lib/i18n"
type Person = { id: string; nickname: string; status: "pending" | "accepted" | "declined"; enabled: boolean }
type Group = { type: string; id: string; title: string; active: boolean; locale: string; status: Person["status"] | "available"; enabled: boolean }
type Managed = { type: string; id: string; title: string; active: boolean; locale: string; can_manage: boolean; people: Person[] }
type Data = { botUsername?: string | null; linked: boolean; privateEnabled: boolean; groups: Group[]; managed: Managed[] }
export function TelegramSharing({ messages }: { messages: Messages }) {
  const t=messages.telegramSharing
  const [data,setData]=useState<Data|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false)
  const [inputs,setInputs]=useState<Record<string,string>>({})
  async function load() {
    setBusy(true);setError("");setSaved(false)
    try { const r=await fetch('/api/telegram/sharing',{cache:'no-store'});if(!r.ok)throw new Error();setData(await r.json()) }
    catch {setError(t.unavailable)} finally {setBusy(false)}
  }
  useEffect(()=>{
    const controller=new AbortController()
    fetch('/api/telegram/sharing',{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error();setData(await r.json())}).catch(()=>{if(!controller.signal.aborted)setError(t.unavailable)})
    return ()=>controller.abort()
  },[t.unavailable])
  useEffect(()=>{
    if(busy) return
    const controller=new AbortController()
    const timer=setInterval(()=>{
      fetch('/api/telegram/sharing',{cache:'no-store',signal:controller.signal})
        .then(async r=>{if(r.ok)setData(await r.json())})
        .catch(()=>{})
    },15000)
    return ()=>{clearInterval(timer);controller.abort()}
  },[busy])
  async function change(fields:Record<string,string>) {
    setBusy(true);setError("");setSaved(false)
    try {
      const r=await fetch('/api/telegram/sharing',{method:'POST',body:new URLSearchParams(fields)})
      const result=await r.json()
      if(!r.ok){setError(t[result.error as keyof typeof t]||t.unavailable);return}
      setData(result);setSaved(true)
      if(fields.action==='invite')setInputs(v=>({...v,[fields.chat]:''}))
    }catch{setError(t.unavailable)}finally{setBusy(false)}
  }
  const status=(value:Group['status'])=>value==='available'?t.available:value==='pending'?t.pending:value==='accepted'?t.accepted:t.declined
  return <div className="telegram-sharing">
    <div className="account-section-heading"><Send size={20}/><div><h2>{t.title}</h2><p>{t.note}</p></div><button type="button" className="account-secondary" disabled={busy} onClick={load} aria-label={t.refresh}><RefreshCw size={16}/></button></div>
    {error&&<p role="alert" className="account-error">{error}</p>}{saved&&<p role="status">{t.saved}</p>}
    {!data&&!error&&<p role="status">{t.loading}</p>}
    {data&&!data.linked&&<p>{t.notLinked}</p>}
    {data?.linked&&<fieldset disabled={busy} className="telegram-sharing-fields">
      <label className="telegram-destination"><input type="checkbox" checked={data.privateEnabled} onChange={e=>change({action:'private',enabled:String(e.target.checked)})}/><span><strong>{t.privateChat}</strong><small>{t.privateNote}</small></span></label>
      <h3>{t.destinations}</h3><p>{t.consent}</p>
      {!data.groups.length&&<p>{t.empty}</p>}
      {data.groups.map(g=><div key={g.id} className="telegram-group">
        <div><strong>{g.title}</strong><small>{g.type === "channel" ? t.channel : t.group}</small><small>{status(g.status)}{!g.active?' · '+t.inactive:''}</small></div>
        <label className="telegram-destination"><input type="checkbox" checked={g.enabled} disabled={!g.active&&!g.enabled} onChange={e=>change({action:'subscription',chat:g.id,status:'accepted',enabled:String(e.target.checked)})}/><span>{t.enable}</span></label>
        {g.status==='pending'&&<button className="account-secondary" type="button" onClick={()=>change({action:'subscription',chat:g.id,status:'declined',enabled:'false'})}>{t.decline}</button>}
      </div>)}
      <div className="account-section-heading"><Users size={20}/><div><h3>{t.manage}</h3><p>{t.manageNote}</p></div></div><p>{data.botUsername ? t.botSetup.replace("YourBotUsername", data.botUsername) : t.botSetup}</p>
      {!data.managed.length&&<p>{t.noManaged}</p>}
      {data.managed.map(g=><div className="telegram-group" key={g.id}>
        <strong>{g.title}</strong><small>{g.type === "channel" ? t.channel : t.group}</small>{!g.active&&<small>{t.inactive}</small>}
        {!g.can_manage&&<p>{t.notManager}</p>}
        {g.can_manage&&<>
          <label>{t.language}<select value={g.locale} disabled={!g.active} onChange={e=>change({action:'locale',chat:g.id,locale:e.target.value})}>{locales.map(l=><option key={l} value={l}>{languages[l]}</option>)}</select></label>
          <div className="telegram-invite"><label htmlFor={'invite-'+g.id}>{t.inviteLabel}<input id={'invite-'+g.id} value={inputs[g.id]||''} maxLength={100} onChange={e=>setInputs(v=>({...v,[g.id]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(inputs[g.id]?.trim()&&g.active)change({action:'invite',chat:g.id,person:inputs[g.id]})}}}/></label><button type="button" className="account-primary" disabled={!g.active||!inputs[g.id]?.trim()} onClick={()=>change({action:'invite',chat:g.id,person:inputs[g.id]})}>{t.invite}</button></div>
          {!!g.people.length&&<ul aria-label={t.people}>{g.people.map(p=><li key={p.id}><span>{p.nickname}<small>{status(p.status)}{p.enabled?' · ✓':''}</small></span><button type="button" className="account-secondary" disabled={!g.active} onClick={()=>change({action:'remove',chat:g.id,person:p.id})}>{t.remove}</button></li>)}</ul>}
        </>}
      </div>)}
    </fieldset>}
  </div>
}
