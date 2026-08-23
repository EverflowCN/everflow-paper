import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm';

(()=>{
  if(document.body?.dataset?.view!=='zhenti')return;

  const cfg=window.EVERFLOW_CLOUD||{};
  const WALL_KEY='everflow-408-zhenti-wall-v1';
  const SRS_KEY='everflow-408-srs-v1';
  const ERROR_KEY='everflow-408-srs-error-v1';
  const META_KEY='everflow-408-zhenti-cloud-meta-v1';
  const DEVICE_KEY='everflow-408-device-id-v1';
  const SCOPE='snapshot:v1';
  const TABLE='zhenti_sync_states';
  const SYNC_INTERVAL=30000;
  const WATCH_INTERVAL=2500;

  function readJSON(key,fallback){
    try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?v:fallback}catch{return fallback}
  }
  function writeJSON(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function isoTime(v){const t=new Date(v||0).getTime();return Number.isFinite(t)?t:0}
  function maxNumbers(a={},b={}){
    const out={...a,...b};
    for(const k of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){
      if(typeof a?.[k]==='number'||typeof b?.[k]==='number')out[k]=Math.max(Number(a?.[k]||0),Number(b?.[k]||0));
    }
    return out;
  }
  function mergeByTime(local,remote,timeKey){
    if(!local)return remote||null;if(!remote)return local||null;
    return isoTime(local?.[timeKey])>=isoTime(remote?.[timeKey])?local:remote;
  }
  function mergeWall(local={},remote={}){
    const out={};
    for(const key of new Set([...Object.keys(remote||{}),...Object.keys(local||{})])){
      const l=local?.[key],r=remote?.[key];
      if(!l)out[key]=r;else if(!r)out[key]=l;else out[key]=mergeByTime(l,r,'updatedAt');
    }
    return out;
  }
  function mergeSrs(local={},remote={}){
    const cards={};
    for(const key of new Set([...Object.keys(remote?.cards||{}),...Object.keys(local?.cards||{})])){
      const l=local?.cards?.[key],r=remote?.cards?.[key];
      cards[key]=mergeByTime(l,r,'lastReviewAt')||{};
    }
    const daily={};
    for(const day of new Set([...Object.keys(remote?.daily||{}),...Object.keys(local?.daily||{})]))daily[day]=maxNumbers(remote?.daily?.[day]||{},local?.daily?.[day]||{});
    return {
      version:Math.max(Number(remote?.version||1),Number(local?.version||1)),
      settings:{...(remote?.settings||{}),...(local?.settings||{})},
      cards,
      daily
    };
  }
  function mergeError(local={},remote={}){
    const cards={};
    for(const key of new Set([...Object.keys(remote?.cards||{}),...Object.keys(local?.cards||{})])){
      const l=local?.cards?.[key],r=remote?.cards?.[key];
      cards[key]=mergeByTime(l,r,'updatedAt')||{};
    }
    const daily={};
    for(const day of new Set([...Object.keys(remote?.daily||{}),...Object.keys(local?.daily||{})]))daily[day]=maxNumbers(remote?.daily?.[day]||{},local?.daily?.[day]||{});
    return {version:Math.max(Number(remote?.version||1),Number(local?.version||1)),cards,daily};
  }
  function snapshot(){
    return {
      schema:'everflow-408-zhenti-cloud-v1',
      wall:readJSON(WALL_KEY,{}),
      srs:readJSON(SRS_KEY,{version:1,settings:{dailyNew:20,targetRetention:.9},cards:{},daily:{}}),
      error:readJSON(ERROR_KEY,{version:1,cards:{},daily:{}})
    };
  }
  function mergeSnapshot(local,remote){
    if(!remote)return local;
    return {
      schema:'everflow-408-zhenti-cloud-v1',
      wall:mergeWall(local?.wall||{},remote?.wall||{}),
      srs:mergeSrs(local?.srs||{},remote?.srs||{}),
      error:mergeError(local?.error||{},remote?.error||{})
    };
  }
  function applySnapshot(data){
    if(!data||typeof data!=='object')return;
    writeJSON(WALL_KEY,data.wall||{});
    writeJSON(SRS_KEY,data.srs||{version:1,settings:{dailyNew:20,targetRetention:.9},cards:{},daily:{}});
    writeJSON(ERROR_KEY,data.error||{version:1,cards:{},daily:{}});
  }
  function fingerprint(data=snapshot()){
    try{return JSON.stringify(data)}catch{return''}
  }
  function deviceId(){
    let id=localStorage.getItem(DEVICE_KEY)||'';
    if(!id){id=(crypto.randomUUID?.()||`dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);localStorage.setItem(DEVICE_KEY,id)}
    return id;
  }
  function meta(){return readJSON(META_KEY,{})}
  function saveMeta(patch){writeJSON(META_KEY,{...meta(),...patch})}

  const style=document.createElement('style');style.id='zhenti-cloud-sync-style';style.textContent=`
    .zhenti-cloud-status{margin-left:auto;display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:0 11px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--muted);font:800 10px/1 system-ui;white-space:nowrap;cursor:pointer}.zhenti-cloud-status i{width:7px;height:7px;border-radius:50%;background:#a8adb8}.zhenti-cloud-status.synced{color:#15966e}.zhenti-cloud-status.synced i{background:#20b989}.zhenti-cloud-status.syncing{color:#8a6800}.zhenti-cloud-status.syncing i{background:#f0b72d;animation:zhentiCloudPulse 1s ease-in-out infinite}.zhenti-cloud-status.error{color:var(--red)}.zhenti-cloud-status.error i{background:var(--red)}@keyframes zhentiCloudPulse{50%{opacity:.35}}@media(max-width:720px){.zhenti-cloud-status{position:fixed;right:10px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:90;min-width:34px;width:34px;height:34px;padding:0;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.12)}.zhenti-cloud-status span{display:none}.srs-home:fullscreen~.zhenti-cloud-status,body.srs-immersive-fallback .zhenti-cloud-status{display:none!important}}
  `;document.head.appendChild(style);

  const status=document.createElement('button');status.type='button';status.className='zhenti-cloud-status';status.innerHTML='<i></i><span>检查云同步…</span>';status.title='真题墙云同步';
  const bar=document.querySelector('.wall-subject-bar');(bar||document.body).appendChild(status);
  function setStatus(kind,text,title=text){status.className=`zhenti-cloud-status ${kind||''}`.trim();status.querySelector('span').textContent=text;status.title=title}

  if(!cfg.url||!cfg.publishableKey){setStatus('','本地模式','未配置云同步');return}
  const client=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let syncing=false,scheduled=null,lastSeenFingerprint=fingerprint();

  async function currentUser(){const {data,error}=await client.auth.getUser();if(error)return null;return data?.user||null}
  async function sync({manual=false}={}){
    if(syncing||navigator.onLine===false)return false;
    const user=await currentUser();
    if(!user){setStatus('','本地模式','登录账户后可自动同步真题墙数据');return false}
    syncing=true;setStatus('syncing','同步中…','正在同步真题墙数据');
    try{
      const local=snapshot();
      const {data:remoteRow,error:readError}=await client.from(TABLE).select('payload,updated_at,device_id').eq('user_id',user.id).eq('scope_key',SCOPE).maybeSingle();
      if(readError)throw readError;
      const merged=mergeSnapshot(local,remoteRow?.payload||null);
      const localBefore=fingerprint(local),mergedPrint=fingerprint(merged);
      if(mergedPrint!==localBefore){applySnapshot(merged);document.dispatchEvent(new CustomEvent('everflow:zhenti-cloud-merged',{detail:{userId:user.id}}))}
      const now=new Date().toISOString();
      const {error:writeError}=await client.from(TABLE).upsert({user_id:user.id,scope_key:SCOPE,payload:merged,device_id:deviceId(),updated_at:now},{onConflict:'user_id,scope_key'});
      if(writeError)throw writeError;
      lastSeenFingerprint=mergedPrint;saveMeta({userId:user.id,lastSyncAt:now,lastFingerprint:mergedPrint});
      setStatus('synced','已同步',`真题墙已同步 · ${new Date(now).toLocaleString('zh-CN',{hour12:false})}`);
      localStorage.setItem('everflow-last-zhenti-cloud-sync',JSON.stringify({ok:true,at:now,userId:user.id}));
      document.dispatchEvent(new CustomEvent('everflow:zhenti-cloud-sync',{detail:{ok:true,at:now,userId:user.id,manual}}));
      return true;
    }catch(err){console.error('Everflow zhenti cloud sync failed',err);setStatus('error','同步失败',`同步失败：${err?.message||err}`);document.dispatchEvent(new CustomEvent('everflow:zhenti-cloud-error',{detail:{message:err?.message||String(err)}}));return false}
    finally{syncing=false}
  }
  function schedule(delay=1000){clearTimeout(scheduled);scheduled=setTimeout(()=>sync().catch(()=>{}),delay)}

  status.addEventListener('click',async()=>{
    const user=await currentUser();
    if(!user){window.EveraUI?.toast?.('登录账户后即可在电脑、平板和手机间同步真题墙数据。',{type:'info',title:'当前为本地模式',duration:4200});setTimeout(()=>{location.href='/account/'},650);return}
    await sync({manual:true});window.EveraUI?.toast?.('真题墙数据已与云端合并。',{type:'success',title:'同步完成'});
  });

  client.auth.onAuthStateChange((event,session)=>{
    if(session?.user){setStatus('syncing','同步中…');setTimeout(()=>sync().catch(()=>{}),0)}else setStatus('','本地模式','未登录：数据仅保存在当前设备');
  });
  addEventListener('online',()=>schedule(300));
  addEventListener('offline',()=>setStatus('','离线','当前离线，恢复网络后自动同步'));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(350)});
  addEventListener('storage',e=>{if([WALL_KEY,SRS_KEY,ERROR_KEY].includes(e.key))schedule(600)});

  setInterval(()=>{
    if(document.visibilityState!=='visible')return;
    const nowPrint=fingerprint();
    if(nowPrint!==lastSeenFingerprint){lastSeenFingerprint=nowPrint;schedule(900)}
  },WATCH_INTERVAL);
  setInterval(()=>{if(document.visibilityState==='visible')sync().catch(()=>{})},SYNC_INTERVAL);

  (async()=>{
    const user=await currentUser();
    if(user)await sync();else setStatus('','本地模式','未登录：数据仅保存在当前设备');
  })().catch(()=>setStatus('error','同步失败'));
})();
