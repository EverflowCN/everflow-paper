import { createClient } from 'npm:@supabase/supabase-js@2.111.0'

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||''
const SERVICE_KEY=(()=>{try{const modern=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');if(modern?.default)return String(modern.default)}catch{}return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''})()
const allowedOrigins=new Set(['https://evera.top','https://www.evera.top'])
const corsFor=(req:Request)=>{const origin=req.headers.get('Origin')||'';return {'Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:'https://evera.top','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}}
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes))
const unb64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0))
async function keyFor(label:string){const material=new TextEncoder().encode(`${label}:${SERVICE_KEY}`);const hash=await crypto.subtle.digest('SHA-256',material);return crypto.subtle.importKey('raw',hash,{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function encryptSecret(value:string,label:string){const iv=crypto.getRandomValues(new Uint8Array(12));const key=await keyFor(label);const out=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(value));return {ciphertext:b64(new Uint8Array(out)),iv:b64(iv)}}
async function decryptSecret(ciphertext:string,iv:string,label:string){const key=await keyFor(label);const out=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},key,unb64(ciphertext));return new TextDecoder().decode(out)}
function makeTempPassword(){const upper='ABCDEFGHJKLMNPQRSTUVWXYZ',lower='abcdefghijkmnopqrstuvwxyz',digits='23456789',symbols='!@#$%';const pick=(s:string)=>s[crypto.getRandomValues(new Uint32Array(1))[0]%s.length];const all=upper+lower+digits+symbols;let chars=[pick(upper),pick(lower),pick(digits),pick(symbols)];for(let i=0;i<12;i++)chars.push(pick(all));for(let i=chars.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[chars[i],chars[j]]=[chars[j],chars[i]]}return chars.join('')}

Deno.serve(async req=>{
  const cors=corsFor(req);const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}})
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'not_found'},404);if(!SUPABASE_URL||!SERVICE_KEY)return json({error:'service_unavailable'},503)
  const authHeader=req.headers.get('Authorization')||'';const token=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';if(!token)return json({error:'not_found'},404)
  const admin=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const {data:{user:actor},error:actorError}=await admin.auth.getUser(token);if(actorError||!actor||actor.app_metadata?.role!=='owner')return json({error:'not_found'},404)
  let body:{action?:string;userId?:string;email?:string;page?:number;perPage?:number}={};try{body=await req.json()}catch{return json({error:'bad_request'},400)};const action=String(body.action||'')
  try{
    if(action==='list'){
      const page=Math.max(1,Math.min(1000,Number(body.page)||1)),perPage=Math.max(1,Math.min(100,Number(body.perPage)||50));const {data,error}=await admin.auth.admin.listUsers({page,perPage});if(error)throw error
      const ids=(data.users||[]).map(u=>u.id);let creds:any[]=[];if(ids.length){const res=await admin.from('user_temp_credentials').select('user_id,created_at,version,active').in('user_id',ids);if(res.error)throw res.error;creds=res.data||[]}const cm=new Map(creds.map((x:any)=>[x.user_id,x]));
      const users=(data.users||[]).map(u=>({id:u.id,email:u.email||'',createdAt:u.created_at,lastSignInAt:u.last_sign_in_at||null,bannedUntil:u.banned_until||null,role:u.app_metadata?.role||'user',tempCredential:cm.get(u.id)||null}));return json({users,page,perPage})
    }
    if(action==='create'){
      const email=String(body.email||'').trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))return json({error:'invalid_email'},400)
      const password=makeTempPassword();const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{role:'user'}})
      if(error){const msg=String(error.message||'');if(/already|registered|exists/i.test(msg))return json({error:'user_already_exists'},409);throw error}
      const created=data.user;if(!created)return json({error:'operation_failed'},500)
      try{
        const enc=await encryptSecret(password,'everflow-temp-password-v1');const {error:storeError}=await admin.from('user_temp_credentials').upsert({user_id:created.id,password_ciphertext:enc.ciphertext,password_iv:enc.iv,cipher_version:1,created_at:new Date().toISOString(),created_by:actor.id,version:1,active:true},{onConflict:'user_id'});if(storeError)throw storeError
      }catch(storeError){await admin.auth.admin.deleteUser(created.id,false).catch(()=>{});throw storeError}
      await admin.from('admin_audit').insert({actor_user_id:actor.id,action:'user_create',target_user_id:created.id,detail:{email:created.email||email,version:1}})
      return json({ok:true,user:{id:created.id,email:created.email||email,createdAt:created.created_at},password,version:1,createdAt:new Date().toISOString()})
    }
    const userId=String(body.userId||'');if(!userId)return json({error:'missing_user'},400);if(userId===actor.id&&['ban','delete','reset-password'].includes(action))return json({error:'self_action_blocked'},400)
    if(action==='ban'||action==='unban'){
      const duration=action==='ban'?'876000h':'none';const {data,error}=await admin.auth.admin.updateUserById(userId,{ban_duration:duration});if(error)throw error;await admin.from('admin_audit').insert({actor_user_id:actor.id,action:`user_${action}`,target_user_id:userId,detail:{email:data.user?.email||null}});return json({ok:true,user:{id:data.user?.id,email:data.user?.email,bannedUntil:data.user?.banned_until||null}})
    }
    if(action==='reset-password'){
      const password=makeTempPassword();const {data,error}=await admin.auth.admin.updateUserById(userId,{password});if(error)throw error;const enc=await encryptSecret(password,'everflow-temp-password-v1');const oldRes=await admin.from('user_temp_credentials').select('version').eq('user_id',userId).maybeSingle();if(oldRes.error)throw oldRes.error;const version=Number(oldRes.data?.version||0)+1;const {error:storeError}=await admin.from('user_temp_credentials').upsert({user_id:userId,password_ciphertext:enc.ciphertext,password_iv:enc.iv,cipher_version:1,created_at:new Date().toISOString(),created_by:actor.id,version,active:true},{onConflict:'user_id'});if(storeError)throw storeError;await admin.from('admin_audit').insert({actor_user_id:actor.id,action:'user_temp_password_reset',target_user_id:userId,detail:{email:data.user?.email||null,version}});return json({ok:true,password,version,createdAt:new Date().toISOString()})
    }
    if(action==='get-temp-password'){
      const {data,error}=await admin.from('user_temp_credentials').select('*').eq('user_id',userId).maybeSingle();if(error)throw error;if(!data||!data.active)return json({ok:true,password:null});const password=await decryptSecret(data.password_ciphertext,data.password_iv,'everflow-temp-password-v1');return json({ok:true,password,version:data.version,createdAt:data.created_at})
    }
    if(action==='delete'){
      const {data:target}=await admin.auth.admin.getUserById(userId);const {error}=await admin.auth.admin.deleteUser(userId,false);if(error)throw error;await admin.from('admin_audit').insert({actor_user_id:actor.id,action:'user_delete',target_user_id:userId,detail:{email:target.user?.email||null}});return json({ok:true})
    }
    return json({error:'not_found'},404)
  }catch(error){console.error(error);return json({error:'operation_failed'},500)}
})