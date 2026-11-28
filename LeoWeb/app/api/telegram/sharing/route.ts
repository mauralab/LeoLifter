import { AuthError } from "@/lib/auth/errors"
import { currentUser, requireSameOrigin } from "@/lib/auth/session"
import { readAuthForm } from "@/lib/auth/http"
import { changeSharing, sharingSettings, SharingError } from "@/lib/telegram/sharing"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store" }
async function handle(request: Request) {
  try {
    if(request.method!=="GET" && !requireSameOrigin(request)) return Response.json({error:"forbidden"},{status:403,headers})
    const user=await currentUser()
    if(!user) return Response.json({error:"unauthorized"},{status:401,headers})
    if(request.method==="POST") {
      const form=await readAuthForm(request)
      if(new Set(form.keys()).size!==Array.from(form.keys()).length) throw new SharingError("invalid")
      await changeSharing(user.userId,form)
    }
    return Response.json(await sharingSettings(user.userId),{headers})
  } catch(e) {
    if(e instanceof AuthError) return Response.json({error:"invalid"},{status:400,headers})
    if(e instanceof SharingError) return Response.json({error:e.code},{status:e.status,headers})
    console.error("Telegram sharing request failed",{kind:e instanceof Error?e.name:"unknown"})
    return Response.json({error:"unavailable"},{status:503,headers})
  }
}
export const GET=handle
export const POST=handle
