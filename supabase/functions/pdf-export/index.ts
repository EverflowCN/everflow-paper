import {createClient} from 'npm:@supabase/supabase-js@2.111.0';
import {createRemoteJWKSet,jwtVerify} from 'npm:jose@5.9.6';
const url=Deno.env.get('SUPABASE_URL')!;
const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const jwks=createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
const WORKER_CAPACITY=2;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers})}
function etaFor(status:string,position=1){
 const p=Math.max(1,Number(position)||1);
 if(status==='queued')return{etaMinSeconds:90+(p-1)*20,etaMaxSeconds:420+(p-1)*60};
 if(status==='preparing')return{etaMinSeconds:60,etaMaxSeconds:180};
 if(status==='compiling')return{etaMinSeconds:20,etaMaxSeconds:120};
 if(status==='storing')return{etaMinSeconds:5,etaMaxSeconds:30};
 return{etaMinSeconds:0,etaMaxSeconds:0};
}
async function digest(value:string){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))}
async function sharedWorker(req:Request){
 const expected=Deno.env.get('EVERFLOW_PDF_WORKER_SECRET')||'',provided=req.headers.get('X-Everflow-Worker-Key')||'';
 if(!expected||!provided)return false;
 const [a,b]=await Promise.all([digest(expected),digest(provided)]);let diff=0;
 for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 return diff===0;
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
  const manager=['admin','owner'].includes(user.app_metadata?.role);
  let job:any;
  if(req.method==='POST'){
   const {data:membership,error:membershipError}=await db.from('memberships').select('plan,status,source,expires_at').eq('user_id',user.id).maybeSingle();if(membershipError)throw membershipError;
   let effectiveExpiresAt=membership?.expires_at||null;
   if(membership?.source==='promo_exam_2027'&&!effectiveExpiresAt){
    const {data:cfg,error:cfgError}=await db.from('membership_config').select('pro_free_until').eq('id','default').single();if(cfgError)throw cfgError;
    effectiveExpiresAt=cfg?.pro_free_until||null;
   }
   const membershipActive=Boolean(membership&&['member','pro'].includes(membership.plan)&&membership.status==='active'&&(!effectiveExpiresAt||Date.parse(effectiveExpiresAt)>Date.now()));
   if(!membershipActive)return reply({error:'membership_required',message:'PDF 导出为会员权益，请先开通有效会员。'},403);
   const raw=await req.text();if(raw.length>50000)return reply({error:'试卷数据过大'},413);
   const body=JSON.parse(raw);
   if(body.schema!=='everflow-pdf-export-v1'||body.template!=='exam-A4'||!['compact','spacious'].includes(body.layout)||!uuid.test(body.requestId||'')||!Array.isArray(body.questions)||body.questions.length<1||body.questions.length>100)return reply({error:'试卷参数无效'},400);
   const questions=body.questions.map((q:any)=>({source:q.source,id:String(q.id||'')}));
   if(questions.some((q:any)=>q.source==='zhenti'?!/^20\d{2}-(?:[1-9]|[1-3]\d|4[0-7])$/.test(q.id):q.source==='relax'?!/^[a-z]{2,4}-\d{1,3}-\d{1,4}$/.test(q.id):true)||new Set(questions.map((q:any)=>q.source+':'+q.id)).size!==questions.length)return reply({error:'题号无效或重复'},400);
   const payload={schema:body.schema,template:'exam-A4',layout:body.layout,title:String(body.title||'408 组卷').slice(0,100),questions};
   const {data,error}=await db.rpc('pdf_export_enqueue',{p_user:user.id,p_key:body.requestId,p_payload:payload,p_priority:manager?10:0});
   if(error){if(/PDF_RATE_LIMIT|PDF_ACTIVE_JOB/.test(error.message))return reply({error:error.message.includes('PDF_ACTIVE_JOB')?'已有导出任务正在处理，请等待完成':'导出次数较多，请稍后重试'},429);throw error;}
   job=data;
  }else if(req.method==='GET'){
   const id=endpoint.searchParams.get('id')||'';if(!uuid.test(id))return reply({error:'任务编号无效'},400);
   const {data,error}=await db.from('pdf_export_jobs').select('*').eq('id',id).eq('user_id',user.id).maybeSingle();if(error)throw error;
   if(!data)return reply({error:'任务不存在'},404);job=data;
  }else return reply({error:'Method not allowed'},405);
  if(Date.parse(job.expires_at)<=Date.now())return reply({error:'任务已过期，请重新生成'},410);
  const result:any={id:job.id,jobId:job.id,status:job.status,title:job.payload.title,count:job.payload.questions.length,layout:job.payload.layout,expiresAt:job.expires_at};
  const {count:activeWorkers,error:workersError}=await db.from('pdf_export_jobs').select('id',{count:'exact',head:true}).in('status',['preparing','compiling','storing']).gt('lease_until',new Date().toISOString()).gt('expires_at',new Date().toISOString());if(workersError)throw workersError;
  result.workers={busy:Math.min(activeWorkers||0,WORKER_CAPACITY),total:WORKER_CAPACITY};
  if(manager)result.priorityEnabled=job.priority>0;
  if(job.status==='queued'){
   // Return only a count, never other users' records or priority attributes.
   const {data:waiting,error}=await db.from('pdf_export_jobs').select('id,priority,created_at').eq('status','queued').gt('expires_at',new Date().toISOString());if(error)throw error;
   const score=(x:any)=>x.priority+Math.floor((Date.now()-Date.parse(x.created_at))/600000);
   waiting?.sort((a:any,b:any)=>score(b)-score(a)||Date.parse(a.created_at)-Date.parse(b.created_at)||a.id.localeCompare(b.id));
   result.position=(waiting?.findIndex((x:any)=>x.id===job.id)??-1)+1;
   Object.assign(result,etaFor('queued',result.position));
   result.message='已进入生成队列。预计时间会随当前队列与编译节点自动调整；关闭窗口后任务仍会继续。';
  }else if(job.status==='failed')result.message=job.error;
  else Object.assign(result,etaFor(job.status,1));
  if(job.status==='completed'&&job.object_path){const {data,error}=await db.storage.from('exam-pdfs').createSignedUrl(job.object_path,600);if(error)throw error;result.downloadUrl=data.signedUrl;}
  return reply(result,req.method==='POST'?202:200);
 }catch(error){console.error('pdf-export',error instanceof Error?error.message:'error');return reply({error:'PDF 服务暂时不可用，请稍后重试'},503)}
});
