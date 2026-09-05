import { defaults, validateState } from './engine.mjs';
export const OWNER_ID='6853b2b0-4739-4673-9f2b-3828e471a584';
const origins=new Set(['https://evera.top','https://www.evera.top']);
export function createHandler({admin,appHTML}){
 return async req=>{
  const origin=req.headers.get('origin')||'';
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive','Vary':'Origin','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://evera.top','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!origins.has(origin))return json({error:'not_found'},404);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return json({error:'not_found'},404);
  const authorization=req.headers.get('Authorization')||'';
  if(!authorization.startsWith('Bearer '))return json({error:'not_found'},404);
  try{
   const {data,error}=await admin.auth.getUser(authorization.slice(7));
   if(error||!data?.user||data.user.id!==OWNER_ID||data.user.app_metadata?.role!=='owner')return json({error:'not_found'},404);
   const length=Number(req.headers.get('content-length')||0);if(length>2200000)return json({error:'too_large'},413);
   const text=await req.text();if(text.length>2100000)return json({error:'too_large'},413);
   let body;try{body=JSON.parse(text)}catch{return json({error:'bad_request'},400)}
   if(body.action==='boot'){
    const {error:insertError}=await admin.from('owner_focus_state').upsert({user_id:OWNER_ID,state:defaults(),revision:1},{onConflict:'user_id',ignoreDuplicates:true});
    if(insertError)throw insertError;
    const {data:row,error:readError}=await admin.from('owner_focus_state').select('state,revision').eq('user_id',OWNER_ID).single();if(readError)throw readError;
    const serialized=JSON.stringify(validateState(row.state)).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
    return json({ok:true,revision:row.revision,html:appHTML.replace('__FOCUS_STATE__',()=>serialized)});
   }
   if(body.action==='save'){
    if(!Number.isSafeInteger(body.revision)||body.revision<1)return json({error:'invalid_revision'},400);
    try{validateState(body.state)}catch{return json({error:'invalid_state'},400)}
    const {data:row,error:saveError}=await admin.from('owner_focus_state').update({state:body.state,revision:body.revision+1,updated_at:new Date().toISOString()}).eq('user_id',OWNER_ID).eq('revision',body.revision).select('revision').maybeSingle();
    if(saveError)throw saveError;
    if(!row)return json({error:'conflict'},409);
    return json({ok:true,revision:row.revision});
   }
   return json({error:'not_found'},404);
  }catch{ return json({error:'operation_failed'},500) }
 }
}
