/* Everflow math collection sync: same auth/session as site homepage, existing owner-only RLS table.
 * Scope is per enabled collection. Legacy guest data is adopted by the first signed-in account only.
 * Per-question timestamps preserve edits made on separate devices. No service-role credentials.
 */
import './cloud-config.js?v=20260902-qsync2';
import './cloud.js?v=20260904-stable2';

const TABLE='zhenti_sync_states';
const CLAIM='everflow-math-guest-claim-v1';
const LAST_SYNC='everflow-math-cloud-sync-v1';
const INTERVAL=12*60*60*1000;
const GUEST_SUFFIX='';
const clean=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const now=()=>new Date().toISOString();
const stamp=v=>{const ms=Date.parse(v||'');return Number.isFinite(ms)?ms:0};
const emit=detail=>document.dispatchEvent(new CustomEvent('everflow:math-cloud',{detail}));
let registry=null,user=null,client=null,initializing=null,syncing=null,dirtyTimer=0;
let accountGeneration=0;
const callbacks=new Set();
function status(kind,text){emit({kind,text,userId:user?.id||null});callbacks.forEach(fn=>{try{fn({kind,text,userId:user?.id||null})}catch{}})}
export const onStatus=fn=>{callbacks.add(fn);return()=>callbacks.delete(fn)};
export const currentUser=()=>user;
export const isLoggedIn=()=>Boolean(user);
export function storageKey(collection){
 const base=String(collection?.storageKey||'');
 if(!base.startsWith('everflow-math2-'))throw Error('Invalid math progress key');
 return user?.id?base+'::user:'+user.id:base+GUEST_SUFFIX;
}
export function read(collection){
 try{return clean(JSON.parse(localStorage.getItem(storageKey(collection))||'{}'))}catch{return{}}
}
function persist(collection,records,{broadcast=true}={}){
 localStorage.setItem(storageKey(collection),JSON.stringify(clean(records)));
 if(broadcast)document.dispatchEvent(new CustomEvent('everflow:math-records-change',{detail:{collectionId:collection.id}}));
}
function keys(p){return new Set([...Object.keys(clean(p?.answers)),...Object.keys(clean(p?.judgements)),...Array.isArray(p?.visited)?p.visited:[]])}
function clonePaper(p={}){
 const v=clean(p);
 return{...v,answers:{...clean(v.answers)},judgements:{...clean(v.judgements)},visited:Array.isArray(v.visited)?[...new Set(v.visited.map(String))]:[],questionUpdatedAt:{...clean(v.questionUpdatedAt)}};
}
export function mergePaper(a={},b={}){
 const left=clonePaper(a),right=clonePaper(b);
 const out=clonePaper(stamp(left.updatedAt)>=stamp(right.updatedAt)?left:right);
 const answers={},judgements={},visited=new Set(),questionUpdatedAt={};
 const questions=new Set([...keys(left),...keys(right),...Object.keys(left.questionUpdatedAt),...Object.keys(right.questionUpdatedAt)]);
 for(const id of questions){
  // Current format tracks each question independently; older records fall back to paper timestamp.
  const ta=stamp(left.questionUpdatedAt[id]||left.updatedAt),tb=stamp(right.questionUpdatedAt[id]||right.updatedAt);
  const candidate=tb>ta?right:left;
  if(Object.hasOwn(candidate.answers,id))answers[id]=candidate.answers[id];
  if(Object.hasOwn(candidate.judgements,id))judgements[id]=candidate.judgements[id];
  if(candidate.visited.includes(id))visited.add(id);
  questionUpdatedAt[id]=new Date(Math.max(ta,tb,0)).toISOString();
 }
 out.answers=answers;out.judgements=judgements;out.visited=[...visited];out.questionUpdatedAt=questionUpdatedAt;
 out.elapsed=Math.max(Number(left.elapsed)||0,Number(right.elapsed)||0);
 out.updatedAt=stamp(left.updatedAt)>=stamp(right.updatedAt)?left.updatedAt||now():right.updatedAt||now();
 return out;
}
export function mergeRecords(local={},remote={}){
 const out={};for(const id of new Set([...Object.keys(clean(local)),...Object.keys(clean(remote))])){
  if(local[id]||remote[id])out[id]=mergePaper(local[id],remote[id]);
 }return out;
}
export function update(collection,paperId,patch={}){
 if(!collection||!paperId)return;
 const all=read(collection),previous=clonePaper(all[paperId]||{}),next=clonePaper({...previous,...patch});
 const changed=new Set();
 for(const prop of ['answers','judgements']){
  const older=clean(previous[prop]),newer=clean(next[prop]);
  for(const id of new Set([...Object.keys(older),...Object.keys(newer)]))if(older[id]!==newer[id])changed.add(id);
 }
 const oldVisited=new Set(previous.visited),newVisited=new Set(next.visited);
 for(const id of new Set([...oldVisited,...newVisited]))if(oldVisited.has(id)!==newVisited.has(id))changed.add(id);
 const date=now();
 for(const id of changed)next.questionUpdatedAt[id]=date;
 next.updatedAt=date;
 all[paperId]=next;
 persist(collection,all);
 clearTimeout(dirtyTimer);
 // Debounced after local edits: no waiting 12h for progress to reach another device.
 if(user&&navigator.onLine!==false)dirtyTimer=setTimeout(()=>syncNow('edit').catch(()=>{}),1700);
 return next;
}
function deviceId(){
 let id='';try{id=localStorage.getItem('everflow-device-id')||''}catch{}
 if(!id){id=crypto.randomUUID?.()||'math-'+Date.now();try{localStorage.setItem('everflow-device-id',id)}catch{}}
 return id;
}
async function adoptGuest(owner){
 if(localStorage.getItem(CLAIM))return;
 let adopted=0;
 for(const c of registry?.collections||[]){
  const old=clean(JSON.parse(localStorage.getItem(c.storageKey)||'{}'));
  if(!Object.keys(old).length)continue;
  const scoped=c.storageKey+'::user:'+owner;
  let existing={};try{existing=clean(JSON.parse(localStorage.getItem(scoped)||'{}'))}catch{}
  localStorage.setItem(scoped,JSON.stringify(mergeRecords(existing,old)));
  localStorage.removeItem(c.storageKey);
  adopted++;
 }
 localStorage.setItem(CLAIM,String(owner)); // prevents cross-account reuse of guest data
 return adopted;
}
async function applyUser(next){
 if(next?.id===user?.id)return;
 accountGeneration++;
 clearTimeout(dirtyTimer);
 user=next||null;
 if(user)try{await adoptGuest(user.id)}catch(e){console.warn('Math guest migration retained locally',e)}
 status(user?'local','云端已连接 · 等待同步');
 document.dispatchEvent(new CustomEvent('everflow:math-account-change',{detail:{userId:user?.id||null}}));
}
export async function initialize(manifest){
 registry={...manifest,collections:(manifest.collections||[]).filter(c=>c.enabled===true)};
 if(initializing)return initializing;
 initializing=(async()=>{
  try{
   const cloud=window.EveraCloud;
   if(!cloud?.getClient){status('local','本机模式 · 云服务未连接');return}
   await cloud.ready;client=await cloud.getClient();
   if(!client){status('local','本机模式 · 云服务不可用');return}
   await applyUser(await cloud.getUser({fresh:true}));
   // Same auth lifecycle and 12-hour cadence as the main site.
   client.auth.onAuthStateChange((event,session)=>{
    if(['SIGNED_IN','SIGNED_OUT','INITIAL_SESSION','USER_UPDATED'].includes(event)){
     setTimeout(()=>{applyUser(session?.user||null).then(()=>{
      if(session?.user)syncNow('auth-change').catch(()=>{});
     }).catch(console.warn)},0);
    }
   });
   document.addEventListener('everflow:cloud-sync',()=>{if(user)syncNow('home-sync').catch(()=>{})});
   addEventListener('online',()=>{if(user)syncNow('online').catch(()=>{})});
   document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&user&&due())syncNow('visible').catch(()=>{});
   });
   setInterval(()=>{if(user&&document.visibilityState==='visible'&&due())syncNow('12h-timer').catch(()=>{})},INTERVAL);
   if(user)await syncNow('initial');
   else status('guest','本机模式 · 登录后可跨设备同步');
  }catch(error){console.warn('Math cloud initialization failed',error);status('error','云端暂不可用 · 已保留本机记录')}
 })();
 return initializing;
}
function due(){
 const last=clean(JSON.parse(localStorage.getItem(LAST_SYNC)||'{}'));
 return last.userId!==user?.id||Date.now()-stamp(last.at)>INTERVAL;
}
export async function syncNow(reason='manual'){
 if(syncing)return syncing;
 if(!client||!user){status('guest','登录后可同步');return{ok:false,reason:'guest'}}
 if(navigator.onLine===false){status('local','离线 · 本机记录已保存');return{ok:false,reason:'offline'}}
 const startGeneration=accountGeneration,uid=user.id;
 syncing=(async()=>{
  status('busy','正在同步云端…');
  try{
   const reports=[];
   for(const c of registry.collections){
    if(accountGeneration!==startGeneration)throw Error('account_changed_during_sync');
    const scope='math2:'+c.id+':v1';
    const {data,error}=await client.from(TABLE).select('payload,updated_at').eq('user_id',uid).eq('scope_key',scope).maybeSingle();
    if(error)throw error;
    if(accountGeneration!==startGeneration)throw Error('account_changed_during_sync');
    const original=read(c);
    const remote=clean(data?.payload?.papers);
    const merged=mergeRecords(original,remote);
    const currentPayload=JSON.stringify(remote),combinedPayload=JSON.stringify(merged);
    if(currentPayload!==combinedPayload){
     const {error:writeError}=await client.from(TABLE).upsert({
      user_id:uid,scope_key:scope,device_id:deviceId(),updated_at:now(),
      payload:{schema:'everflow-math2-cloud-v1',collectionId:c.id,papers:merged}
     },{onConflict:'user_id,scope_key'});
     if(writeError)throw writeError;
    }
    if(accountGeneration!==startGeneration)throw Error('account_changed_during_sync');
    // Protect edits made during the network round-trip: merge fresh local changes again.
    const latest=mergeRecords(read(c),merged);
    persist(c,latest,{broadcast:JSON.stringify(latest)!==JSON.stringify(original)});
    reports.push({collection:c.id,papers:Object.keys(latest).length});
   }
   localStorage.setItem(LAST_SYNC,JSON.stringify({userId:uid,at:now()}));
   status('ok','已同步 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}));
   const result={ok:true,reports,reason};document.dispatchEvent(new CustomEvent('everflow:math-cloud-sync',{detail:result}));return result;
  }catch(error){if(error?.message!=='account_changed_during_sync'){status('error','同步失败 · 本机记录安全');console.warn('Math sync failure',error)}return{ok:false,error:String(error?.message||error)}}finally{syncing=null}
 })();
 return syncing;
}
export function state(){return{userId:user?.id||null,cloudReady:!!client,enabledCollections:registry?.collections?.length||0}};
