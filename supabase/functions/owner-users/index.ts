import { createClient } from 'npm:@supabase/supabase-js@2.111.0'

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||''
const SERVICE_KEY=(()=>{
  try{
    const modern=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}')
    if(modern?.default)return String(modern.default)
  }catch{}
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
})()

const allowedOrigins=new Set(['https://evera.top','https://www.evera.top'])
const corsFor=(req:Request)=>{
  const origin=req.headers.get('Origin')||''
  return {
    'Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:'https://evera.top',
    'Vary':'Origin',
    'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods':'POST, OPTIONS'
  }
}

Deno.serve(async req=>{
  const cors=corsFor(req)
  const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
    status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}
  })

  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'not_found'},404)
  if(!SUPABASE_URL||!SERVICE_KEY)return json({error:'service_unavailable'},503)

  const authHeader=req.headers.get('Authorization')||''
  const token=authHeader.startsWith('Bearer ')?authHeader.slice(7):''
  if(!token)return json({error:'not_found'},404)

  const admin=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:{user:actor},error:actorError}=await admin.auth.getUser(token)
  if(actorError||!actor||actor.app_metadata?.role!=='owner')return json({error:'not_found'},404)

  let body:{action?:string;userId?:string;page?:number;perPage?:number}={}
  try{body=await req.json()}catch{return json({error:'bad_request'},400)}
  const action=String(body.action||'')

  try{
    if(action==='list'){
      const page=Math.max(1,Math.min(1000,Number(body.page)||1))
      const perPage=Math.max(1,Math.min(100,Number(body.perPage)||50))
      const {data,error}=await admin.auth.admin.listUsers({page,perPage})
      if(error)throw error
      const users=(data.users||[]).map(u=>({
        id:u.id,email:u.email||'',createdAt:u.created_at,lastSignInAt:u.last_sign_in_at||null,
        bannedUntil:u.banned_until||null,role:u.app_metadata?.role||'user'
      }))
      return json({users,page,perPage})
    }

    const userId=String(body.userId||'')
    if(!userId)return json({error:'missing_user'},400)
    if(userId===actor.id)return json({error:'self_action_blocked'},400)

    if(action==='ban'||action==='unban'){
      const duration=action==='ban'?'876000h':'none'
      const {data,error}=await admin.auth.admin.updateUserById(userId,{ban_duration:duration})
      if(error)throw error
      await admin.from('admin_audit').insert({actor_user_id:actor.id,action,target_user_id:userId,detail:{email:data.user?.email||null}})
      return json({ok:true,user:{id:data.user?.id,email:data.user?.email,bannedUntil:data.user?.banned_until||null}})
    }

    if(action==='delete'){
      const {data:target}=await admin.auth.admin.getUserById(userId)
      const {error}=await admin.auth.admin.deleteUser(userId,false)
      if(error)throw error
      await admin.from('admin_audit').insert({actor_user_id:actor.id,action:'delete',target_user_id:userId,detail:{email:target.user?.email||null}})
      return json({ok:true})
    }

    return json({error:'not_found'},404)
  }catch(error){
    console.error(error)
    return json({error:'operation_failed'},500)
  }
})
