import './cloud-config.js?v=20260902-qsync1';
import './cloud.js?v=20260825-auth1';
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm';

const cfg=window.EVERFLOW_CLOUD||{};
const cloud=window.EveraCloud;
const TABLE='zhenti_sync_states';
const TRUE_SCOPE='snapshot:v1';
const RELAX_SCOPE='relax1000:v1';
const LAST_USER_KEY='everflow-408-question-cloud-user-v1';
const META_KEY='everflow-408-question-cloud-meta-v1';
const RELAX_RESET_KEY='everflow-408-relax-cloud-reset-at-v1';
const DEVICE_KEY='everflow-408-device-id-v1';
const ZHENTI_KEYS={wall:'everflow-408-zhenti-wall-v1',srs:'everflow-408-srs-v1',error:'everflow-408-srs-error-v1',reset:'everflow-408-zhenti-reset-at-v1'};
const RELAX_KEYS={records:'everflow-408-relax1000-records-v1',srs:'everflow-408-relax-srs-v1',seen:'relax-seen',mistakes:'relax-mistakes',everWrong:'relax-ever-wrong',bookmarks:'relax-bookmarks'};
const emptySrs=()=>({version:1,settings:{dailyNew:20,targetRetention:.9},cards:{},daily:{}});
const emptyError=()=>({version:1,cards:{},daily:{}});
const enabled=Boolean(cfg.url&&cfg.publishableKey&&cloud?.enabled!==false);
const client=enabled?createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
let syncPromise=null,scheduleTimer=0,applying=false,patched=false;

const readJson=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch{return fallback}};
const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const readText=key=>{try{return localStorage.getItem(key)||''}catch{return''}};
const writeText=(key,value)=>{try{if(value)localStorage.setItem(key,String(value));else localStorage.removeItem(key)}catch{}};
const isoTime=value=>{const time=new Date(value||0).getTime();return Number.isFinite(time)?time:0};
const nowIso=()=>new Date().toISOString();
const idKey=value=>String(value??'');
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const array=value=>Array.isArray(value)?value:[];
function deviceId(){let id=readText(DEVICE_KEY);if(!id){id=crypto.randomUUID?.()||`dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;writeText(DEVICE_KEY,id)}return id}
function maxNumbers(a={},b={}){const out={...a,...b};for(const key of new Set([...Object.keys(a||{}),...Object.keys(b||{})]))if(typeof a?.[key]==='number'||typeof b?.[key]==='number')out[key]=Math.max(Number(a?.[key]||0),Number(b?.[key]||0));return out}
function mergeByTime(local,remote,timeKey='updatedAt'){if(!local)return remote||null;if(!remote)return local||null;return isoTime(local?.[timeKey])>=isoTime(remote?.[timeKey])?local:remote}
function mergeSrs(local={},remote={}){const cards={};for(const key of new Set([...Object.keys(remote?.cards||{}),...Object.keys(local?.cards||{})]))cards[key]=mergeByTime(local?.cards?.[key],remote?.cards?.[key],'lastReviewAt')||{};const daily={};for(const day of new Set([...Object.keys(remote?.daily||{}),...Object.keys(local?.daily||{})]))daily[day]=maxNumbers(remote?.daily?.[day]||{},local?.daily?.[day]||{});return{version:Math.max(Number(remote?.version||1),Number(local?.version||1)),settings:{...(remote?.settings||{}),...(local?.settings||{})},cards,daily}}
function mergeError(local={},remote={}){const cards={};for(const key of new Set([...Object.keys(remote?.cards||{}),...Object.keys(local?.cards||{})]))cards[key]=mergeByTime(local?.cards?.[key],remote?.cards?.[key],'updatedAt')||{};const daily={};for(const day of new Set([...Object.keys(remote?.daily||{}),...Object.keys(local?.daily||{})]))daily[day]=maxNumbers(remote?.daily?.[day]||{},local?.daily?.[day]||{});return{version:Math.max(Number(remote?.version||1),Number(local?.version||1)),cards,daily}}

function trueSnapshot(){return{schema:'everflow-408-zhenti-cloud-v2',resetAt:readText(ZHENTI_KEYS.reset)||null,wall:object(readJson(ZHENTI_KEYS.wall,{})),srs:object(readJson(ZHENTI_KEYS.srs,emptySrs())),error:object(readJson(ZHENTI_KEYS.error,emptyError()))}}
function mergeWall(local={},remote={}){const out={};for(const key of new Set([...Object.keys(remote||{}),...Object.keys(local||{})]))out[key]=mergeByTime(local?.[key],remote?.[key])||{};return out}
function mergeTrue(local,remote){if(!remote)return local;const localReset=isoTime(local?.resetAt),remoteReset=isoTime(remote?.resetAt);if(localReset>remoteReset)return local;if(remoteReset>localReset)return remote;return{schema:'everflow-408-zhenti-cloud-v2',resetAt:local?.resetAt||remote?.resetAt||null,wall:mergeWall(local?.wall||{},remote?.wall||{}),srs:mergeSrs(local?.srs||emptySrs(),remote?.srs||emptySrs()),error:mergeError(local?.error||emptyError(),remote?.error||emptyError())}}
function applyTrue(snapshot){applying=true;try{writeText(ZHENTI_KEYS.reset,snapshot?.resetAt||'');writeJson(ZHENTI_KEYS.wall,object(snapshot?.wall));writeJson(ZHENTI_KEYS.srs,object(snapshot?.srs)||emptySrs());writeJson(ZHENTI_KEYS.error,object(snapshot?.error)||emptyError())}finally{applying=false}}

function normalizeRelax(snapshot={}){
  const capturedAt=snapshot.capturedAt||nowIso(),records=object(snapshot.records),sets={seen:new Set(array(snapshot.seen).map(idKey)),mistakes:new Set(array(snapshot.mistakes).map(idKey)),everWrong:new Set(array(snapshot.everWrong).map(idKey)),bookmarks:new Set(array(snapshot.bookmarks).map(idKey))};
  const ids=new Set([...Object.keys(records),...sets.seen,...sets.mistakes,...sets.everWrong,...sets.bookmarks]),out={};
  for(const id of ids){const rec={...(records[id]||{})},updatedAt=rec.updatedAt||capturedAt;out[id]={rec,updatedAt,seen:Boolean(rec.answer)||sets.seen.has(id),wrong:rec.correct===false||sets.mistakes.has(id),everWrong:sets.everWrong.has(id)||rec.correct===false||sets.mistakes.has(id),favorite:Boolean(rec.favorite)||sets.bookmarks.has(id)}}
  return out;
}
function relaxSnapshot(){return{schema:'everflow-408-relax-cloud-v1',capturedAt:nowIso(),resetAt:readText(RELAX_RESET_KEY)||null,records:object(readJson(RELAX_KEYS.records,{})),srs:object(readJson(RELAX_KEYS.srs,emptySrs())),seen:array(readJson(RELAX_KEYS.seen,[])),mistakes:array(readJson(RELAX_KEYS.mistakes,[])),everWrong:array(readJson(RELAX_KEYS.everWrong,[])),bookmarks:array(readJson(RELAX_KEYS.bookmarks,[]))}}
function rebuildRelax(normalized,srs,resetAt){const records={},seen=[],mistakes=[],everWrong=[],bookmarks=[];for(const [id,state] of Object.entries(normalized)){const rec={...(state.rec||{})};if(state.favorite)rec.favorite=true;else delete rec.favorite;if(!rec.updatedAt&&state.updatedAt)rec.updatedAt=state.updatedAt;const meaningful=Object.keys(rec).some(key=>key!=='updatedAt');if(meaningful)records[id]=rec;if(state.seen)seen.push(id);if(state.wrong)mistakes.push(id);if(state.everWrong)everWrong.push(id);if(state.favorite)bookmarks.push(id)}return{schema:'everflow-408-relax-cloud-v1',capturedAt:nowIso(),resetAt:resetAt||null,records,srs:srs||emptySrs(),seen,mistakes,everWrong,bookmarks}}
function mergeRelax(local,remote){if(!remote)return local;const localReset=isoTime(local?.resetAt),remoteReset=isoTime(remote?.resetAt),resetAt=localReset>=remoteReset?local?.resetAt:remote?.resetAt;let left=normalizeRelax(local),right=normalizeRelax(remote);const resetTime=Math.max(localReset,remoteReset);if(resetTime){left=Object.fromEntries(Object.entries(left).filter(([,state])=>isoTime(state.updatedAt)>resetTime));right=Object.fromEntries(Object.entries(right).filter(([,state])=>isoTime(state.updatedAt)>resetTime))}const merged={};for(const id of new Set([...Object.keys(right),...Object.keys(left)]))merged[id]=mergeByTime(left[id],right[id])||left[id]||right[id];let srs;if(localReset>remoteReset)srs=local.srs||emptySrs();else if(remoteReset>localReset)srs=remote.srs||emptySrs();else srs=mergeSrs(local.srs||emptySrs(),remote.srs||emptySrs());return rebuildRelax(merged,srs,resetAt)}
function applyRelax(snapshot){applying=true;try{writeText(RELAX_RESET_KEY,snapshot?.resetAt||'');writeJson(RELAX_KEYS.records,object(snapshot?.records));writeJson(RELAX_KEYS.srs,object(snapshot?.srs)||emptySrs());writeJson(RELAX_KEYS.seen,array(snapshot?.seen));writeJson(RELAX_KEYS.mistakes,array(snapshot?.mistakes));writeJson(RELAX_KEYS.everWrong,array(snapshot?.everWrong));writeJson(RELAX_KEYS.bookmarks,array(snapshot?.bookmarks))}finally{applying=false}}
function emptyTrue(){return{schema:'everflow-408-zhenti-cloud-v2',resetAt:null,wall:{},srs:emptySrs(),error:emptyError()}}
function emptyRelax(){return{schema:'everflow-408-relax-cloud-v1',capturedAt:nowIso(),resetAt:null,records:{},srs:emptySrs(),seen:[],mistakes:[],everWrong:[],bookmarks:[]}}
function clearLocalQuestions(){applyTrue(emptyTrue());applyRelax(emptyRelax())}

async function currentUser(){if(!enabled)return null;await cloud.ready;return cloud.getUser({fresh:true})}
async function ensureSession(){const {data,error}=await client.auth.getSession();if(error)throw error;if(!data?.session)throw new Error('question_cloud_session_missing');return data.session}
async function readRemote(userId,scope){const {data,error}=await client.from(TABLE).select('payload,updated_at,device_id').eq('user_id',userId).eq('scope_key',scope).maybeSingle();if(error)throw error;return data||null}
async function writeRemote(userId,scope,payload){const row={user_id:userId,scope_key:scope,payload,device_id:deviceId(),updated_at:nowIso()};const {error}=await client.from(TABLE).upsert(row,{onConflict:'user_id,scope_key'});if(error)throw error;return row.updated_at}
function pageNeedsReload(){return ['zhenti','graph','relax-reader'].includes(document.body?.dataset?.view||'')}

async function runSync({manual=false,reason='auto'}={}){
  if(!enabled)return{ok:false,reason:'disabled',questionRecords:0};
  if(navigator.onLine===false)return{ok:false,reason:'offline',questionRecords:0};
  const user=await currentUser();if(!user)return{ok:false,reason:'guest',questionRecords:0};
  await ensureSession();
  const [remoteTrueRow,remoteRelaxRow]=await Promise.all([readRemote(user.id,TRUE_SCOPE),readRemote(user.id,RELAX_SCOPE)]);
  const previousUser=readText(LAST_USER_KEY),accountChanged=Boolean(previousUser&&previousUser!==user.id);
  const localTrue=trueSnapshot(),localRelax=relaxSnapshot();
  const mergedTrue=accountChanged?(remoteTrueRow?.payload||emptyTrue()):mergeTrue(localTrue,remoteTrueRow?.payload||null);
  const mergedRelax=accountChanged?(remoteRelaxRow?.payload||emptyRelax()):mergeRelax(localRelax,remoteRelaxRow?.payload||null);
  const trueBefore=JSON.stringify(localTrue),relaxBefore=JSON.stringify(localRelax);
  applyTrue(mergedTrue);applyRelax(mergedRelax);
  const [trueAt,relaxAt]=await Promise.all([writeRemote(user.id,TRUE_SCOPE,mergedTrue),writeRemote(user.id,RELAX_SCOPE,mergedRelax)]);
  writeText(LAST_USER_KEY,user.id);
  const trueRecords=Object.keys(object(mergedTrue.wall)).length,relaxRecords=Object.keys(object(mergedRelax.records)).length,questionRecords=trueRecords+relaxRecords,pulledRemote=trueBefore!==JSON.stringify(mergedTrue)||relaxBefore!==JSON.stringify(mergedRelax);
  const result={ok:true,at:trueAt>trueAt?relaxAt:trueAt,userId:user.id,questionScopes:2,trueRecords,relaxRecords,questionRecords,accountChanged,pulledRemote,manual,reason};
  writeJson(META_KEY,result);try{localStorage.setItem('everflow-last-question-cloud-sync',JSON.stringify(result))}catch{}
  document.dispatchEvent(new CustomEvent('everflow:question-cloud-sync',{detail:result}));
  if(pulledRemote&&pageNeedsReload()&&!manual){sessionStorage.setItem('everflow-408-question-cloud-toast',accountChanged?'已切换到当前账户的云端题库进度。':'已载入云端最新题库进度。');setTimeout(()=>location.reload(),140)}
  return result;
}
async function syncAll(options={}){if(syncPromise)return syncPromise;syncPromise=runSync(options).catch(error=>{console.error('Everflow question cloud sync failed',error);document.dispatchEvent(new CustomEvent('everflow:question-cloud-error',{detail:{message:error?.message||String(error)}}));throw error}).finally(()=>{syncPromise=null});return syncPromise}
function schedule(delay=700,reason='change'){clearTimeout(scheduleTimer);scheduleTimer=setTimeout(()=>syncAll({reason}).catch(()=>{}),delay)}

async function patchMainCloud(){if(patched||!cloud?.syncAll)return;patched=true;const baseSync=cloud.syncAll.bind(cloud);cloud.syncAll=async function combinedSync(...args){const base=await baseSync(...args);if(!base?.ok)return base;const questions=await syncAll({manual:true,reason:'account-sync'});return{...base,...questions,ok:true,at:questions.at||base.at,courses:Number(base.courses||0),questionRecords:Number(questions.questionRecords||0),trueRecords:Number(questions.trueRecords||0),relaxRecords:Number(questions.relaxRecords||0),questionScopes:Number(questions.questionScopes||0)}};window.dispatchEvent(new CustomEvent('everflow:cloud-sync-upgraded',{detail:{questions:true}}))}

window.EveraQuestionCloud={enabled,syncAll,trueSnapshot,relaxSnapshot};
patchMainCloud();
document.addEventListener('everflow:zhenti-records-change',()=>{if(!applying)schedule(500,'zhenti-change')});
document.addEventListener('everflow:relax-records-change',event=>{if(applying)return;if(event.detail?.reset)writeText(RELAX_RESET_KEY,nowIso());schedule(500,'relax-change')});
document.addEventListener('everflow:zhenti-reset-all',()=>schedule(0,'zhenti-reset'));
addEventListener('online',()=>schedule(250,'online'));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(500,'visible')});
addEventListener('storage',event=>{if([...Object.values(ZHENTI_KEYS),...Object.values(RELAX_KEYS),RELAX_RESET_KEY].includes(event.key))schedule(600,'cross-tab')});
setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)syncAll({reason:'interval'}).catch(()=>{})},5*60*1000);
const reloadToast=sessionStorage.getItem('everflow-408-question-cloud-toast');if(reloadToast){sessionStorage.removeItem('everflow-408-question-cloud-toast');setTimeout(()=>window.EveraUI?.toast?.(reloadToast,{type:'success',title:'题库云同步',duration:3200}),450)}
setTimeout(()=>syncAll({reason:'boot'}).catch(()=>{}),350);
