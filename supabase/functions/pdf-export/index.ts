import {createClient} from 'npm:@supabase/supabase-js@2.111.0';
import {createRemoteJWKSet,jwtVerify} from 'npm:jose@5.9.6';
const url=Deno.env.get('SUPABASE_URL')!;
const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const jwks=createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
const WORKER_CAPACITY=2;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers})}
function etaFor(status:string,position=1,fast=false,capacity=2,count=40,busy=0){
 const p=Math.max(1,Number(position)||1),c=Math.max(1,Number(capacity)||1),q=Math.max(1,Math.min(100,Number(count)||40)),b=Math.max(0,Math.min(c,Number(busy)||0));
 if(fast){
  // A queued job must also wait for the currently occupied persistent slots.
  const factor=Math.max(.5,Math.min(2.5,q/40)),waves=Math.max(0,Math.floor((b+p-1)/c));
  if(status==='queued')return{etaMinSeconds:Math.round(6+3*factor+waves*8*factor),etaMaxSeconds:Math.round(18+12*factor+waves*20*factor)};
  if(status==='preparing')return{etaMinSeconds:Math.round(3+3*factor),etaMaxSeconds:Math.round(10+10*factor)};
  if(status==='compiling')return{etaMinSeconds:Math.round(4+3*factor),etaMaxSeconds:Math.round(12+13*factor)};
  if(status==='storing')return{etaMinSeconds:2,etaMaxSeconds:10};
 }else{
  const ahead=Math.max(0,b+p-1);
  if(status==='queued')return{etaMinSeconds:90+ahead*20,etaMaxSeconds:420+ahead*60};
  if(status==='preparing')return{etaMinSeconds:60,etaMaxSeconds:180};
  if(status==='compiling')return{etaMinSeconds:20,etaMaxSeconds:120};
  if(status==='storing')return{etaMinSeconds:5,etaMaxSeconds:30};
 }
 return{etaMinSeconds:0,etaMaxSeconds:0};
}
async function membershipActive(userId:string){
 const {data:membership,error}=await db.from('memberships').select('plan,status,source,expires_at').eq('user_id',userId).maybeSingle();if(error)throw error;
 let effectiveExpiresAt=membership?.expires_at||null;
 if(membership?.source==='promo_exam_2027'&&!effectiveExpiresAt){
  const {data:cfg,error:cfgError}=await db.from('membership_config').select('pro_free_until').eq('id','default').single();if(cfgError)throw cfgError;
  effectiveExpiresAt=cfg?.pro_free_until||null;
 }
 return Boolean(membership&&['member','pro'].includes(membership.plan)&&membership.status==='active'&&(!effectiveExpiresAt||Date.parse(effectiveExpiresAt)>Date.now()));
}
type PdfExportConfig={enabled:boolean;dailyLimit:number;hourlyLimit:number;adminUnlimited:boolean};
async function exportConfig():Promise<PdfExportConfig>{
 const {data,error}=await db.from('pdf_export_config').select('enabled,daily_limit,hourly_limit,admin_unlimited').eq('id','default').single();if(error)throw error;
 return{
  enabled:data?.enabled!==false,
  dailyLimit:Math.max(1,Math.min(500,Number(data?.daily_limit)||15)),
  hourlyLimit:Math.max(1,Math.min(100,Number(data?.hourly_limit)||5)),
  adminUnlimited:data?.admin_unlimited!==false
 };
}
function shanghaiDayWindow(nowMs=Date.now()){
 const offset=8*60*60*1000,shifted=new Date(nowMs+offset);
 const start=Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate())-offset;
 return{startIso:new Date(start).toISOString(),resetAt:new Date(start+24*60*60*1000).toISOString()};
}
async function quotaSnapshot(userId:string,isManager:boolean,cfg?:PdfExportConfig){
 const config=cfg||await exportConfig(),{startIso,resetAt}=shanghaiDayWindow();
 if(isManager&&config.adminUnlimited)return{enabled:config.enabled,unlimited:true,dailyLimit:config.dailyLimit,hourlyLimit:config.hourlyLimit,usedDaily:0,usedHourly:0,remainingDaily:null,remainingHourly:null,resetAt,timezone:'Asia/Shanghai'};
 const hourSince=new Date(Date.now()-60*60*1000).toISOString();
 const [dayResult,hourResult]=await Promise.all([
  db.from('pdf_export_jobs').select('id',{count:'exact',head:true}).eq('user_id',userId).gte('created_at',startIso),
  db.from('pdf_export_jobs').select('id',{count:'exact',head:true}).eq('user_id',userId).gte('created_at',hourSince)
 ]);
 if(dayResult.error)throw dayResult.error;if(hourResult.error)throw hourResult.error;
 const usedDaily=dayResult.count||0,usedHourly=hourResult.count||0;
 return{enabled:config.enabled,unlimited:false,dailyLimit:config.dailyLimit,hourlyLimit:config.hourlyLimit,usedDaily,usedHourly,remainingDaily:Math.max(0,config.dailyLimit-usedDaily),remainingHourly:Math.max(0,config.hourlyLimit-usedHourly),resetAt,timezone:'Asia/Shanghai'};
}
async function workerSnapshot(){
 const freshSince=new Date(Date.now()-45*1000).toISOString();
 const {data:nodes,error:nodesError}=await db.from('pdf_worker_nodes').select('capacity,active').eq('kind','persistent').gt('updated_at',freshSince);if(nodesError)throw nodesError;
 const persistentCapacity=(nodes||[]).reduce((sum:number,node:any)=>sum+(Number(node.capacity)||0),0);
 const persistentBusy=(nodes||[]).reduce((sum:number,node:any)=>sum+Math.min(Number(node.active)||0,Number(node.capacity)||0),0);
 if(persistentCapacity>0)return{fast:true,workers:{busy:persistentBusy,total:persistentCapacity,mode:'persistent'}};
 const {count:activeWorkers,error:workersError}=await db.from('pdf_export_jobs').select('id',{count:'exact',head:true}).in('status',['preparing','compiling','storing']).gt('lease_until',new Date().toISOString()).gt('expires_at',new Date().toISOString());if(workersError)throw workersError;
 return{fast:false,workers:{busy:Math.min(activeWorkers||0,WORKER_CAPACITY),total:WORKER_CAPACITY,mode:'scheduled'}};
}
async function digest(value:string){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))}
async function sharedWorker(req:Request){
 const provided=req.headers.get('X-Everflow-Worker-Key')||'';
 if(!provided||provided.length<32||provided.length>256)return false;
 const hash=[...(await digest(provided))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const {data,error}=await db.from('pdf_worker_tokens').select('id,last_used_at').eq('token_hash',hash).eq('enabled',true).maybeSingle();
 if(error||!data)return false;
 // Keep revocation checks on every request, but avoid rewriting an audit timestamp every 1.5s idle poll.
 if(!data.last_used_at||Date.parse(data.last_used_at)<Date.now()-60_000){
  const {error:touchError}=await db.from('pdf_worker_tokens').update({last_used_at:new Date().toISOString()}).eq('id',data.id);if(touchError)console.warn('pdf worker token touch failed',touchError.message);
 }
 return true;
}
async function worker(req:Request){
 if(await sharedWorker(req))return;
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
 const {payload}=await jwtVerify(token,jwks,{issuer:'https://token.actions.githubusercontent.com',audience:'everflow-pdf-worker',maxTokenAge:'10m'});
 if(payload.repository!=='EverflowCN/everflow-paper'||payload.ref!=='refs/heads/main'||payload.workflow_ref!=='EverflowCN/everflow-paper/.github/workflows/pdf-export-worker.yml@refs/heads/main'||!['schedule','workflow_dispatch','repository_dispatch','push'].includes(String(payload.event_name)))throw new Error('worker_denied');
}
Deno.serve(async(req)=>{
 const endpoint=new URL(req.url),action=endpoint.searchParams.get('action');
 try{
  if(action){
   try{await worker(req)}catch{return reply({error:'Unauthorized worker'},401)}
   if(req.method!=='POST')return reply({error:'Method not allowed'},405);
   if(action==='cleanup'){
    const now=new Date().toISOString();
    const {data:expired,error}=await db.from('pdf_export_jobs').select('id,user_id,object_path').lte('expires_at',now).limit(100);if(error)throw error;
    const paths=[...new Set((expired||[]).map((x:any)=>x.object_path||`${x.user_id}/${x.id}.pdf`).filter(Boolean))];
    if(paths.length){const {error:removeError}=await db.storage.from('exam-pdfs').remove(paths);if(removeError)throw removeError;}
    const ids=(expired||[]).map((x:any)=>x.id);
    if(ids.length){const {error:deleteError}=await db.from('pdf_export_jobs').delete().in('id',ids);if(deleteError)throw deleteError;}
    return reply({cleaned:ids.length,files:paths.length});
   }
   if(action==='pending'){const {count,error}=await db.from('pdf_export_jobs').select('id',{count:'exact',head:true}).in('status',['queued','preparing','compiling','storing']).gt('expires_at',new Date().toISOString());if(error)throw error;return reply({pending:count||0})}
   if(action==='heartbeat'){
    const body=await req.json(),nodeId=String(body.id||'').slice(0,80);
    if(!/^[a-zA-Z0-9._:-]{1,80}$/.test(nodeId))return reply({error:'Invalid worker id'},400);
    const capacity=Math.max(1,Math.min(32,Number(body.capacity)||1)),active=Math.max(0,Math.min(capacity,Number(body.active)||0)),now=new Date().toISOString();
    const {error}=await db.from('pdf_worker_nodes').upsert({id:nodeId,kind:'persistent',capacity,active,updated_at:now},{onConflict:'id'});if(error)throw error;
    await db.from('pdf_worker_nodes').delete().lt('updated_at',new Date(Date.now()-5*60*1000).toISOString());
    return reply({ok:true,at:now});
   }
   if(action==='claim'){
    const {data,error}=await db.rpc('pdf_export_claim');if(error)throw error;
    const job=data?.[0]||null;
    if(!job)return reply({job:null});
    const {data:overrides,error:oe}=await db.from('question_overrides').select('bank,entity_id,patch');if(oe)throw oe;
    return reply({job,overrides});
   }
   const id=endpoint.searchParams.get('id')||'',lease=endpoint.searchParams.get('lease')||'';
   if(!uuid.test(id)||!uuid.test(lease))return reply({error:'Invalid lease'},400);
   const {data:job}=await db.from('pdf_export_jobs').select('*').eq('id',id).eq('lease_token',lease).gt('lease_until',new Date().toISOString()).in('status',['preparing','compiling','storing']).maybeSingle();
   if(!job)return reply({error:'Lease expired'},409);
   if(action==='upload'){
    const bytes=new Uint8Array(await req.arrayBuffer());
    if(bytes.length>20971520||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return reply({error:'Invalid PDF'},400);
    const path=`${job.user_id}/${job.id}.pdf`;
    const {error}=await db.storage.from('exam-pdfs').upload(path,bytes,{contentType:'application/pdf',upsert:true});if(error)throw error;
    const {data:done,error:de}=await db.from('pdf_export_jobs').update({status:'completed',object_path:path,updated_at:new Date().toISOString()}).eq('id',id).eq('lease_token',lease).gt('lease_until',new Date().toISOString()).select('id');if(de)throw de;
    return reply({ok:Boolean(done?.length)});
   }
   if(action==='update'){
    const body=await req.json();
    if(!['preparing','compiling','storing','failed'].includes(body.status))return reply({error:'Invalid status'},400);
    const {error}=await db.from('pdf_export_jobs').update({status:body.status,error:body.status==='failed'?'题目排版失败，请重试或反馈题号':null,updated_at:new Date().toISOString(),lease_until:new Date(Date.now()+600000).toISOString()}).eq('id',id).eq('lease_token',lease);if(error)throw error;
    return reply({ok:true});
   }
   return reply({error:'Unknown action'},400);
  }
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
  const {data:{user},error:authError}=await db.auth.getUser(token);
  if(authError||!user)return reply({error:'请先登录后导出 PDF'},401);
  const manager=['admin','owner'].includes(user.app_metadata?.role),owner=user.app_metadata?.role==='owner';
  if(endpoint.searchParams.get('admin')==='1'){
   if(!manager)return reply({error:'not_found'},404);
   if(req.method==='POST'){
    if(!owner)return reply({error:'forbidden'},403);
    let body:any={};try{body=await req.json()}catch{return reply({error:'invalid_json'},400)}
    if(body.action!=='config')return reply({error:'invalid_action'},400);
    const incoming=body.config||{},daily=Math.max(1,Math.min(500,Math.round(Number(incoming.dailyLimit)||15))),hourly=Math.max(1,Math.min(daily,Math.min(100,Math.round(Number(incoming.hourlyLimit)||5))));
    const row={enabled:incoming.enabled!==false,daily_limit:daily,hourly_limit:hourly,admin_unlimited:incoming.adminUnlimited!==false,updated_at:new Date().toISOString()};
    const {data,error}=await db.from('pdf_export_config').update(row).eq('id','default').select('enabled,daily_limit,hourly_limit,admin_unlimited').single();if(error)throw error;
    await db.from('admin_audit').insert({actor_user_id:user.id,action:'pdf_export_config_update',detail:{enabled:row.enabled,daily_limit:daily,hourly_limit:hourly,admin_unlimited:row.admin_unlimited}});
    return reply({ok:true,config:{enabled:data.enabled!==false,dailyLimit:Number(data.daily_limit)||15,hourlyLimit:Number(data.hourly_limit)||5,adminUnlimited:data.admin_unlimited!==false,timezone:'Asia/Shanghai'}});
   }
   if(req.method!=='GET')return reply({error:'Method not allowed'},405);
   const now=new Date().toISOString(),freshSince=new Date(Date.now()-45*1000).toISOString(),dayAgo=new Date(Date.now()-24*60*60*1000).toISOString(),cfg=await exportConfig(),{startIso:todayStart}=shanghaiDayWindow();
   const statuses=['queued','preparing','compiling','storing','completed','failed'];
   const [nodesResult,tokensResult,recentResult,todayResult,...countResults]=await Promise.all([
    db.from('pdf_worker_nodes').select('id,kind,capacity,active,updated_at').order('updated_at',{ascending:false}).limit(20),
    db.from('pdf_worker_tokens').select('id,enabled,last_used_at').order('created_at',{ascending:true}).limit(20),
    db.from('pdf_export_jobs').select('id,status,priority,payload,created_at,updated_at,attempts,error,lease_until').gte('created_at',dayAgo).order('created_at',{ascending:false}).limit(40),
    db.from('pdf_export_jobs').select('id',{count:'exact',head:true}).gte('created_at',todayStart),
    ...statuses.map(status=>db.from('pdf_export_jobs').select('id',{count:'exact',head:true}).eq('status',status).gt('expires_at',now))
   ]);
   if(nodesResult.error)throw nodesResult.error;if(tokensResult.error)throw tokensResult.error;if(recentResult.error)throw recentResult.error;if(todayResult.error)throw todayResult.error;
   for(const result of countResults)if(result.error)throw result.error;
   const counts=Object.fromEntries(statuses.map((status,index)=>[status,countResults[index].count||0]));
   const nodes=(nodesResult.data||[]).map((node:any)=>({...node,healthy:Date.parse(node.updated_at)>Date.parse(freshSince)}));
   const recent=(recentResult.data||[]).map((job:any)=>{
    const active=['queued','preparing','compiling','storing'].includes(job.status);
    const elapsedEnd=active?Date.now():Date.parse(job.updated_at);
    return{
     id:job.id,status:job.status,title:String(job.payload?.title||'408 组卷'),count:Array.isArray(job.payload?.questions)?job.payload.questions.length:0,
     layout:job.payload?.layout||'compact',priorityEnabled:Number(job.priority)>0,attempts:Number(job.attempts)||0,
     createdAt:job.created_at,updatedAt:job.updated_at,error:job.error||null,
     elapsedSeconds:Math.max(0,Math.round((elapsedEnd-Date.parse(job.created_at))/100)/10)
    };
   });
   return reply({workers:nodes,tokens:(tokensResult.data||[]).map((token:any)=>({id:token.id,enabled:token.enabled,lastUsedAt:token.last_used_at})),counts,recent,config:{...cfg,timezone:'Asia/Shanghai'},usage:{todayStarted:todayResult.count||0},fallback:{enabled:true,kind:'github-actions',scheduleMinutes:5}});
  }
  if(req.method==='GET'&&endpoint.searchParams.get('availability')==='1'){
   if(!(await membershipActive(user.id)))return reply({error:'membership_required',message:'PDF 导出为会员权益，请先开通有效会员。'},403);
   const cfg=await exportConfig(),quota=await quotaSnapshot(user.id,manager,cfg);
   if(!cfg.enabled)return reply({error:'pdf_disabled',message:'PDF 导出当前由管理员暂停。',quota},403);
   const snap=await workerSnapshot(),questionCount=Math.max(1,Math.min(100,Number(endpoint.searchParams.get('count'))||40)),eta=etaFor('queued',1,snap.fast,snap.workers.total,questionCount,snap.workers.busy);
   return reply({...eta,workers:snap.workers,questionCount,quota});
  }
  let job:any;
  if(req.method==='POST'){
   if(!(await membershipActive(user.id)))return reply({error:'membership_required',message:'PDF 导出为会员权益，请先开通有效会员。'},403);
   const cfg=await exportConfig();
   if(!cfg.enabled)return reply({error:'pdf_disabled',message:'PDF 导出当前由管理员暂停。',quota:await quotaSnapshot(user.id,manager,cfg)},403);
   const raw=await req.text();if(raw.length>50000)return reply({error:'试卷数据过大'},413);
   const body=JSON.parse(raw);
   if(body.schema!=='everflow-pdf-export-v1'||body.template!=='exam-A4'||!['compact','spacious'].includes(body.layout)||!uuid.test(body.requestId||'')||!Array.isArray(body.questions)||body.questions.length<1||body.questions.length>100)return reply({error:'试卷参数无效'},400);
   const questions=body.questions.map((q:any)=>({source:q.source,id:String(q.id||'')}));
   if(questions.some((q:any)=>q.source==='zhenti'?!/^20\d{2}-(?:[1-9]|[1-3]\d|4[0-7])$/.test(q.id):q.source==='relax'?!/^[a-z]{2,4}-\d{1,3}-\d{1,4}$/.test(q.id):true)||new Set(questions.map((q:any)=>q.source+':'+q.id)).size!==questions.length)return reply({error:'题号无效或重复'},400);
   const payload={schema:body.schema,template:'exam-A4',layout:body.layout,title:String(body.title||'408 组卷').slice(0,100),questions};
   const {data,error}=await db.rpc('pdf_export_enqueue',{p_user:user.id,p_key:body.requestId,p_payload:payload,p_priority:manager?10:0});
   if(error){
    const message=String(error.message||'');
    if(message.includes('PDF_ACTIVE_JOB'))return reply({error:'active_job',message:'已有导出任务正在处理，请等待完成'},429);
    if(message.includes('PDF_DISABLED'))return reply({error:'pdf_disabled',message:'PDF 导出当前由管理员暂停。'},403);
    if(/PDF_DAILY_LIMIT|PDF_HOURLY_LIMIT/.test(message)){
     const quota=await quotaSnapshot(user.id,manager,cfg),daily=message.includes('PDF_DAILY_LIMIT');
     const limitMessage=daily?('今日 PDF 导出次数已用完（'+quota.dailyLimit+'/'+quota.dailyLimit+'），明日 00:00 自动恢复。'):('近 60 分钟 PDF 导出次数已用完（'+quota.hourlyLimit+'/'+quota.hourlyLimit+'），请稍后再试。');
     return reply({error:daily?'daily_limit':'hourly_limit',message:limitMessage,quota},429);
    }
    throw error;
   }
   job=data;
  }else if(req.method==='GET'){
   const id=endpoint.searchParams.get('id')||'';if(!uuid.test(id))return reply({error:'任务编号无效'},400);
   const {data,error}=await db.from('pdf_export_jobs').select('*').eq('id',id).eq('user_id',user.id).maybeSingle();if(error)throw error;
   if(!data)return reply({error:'任务不存在'},404);job=data;
  }else return reply({error:'Method not allowed'},405);
  if(Date.parse(job.expires_at)<=Date.now())return reply({error:'任务已过期，请重新生成'},410);
  const result:any={id:job.id,jobId:job.id,status:job.status,title:job.payload.title,count:job.payload.questions.length,layout:job.payload.layout,expiresAt:job.expires_at};
  if(req.method==='POST')result.quota=await quotaSnapshot(user.id,manager);
  const snap=await workerSnapshot(),fastWorker=snap.fast;
  result.workers=snap.workers;
  if(manager)result.priorityEnabled=job.priority>0;
  if(job.status==='queued'){
   // Return only a count, never other users' records or priority attributes.
   const {data:waiting,error}=await db.from('pdf_export_jobs').select('id,priority,created_at').eq('status','queued').gt('expires_at',new Date().toISOString());if(error)throw error;
   const score=(x:any)=>x.priority+Math.floor((Date.now()-Date.parse(x.created_at))/600000);
   waiting?.sort((a:any,b:any)=>score(b)-score(a)||Date.parse(a.created_at)-Date.parse(b.created_at)||a.id.localeCompare(b.id));
   const queueIndex=waiting?.findIndex((x:any)=>x.id===job.id)??-1;
   result.position=queueIndex>=0?queueIndex+1:1;
   Object.assign(result,etaFor('queued',result.position,fastWorker,result.workers.total,result.count,result.workers.busy));
   result.message='已进入生成队列。预计时间会随当前队列与编译节点自动调整；关闭窗口后任务仍会继续。';
  }else if(job.status==='failed')result.message=job.error;
  else Object.assign(result,etaFor(job.status,1,fastWorker,result.workers.total,result.count));
  if(job.status==='completed'&&job.object_path){const {data,error}=await db.storage.from('exam-pdfs').createSignedUrl(job.object_path,600);if(error)throw error;result.downloadUrl=data.signedUrl;}
  return reply(result,req.method==='POST'?202:200);
 }catch(error){console.error('pdf-export',error instanceof Error?error.message:'error');return reply({error:'PDF 服务暂时不可用，请稍后重试'},503)}
});
