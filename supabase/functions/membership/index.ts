import { createClient } from 'npm:@supabase/supabase-js@2.111.0'

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||''
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}})

const normalizeCode=(value:string)=>value.trim().toUpperCase().replace(/\s+/g,'')
async function sha256(value:string){
  const bytes=new TextEncoder().encode(value)
  const digest=await crypto.subtle.digest('SHA-256',bytes)
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')
}
function makeCode(plan:'member'|'pro'){
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part=()=>Array.from({length:4},()=>alphabet[crypto.getRandomValues(new Uint32Array(1))[0]%alphabet.length]).join('')
  return `EVF-${plan==='pro'?'PRO':'MEM'}-${part()}-${part()}`
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'not_found'},404)
  if(!SUPABASE_URL||!SERVICE_KEY)return json({error:'service_unavailable'},503)

  const authHeader=req.headers.get('Authorization')||''
  const token=authHeader.startsWith('Bearer ')?authHeader.slice(7):''
  if(!token)return json({error:'login_required'},401)

  const admin=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:{user},error:userError}=await admin.auth.getUser(token)
  if(userError||!user)return json({error:'login_required'},401)

  let body:{action?:string;code?:string;plan?:string;maxUses?:number;redeemExpiresAt?:string|null;grantExpiresAt?:string|null;note?:string;codeId?:string}={}
  try{body=await req.json()}catch{return json({error:'bad_request'},400)}
  const action=String(body.action||'status')

  try{
    const {data:cfg,error:cfgError}=await admin.from('membership_config').select('*').eq('id','default').single()
    if(cfgError)throw cfgError

    if(action==='status'){
      const {data:membership,error}=await admin.from('memberships').select('*').eq('user_id',user.id).maybeSingle()
      if(error)throw error
      const effectiveExpiresAt=membership?.expires_at||(membership?.source==='promo_exam_2027'?cfg.pro_free_until:null)
      const active=Boolean(membership&&membership.status==='active'&&(!effectiveExpiresAt||new Date(effectiveExpiresAt)>new Date()))
      return json({
        plan:active?membership.plan:'free',active,
        membership:membership?{...membership,effective_expires_at:effectiveExpiresAt}:null,
        promo:{enabled:Boolean(cfg.pro_free_claim_enabled),freeUntil:cfg.pro_free_until,title:cfg.promo_title,copy:cfg.promo_copy}
      })
    }

    if(action==='claim-pro'){
      if(!cfg.pro_free_claim_enabled)return json({error:'promo_closed'},409)
      if(cfg.pro_free_until&&new Date(cfg.pro_free_until)<=new Date())return json({error:'promo_closed'},409)
      const {data,error}=await admin.rpc('claim_exam_pro',{p_user_id:user.id})
      if(error)throw error
      return json({ok:true,plan:'pro',membership:data,promo:{freeUntil:cfg.pro_free_until}})
    }

    if(action==='redeem'){
      const code=normalizeCode(String(body.code||''))
      if(code.length<8)return json({error:'invalid_code'},400)
      const hash=await sha256(code)
      const {data,error}=await admin.rpc('redeem_membership_code',{p_user_id:user.id,p_code_hash:hash})
      if(error){
        const m=String(error.message||'')
        if(m.includes('invalid_code'))return json({error:'invalid_code'},404)
        if(m.includes('code_expired'))return json({error:'code_expired'},409)
        if(m.includes('code_exhausted'))return json({error:'code_exhausted'},409)
        throw error
      }
      return json({ok:true,membership:data})
    }

    const owner=user.app_metadata?.role==='owner'
    if(!owner)return json({error:'not_found'},404)

    if(action==='list-codes'){
      const {data,error}=await admin.from('membership_codes').select('id,code_hint,plan,max_uses,used_count,active,redeem_expires_at,grant_expires_at,note,created_at').order('created_at',{ascending:false}).limit(100)
      if(error)throw error
      return json({codes:data||[]})
    }

    if(action==='create-code'){
      const plan=body.plan==='pro'?'pro':'member'
      const maxUses=Math.max(1,Math.min(100000,Number(body.maxUses)||1))
      const code=makeCode(plan)
      const hash=await sha256(normalizeCode(code))
      const hint=`${code.slice(0,7)}-****-${code.slice(-4)}`
      const row={
        code_hash:hash,code_hint:hint,plan,max_uses:maxUses,
        redeem_expires_at:body.redeemExpiresAt||null,grant_expires_at:body.grantExpiresAt||null,
        note:String(body.note||'').slice(0,200),created_by:user.id
      }
      const {data,error}=await admin.from('membership_codes').insert(row).select('id,code_hint,plan,max_uses,used_count,active,redeem_expires_at,grant_expires_at,note,created_at').single()
      if(error)throw error
      await admin.from('admin_audit').insert({actor_user_id:user.id,action:'membership_code_create',detail:{code_id:data.id,plan,max_uses:maxUses,code_hint:hint}})
      return json({ok:true,code,item:data})
    }

    if(action==='disable-code'){
      const codeId=String(body.codeId||'')
      if(!codeId)return json({error:'missing_code'},400)
      const {data,error}=await admin.from('membership_codes').update({active:false}).eq('id',codeId).select('id,code_hint,plan,active').single()
      if(error)throw error
      await admin.from('admin_audit').insert({actor_user_id:user.id,action:'membership_code_disable',detail:{code_id:data.id,code_hint:data.code_hint,plan:data.plan}})
      return json({ok:true,item:data})
    }

    return json({error:'not_found'},404)
  }catch(error){
    console.error(error)
    return json({error:'operation_failed'},500)
  }
})
