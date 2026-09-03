import { createClient } from 'npm:@supabase/supabase-js@2.111.0'

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||''
const SERVICE_KEY=(()=>{try{const modern=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');if(modern?.default)return String(modern.default)}catch{}return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''})()
const allowedOrigins=new Set(['https://evera.top','https://www.evera.top'])
const corsFor=(req:Request)=>{const origin=req.headers.get('Origin')||'';return {'Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:'https://evera.top','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}}
const normalizeCode=(value:string)=>value.trim().toUpperCase().replace(/\s+/g,'')
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes));const unb64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0))
async function keyFor(label:string){const material=new TextEncoder().encode(`${label}:${SERVICE_KEY}`);const hash=await crypto.subtle.digest('SHA-256',material);return crypto.subtle.importKey('raw',hash,{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function encryptSecret(value:string,label:string){const iv=crypto.getRandomValues(new Uint8Array(12));const key=await keyFor(label);const out=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(value));return {ciphertext:b64(new Uint8Array(out)),iv:b64(iv)}}
async function decryptSecret(ciphertext:string,iv:string,label:string){const key=await keyFor(label);const out=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},key,unb64(ciphertext));return new TextDecoder().decode(out)}
async function sha256(value:string){const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function makeCode(plan:'member'|'pro'){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const part=()=>Array.from({length:4},()=>alphabet[crypto.getRandomValues(new Uint32Array(1))[0]%alphabet.length]).join('');return `EVF-${plan==='pro'?'PRO':'MEM'}-${part()}-${part()}`}

Deno.serve(async req=>{
  const cors=corsFor(req);const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}})
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'not_found'},404);if(!SUPABASE_URL||!SERVICE_KEY)return json({error:'service_unavailable'},503)
  const authHeader=req.headers.get('Authorization')||'';const token=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';if(!token)return json({error:'login_required'},401)
  const admin=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const {data:{user},error:userError}=await admin.auth.getUser(token);if(userError||!user)return json({error:'login_required'},401)
  let body:{action?:string;code?:string;plan?:string;maxUses?:number;redeemExpiresAt?:string|null;grantExpiresAt?:string|null;note?:string;codeId?:string;targetUserId?:string;expiresAt?:string|null}={};try{body=await req.json()}catch{return json({error:'bad_request'},400)};const action=String(body.action||'status')
  try{
    const {data:cfg,error:cfgError}=await admin.from('membership_config').select('*').eq('id','default').single();if(cfgError)throw cfgError
    if(action==='status'){const {data:membership,error}=await admin.from('memberships').select('*').eq('user_id',user.id).maybeSingle();if(error)throw error;const effectiveExpiresAt=membership?.expires_at||(membership?.source==='promo_exam_2027'?cfg.pro_free_until:null);const active=Boolean(membership&&membership.status==='active'&&(!effectiveExpiresAt||new Date(effectiveExpiresAt)>new Date()));return json({plan:active?membership.plan:'free',active,membership:membership?{...membership,effective_expires_at:effectiveExpiresAt}:null,promo:{enabled:Boolean(cfg.pro_free_claim_enabled),freeUntil:cfg.pro_free_until,title:cfg.promo_title,copy:cfg.promo_copy}})}
    if(action==='claim-pro'){if(!cfg.pro_free_claim_enabled)return json({error:'promo_closed'},409);if(cfg.pro_free_until&&new Date(cfg.pro_free_until)<=new Date())return json({error:'promo_closed'},409);const {data,error}=await admin.rpc('claim_exam_pro',{p_user_id:user.id});if(error)throw error;return json({ok:true,plan:'pro',membership:data,promo:{freeUntil:cfg.pro_free_until}})}
    if(action==='redeem'){const code=normalizeCode(String(body.code||''));if(code.length<8)return json({error:'invalid_code'},400);const hash=await sha256(code);const {data,error}=await admin.rpc('redeem_membership_code',{p_user_id:user.id,p_code_hash:hash});if(error){const m=String(error.message||'');if(m.includes('invalid_code'))return json({error:'invalid_code'},404);if(m.includes('code_expired'))return json({error:'code_expired'},409);if(m.includes('code_exhausted'))return json({error:'code_exhausted'},409);throw error}return json({ok:true,membership:data})}
    const owner=user.app_metadata?.role==='owner';if(!owner)return json({error:'not_found'},404)
    if(action==='list-codes'){
      const {data,error}=await admin.from('membership_codes').select('id,code_hint,code_ciphertext,code_iv,plan,max_uses,used_count,active,redeem_expires_at,grant_expires_at,note,created_at').order('created_at',{ascending:false}).limit(200);if(error)throw error
      const codes=[];for(const row of data||[]){let code:string|null=null;if(row.code_ciphertext&&row.code_iv){try{code=await decryptSecret(row.code_ciphertext,row.code_iv,'everflow-membership-code-v1')}catch{code=null}}codes.push({...row,code_ciphertext:undefined,code_iv:undefined,code,legacy_unrecoverable:!code})}return json({codes})
    }
    if(action==='create-code'){
      const plan=body.plan==='pro'?'pro':'member',maxUses=Math.max(1,Math.min(100000,Number(body.maxUses)||1)),code=makeCode(plan),hash=await sha256(normalizeCode(code)),hint=`${code.slice(0,7)}-****-${code.slice(-4)}`,enc=await encryptSecret(code,'everflow-membership-code-v1');
      const row={code_hash:hash,code_hint:hint,code_ciphertext:enc.ciphertext,code_iv:enc.iv,cipher_version:1,plan,max_uses:maxUses,redeem_expires_at:body.redeemExpiresAt||null,grant_expires_at:body.grantExpiresAt||null,note:String(body.note||'').slice(0,200),created_by:user.id};const {data,error}=await admin.from('membership_codes').insert(row).select('id,code_hint,plan,max_uses,used_count,active,redeem_expires_at,grant_expires_at,note,created_at').single();if(error)throw error;await admin.from('admin_audit').insert({actor_user_id:user.id,action:'membership_code_create',detail:{code_id:data.id,plan,max_uses:maxUses,code_hint:hint}});return json({ok:true,code,item:{...data,code}})
    }
    if(action==='disable-code'||action==='enable-code'){
      const codeId=String(body.codeId||'');if(!codeId)return json({error:'missing_code'},400);const active=action==='enable-code';const {data,error}=await admin.from('membership_codes').update({active}).eq('id',codeId).select('id,code_hint,plan,active').single();if(error)throw error;await admin.from('admin_audit').insert({actor_user_id:user.id,action:active?'membership_code_enable':'membership_code_disable',detail:{code_id:data.id,code_hint:data.code_hint,plan:data.plan}});return json({ok:true,item:data})
    }
    if(action==='delete-code'){
      const codeId=String(body.codeId||'');if(!codeId)return json({error:'missing_code'},400);const {data:row}=await admin.from('membership_codes').select('code_hint,plan').eq('id',codeId).maybeSingle();const {error}=await admin.from('membership_codes').delete().eq('id',codeId);if(error)throw error;await admin.from('admin_audit').insert({actor_user_id:user.id,action:'membership_code_delete',detail:{code_id:codeId,code_hint:row?.code_hint||null,plan:row?.plan||null}});return json({ok:true})
    }
    if(action==='code-redemptions'){
      const codeId=String(body.codeId||'');if(!codeId)return json({error:'missing_code'},400);const {data,error}=await admin.from('membership_code_redemptions').select('id,user_id,redeemed_at').eq('code_id',codeId).order('redeemed_at',{ascending:false});if(error)throw error;return json({redemptions:data||[]})
    }
    if(action==='set-membership'||action==='revoke-membership'){
      const targetUserId=String(body.targetUserId||'');if(!targetUserId)return json({error:'missing_user'},400)
      const {data:target,error:targetError}=await admin.auth.admin.getUserById(targetUserId);if(targetError||!target.user)return json({error:'user_not_found'},404)
      if(action==='revoke-membership'){
        const {data,error}=await admin.from('memberships').upsert({user_id:targetUserId,plan:'member',status:'revoked',source:'owner_manual',expires_at:null,updated_at:new Date().toISOString(),metadata:{managed_by:user.id}},{onConflict:'user_id'}).select().single();if(error)throw error
        await admin.from('admin_audit').insert({actor_user_id:user.id,action:'membership_revoke',target_user_id:targetUserId,detail:{email:target.user.email||null}})
        return json({ok:true,membership:data})
      }
      const plan=body.plan==='pro'?'pro':body.plan==='member'?'member':null;if(!plan)return json({error:'invalid_plan'},400)
      const expiresAt=body.expiresAt?new Date(body.expiresAt):null;if(expiresAt&&Number.isNaN(expiresAt.getTime()))return json({error:'invalid_expiry'},400)
      const row={user_id:targetUserId,plan,status:'active',source:'owner_manual',starts_at:new Date().toISOString(),expires_at:expiresAt?.toISOString()||null,updated_at:new Date().toISOString(),metadata:{managed_by:user.id}}
      const {data,error}=await admin.from('memberships').upsert(row,{onConflict:'user_id'}).select().single();if(error)throw error
      await admin.from('admin_audit').insert({actor_user_id:user.id,action:'membership_set',target_user_id:targetUserId,detail:{email:target.user.email||null,plan,expires_at:row.expires_at}})
      return json({ok:true,membership:data})
    }
    return json({error:'not_found'},404)
  }catch(error){console.error(error);return json({error:'operation_failed'},500)}
})
