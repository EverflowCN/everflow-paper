const gate=document.querySelector('#englishGate'),title=document.querySelector('#englishGateTitle'),copy=document.querySelector('#englishGateCopy'),actions=document.querySelector('#englishGateActions'),root=document.querySelector('[data-english-root]'),syncEl=document.querySelector('#englishSyncStatus'),syncText=document.querySelector('#englishSyncText');
const LEGACY_STATE_KEY='eng2_v8',META_SUFFIX=':meta',PRACTICE_ID='english2-writing-23plus-v8',ITEM_ID='state';
let frame=null,client=null,cloud=null,authListener=null,currentUser=null,scopeKey='',saveTimer=null,syncRunning=false,syncAgain=false,pendingCloud=false,lastState={};

const nowIso=()=>new Date().toISOString();
const timeMs=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:0};
function readJson(key,fallback={}){try{const x=JSON.parse(localStorage.getItem(key)||'null');return x&&typeof x==='object'?x:fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function safeJson(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')}
function stateHasData(value){if(!value||typeof value!=='object')return false;return Boolean((value.errors?.length)||Object.keys(value.themes||{}).length||Object.keys(value.memorized||{}).length||Object.keys(value.essays||{}).some(k=>String(value.essays[k]||'').trim()))}
function setSync(label,type='idle'){
  if(!syncEl||!syncText)return;
  syncEl.hidden=false;syncEl.dataset.state=type;syncText.textContent=label;
}
function locked(message='页面不存在或当前账号没有访问权限。'){
  clearTimeout(saveTimer);frame?.remove();frame=null;gate.hidden=false;title.textContent='英语写作训练';copy.textContent=message;actions.hidden=false;setSync('未连接','error');
}
function localKeys(userId){const base=LEGACY_STATE_KEY+':'+userId;return {state:base,meta:base+META_SUFFIX}}
function migrateLegacy(userId){
  const keys=localKeys(userId);let scoped=readJson(keys.state,null);
  if(scoped)return keys;
  const legacy=readJson(LEGACY_STATE_KEY,null);
  if(legacy&&stateHasData(legacy)){
    const at=nowIso();writeJson(keys.state,legacy);writeJson(keys.meta,{updatedAt:at,migratedFrom:'legacy'});
  }
  return keys;
}
function readLocal(userId){
  const keys=migrateLegacy(userId),state=readJson(keys.state,{});
  const meta=readJson(keys.meta,{updatedAt:''});
  return {keys,state,updatedAt:String(meta.updatedAt||'')};
}
function saveLocal(value,updatedAt=nowIso()){
  if(!currentUser||!scopeKey||!value||typeof value!=='object')return updatedAt;
  lastState=value;writeJson(scopeKey,value);writeJson(scopeKey+META_SUFFIX,{updatedAt,userId:currentUser.id});
  return updatedAt;
}
function parseRemote(row){
  if(!row?.note)return null;
  try{
    const payload=JSON.parse(row.note);
    if(!payload||payload.version!==1||!payload.state||typeof payload.state!=='object')return null;
    return {state:payload.state,updatedAt:String(payload.updatedAt||row.updated_at||''),rowUpdatedAt:String(row.updated_at||'')};
  }catch{return null}
}
async function getRemote(){
  if(!cloud)return null;
  const rows=await cloud.listPracticeStates(PRACTICE_ID);
  return parseRemote(rows.find(r=>r.item_id===ITEM_ID)||null);
}
async function pushCloud(value,updatedAt){
  if(!cloud||!currentUser||!value||typeof value!=='object')return;
  const payload=JSON.stringify({version:1,updatedAt,state:value});
  if(payload.length>1500000)throw new Error('state_too_large');
  await cloud.savePracticeState({
    practice_id:PRACTICE_ID,item_id:ITEM_ID,subject:'english',status:'todo',
    note:payload,last_attempt_at:updatedAt
  });
}
async function flushCloud(){
  clearTimeout(saveTimer);
  if(!pendingCloud||!navigator.onLine){if(!navigator.onLine)setSync('离线 · 已存本机','offline');return}
  if(syncRunning){syncAgain=true;return}
  syncRunning=true;const local=readLocal(currentUser.id);
  try{
    setSync('正在同步…','syncing');
    await pushCloud(local.state,local.updatedAt||nowIso());
    pendingCloud=false;setSync('云端已同步','success');
  }catch(e){
    console.warn('English writing cloud save failed',e);
    pendingCloud=true;setSync('云端失败 · 本机已保存','error');
  }finally{
    syncRunning=false;
    if(syncAgain){syncAgain=false;scheduleCloud(120)}
  }
}
function scheduleCloud(delay=650){pendingCloud=true;clearTimeout(saveTimer);saveTimer=setTimeout(flushCloud,delay)}
function saveState(value){
  if(!value||typeof value!=='object')return;
  let raw='';try{raw=JSON.stringify(value)}catch{return}
  if(raw.length>1500000){setSync('内容过大 · 仅保留本机','error');return}
  const at=saveLocal(value);setSync('已存本机 · 等待同步','pending');scheduleCloud(650);
}
async function resolveInitialState(userId){
  const local=readLocal(userId);let remote=null;
  try{remote=await getRemote()}catch(e){console.warn('English writing cloud load failed',e)}
  if(remote&&timeMs(remote.updatedAt)>timeMs(local.updatedAt)){
    saveLocal(remote.state,remote.updatedAt);pendingCloud=false;setSync('已从云端恢复','success');return remote.state;
  }
  if(stateHasData(local.state)){
    lastState=local.state;
    if(!remote||timeMs(local.updatedAt)>timeMs(remote.updatedAt)){pendingCloud=true;scheduleCloud(80);setSync(remote?'本机较新 · 正在上传':'首次上传云端…','syncing')}
    else setSync('云端已同步','success');
    return local.state;
  }
  if(remote){
    saveLocal(remote.state,remote.updatedAt);pendingCloud=false;setSync('已从云端恢复','success');return remote.state;
  }
  const empty={errors:[],themes:{},memorized:{},essays:{}};
  saveLocal(empty,nowIso());pendingCloud=true;scheduleCloud(120);setSync('正在建立云端进度…','syncing');return empty;
}
async function boot(){
  try{
    gate.hidden=false;title.textContent='正在验证管理员身份';copy.textContent='英语写作训练内容仅管理员可见。验证通过后会自动读取本机与云端进度。';actions.hidden=true;setSync('正在连接云端…','syncing');
    await import('/assets/js/cloud-config.js?v=20260924-2');
    await import('/assets/js/cloud.js?v=20260924-2');
    cloud=window.EveraCloud;client=await cloud?.ready;if(!client)throw Error('cloud_unavailable');
    const user=await cloud.getUser({fresh:true});const role=String(user?.app_metadata?.role||'').toLowerCase();
    if(!user)return locked('请先登录网站账号，再回到这里重新验证。');
    if(!['owner','admin'].includes(role))return locked();
    currentUser=user;scopeKey=localKeys(user.id).state;
    const [fn,initial]=await Promise.all([
      client.functions.invoke('owner-english-writing',{body:{action:'boot'}}),
      resolveInitialState(user.id)
    ]);
    const result=fn.data,fnError=fn.error;
    if(fnError||!result?.html)throw Object.assign(Error('function_failed'),{status:fnError?.context?.status});
    const injected=result.html.replace('__ENGLISH_STATE__',()=>safeJson(initial));
    frame?.remove();frame=document.createElement('iframe');frame.className='english-frame';frame.title='英语二写作 23+ 训练系统';frame.setAttribute('sandbox','allow-scripts allow-downloads');frame.srcdoc=injected;root.appendChild(frame);gate.hidden=true;
    if(!authListener)authListener=client.auth.onAuthStateChange((event,session)=>{
      const nextRole=String(session?.user?.app_metadata?.role||'').toLowerCase();
      if(event==='SIGNED_OUT'||(session?.user&&!['owner','admin'].includes(nextRole)))locked();
    });
  }catch(e){
    console.error('English writing boot failed',e);
    locked(e?.status===404?'页面不存在或当前账号没有访问权限。':'暂时无法打开英语写作训练，请稍后重新验证。');
  }
}
window.addEventListener('message',event=>{
  if(!frame||event.source!==frame.contentWindow)return;
  const data=event.data;if(data?.type==='evera-english-writing-save')saveState(data.state);
});
window.addEventListener('online',()=>{if(pendingCloud)scheduleCloud(80);else setSync('在线 · 云端已同步','success')});
window.addEventListener('offline',()=>setSync('离线 · 修改将保存在本机','offline'));
document.querySelector('#englishRetry').addEventListener('click',boot);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden||!client)return;
  cloud?.getUser?.({fresh:true}).then(user=>{
    const role=String(user?.app_metadata?.role||'').toLowerCase();
    if(!user||!['owner','admin'].includes(role))locked();
    else if(pendingCloud)scheduleCloud(120);
  }).catch(()=>locked('登录状态验证失败，请重新进入。'));
});
window.addEventListener('beforeunload',()=>{if(pendingCloud)flushCloud()});
boot();
