(()=>{
  const store=window.EveraStore;
  if(!store||store.__questionBackupV2)return;

  const ZHENTI={wall:'everflow-408-zhenti-wall-v1',srs:'everflow-408-srs-v1',error:'everflow-408-srs-error-v1',reset:'everflow-408-zhenti-reset-at-v1'};
  const RELAX={records:'everflow-408-relax1000-records-v1',srs:'everflow-408-relax-srs-v1',seen:'relax-seen',mistakes:'relax-mistakes',everWrong:'relax-ever-wrong',bookmarks:'relax-bookmarks',reset:'everflow-408-relax-cloud-reset-at-v1',clocks:'everflow-408-relax-cloud-clocks-v1'};
  const emptySrs=()=>({version:1,settings:{dailyNew:20,targetRetention:.9},cards:{},daily:{}});
  const emptyError=()=>({version:1,cards:{},daily:{}});
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  const array=v=>Array.isArray(v)?v:[];
  const readJson=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}};
  const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
  const readText=key=>{try{return localStorage.getItem(key)||''}catch{return''}};
  const writeText=(key,value)=>{try{if(value)localStorage.setItem(key,String(value));else localStorage.removeItem(key)}catch{}};
  const isoTime=value=>{const t=new Date(value||0).getTime();return Number.isFinite(t)?t:0};
  const nowIso=()=>new Date().toISOString();
  const idKey=value=>String(value??'');
  const newer=(local,remote,key='updatedAt')=>{if(!local)return remote||null;if(!remote)return local||null;return isoTime(local?.[key])>=isoTime(remote?.[key])?local:remote};
  const maxNumbers=(a={},b={})=>{const out={...a,...b};for(const key of new Set([...Object.keys(a||{}),...Object.keys(b||{})]))if(typeof a?.[key]==='number'||typeof b?.[key]==='number')out[key]=Math.max(Number(a?.[key]||0),Number(b?.[key]||0));return out};

  function mergeSrs(local={},remote={}){
    const cards={};
    for(const key of new Set([...Object.keys(remote?.cards||{}),...Object.keys(local?.cards||{})]))cards[key]=newer(local?.cards?.[key],remote?.cards?.[key],'lastReviewAt')||{};
    const daily={};
    for(const day of new Set([...Object.keys(remote?.daily||{}),...Object.keys(local?.daily||{})]))daily[day]=maxNumbers(remote?.daily?.[day]||{},local?.daily?.[day]||{});
    return{version:Math.max(Number(remote?.version||1),Number(local?.version||1)),settings:{...(remote?.settings||{}),...(local?.settings||{})},cards,daily};
  }
  function mergeError(local={},remote={}){
    const cards={};
    for(const key of new Set([...Object.keys(remote?.cards||{}),...Object.keys(local?.cards||{})]))cards[key]=newer(local?.cards?.[key],remote?.cards?.[key],'updatedAt')||{};
    const daily={};
    for(const day of new Set([...Object.keys(remote?.daily||{}),...Object.keys(local?.daily||{})]))daily[day]=maxNumbers(remote?.daily?.[day]||{},local?.daily?.[day]||{});
    return{version:Math.max(Number(remote?.version||1),Number(local?.version||1)),cards,daily};
  }
  function trueSnapshot(){return{schema:'everflow-408-zhenti-backup-v2',resetAt:readText(ZHENTI.reset)||null,wall:object(readJson(ZHENTI.wall,{})),srs:object(readJson(ZHENTI.srs,emptySrs())),error:object(readJson(ZHENTI.error,emptyError()))}}
  function mergeWall(local={},remote={}){const out={};for(const key of new Set([...Object.keys(remote||{}),...Object.keys(local||{})]))out[key]=newer(local?.[key],remote?.[key])||{};return out}
  function mergeTrue(local,remote){
    if(!remote)return local;
    const lt=isoTime(local?.resetAt),rt=isoTime(remote?.resetAt);
    if(lt>rt)return local;if(rt>lt)return remote;
    return{schema:'everflow-408-zhenti-backup-v2',resetAt:local?.resetAt||remote?.resetAt||null,wall:mergeWall(local?.wall||{},remote?.wall||{}),srs:mergeSrs(local?.srs||emptySrs(),remote?.srs||emptySrs()),error:mergeError(local?.error||emptyError(),remote?.error||emptyError())};
  }
  function applyTrue(s){writeText(ZHENTI.reset,s?.resetAt||'');writeJson(ZHENTI.wall,object(s?.wall));writeJson(ZHENTI.srs,object(s?.srs));writeJson(ZHENTI.error,object(s?.error))}

  function ensureRelaxClocks(){
    const clocks=object(readJson(RELAX.clocks,{})),records=object(readJson(RELAX.records,{})),fallback=nowIso();let changed=false;
    const ids=new Set([...Object.keys(records),...array(readJson(RELAX.seen,[])).map(idKey),...array(readJson(RELAX.mistakes,[])).map(idKey),...array(readJson(RELAX.everWrong,[])).map(idKey),...array(readJson(RELAX.bookmarks,[])).map(idKey)]);
    for(const id of ids)if(!clocks[id]){clocks[id]=records[id]?.updatedAt||fallback;changed=true}
    if(changed)writeJson(RELAX.clocks,clocks);return clocks;
  }
  function relaxSnapshot(){return{schema:'everflow-408-relax-backup-v2',capturedAt:nowIso(),resetAt:readText(RELAX.reset)||null,records:object(readJson(RELAX.records,{})),srs:object(readJson(RELAX.srs,emptySrs())),seen:array(readJson(RELAX.seen,[])),mistakes:array(readJson(RELAX.mistakes,[])),everWrong:array(readJson(RELAX.everWrong,[])),bookmarks:array(readJson(RELAX.bookmarks,[])),clocks:ensureRelaxClocks()}}
  function normalizeRelax(snapshot={}){
    const records=object(snapshot.records),clocks=object(snapshot.clocks),sets={seen:new Set(array(snapshot.seen).map(idKey)),mistakes:new Set(array(snapshot.mistakes).map(idKey)),everWrong:new Set(array(snapshot.everWrong).map(idKey)),bookmarks:new Set(array(snapshot.bookmarks).map(idKey))};
    const ids=new Set([...Object.keys(records),...Object.keys(clocks),...sets.seen,...sets.mistakes,...sets.everWrong,...sets.bookmarks]),out={};
    for(const id of ids){const rec={...(records[id]||{})},updatedAt=rec.updatedAt||clocks[id]||snapshot.capturedAt||new Date(0).toISOString();out[id]={rec,updatedAt,seen:Boolean(rec.answer)||sets.seen.has(id),wrong:rec.correct===false||sets.mistakes.has(id),everWrong:sets.everWrong.has(id)||rec.correct===false||sets.mistakes.has(id),favorite:Boolean(rec.favorite)||sets.bookmarks.has(id)}}
    return out;
  }
  function rebuildRelax(normalized,srs,resetAt){
    const records={},seen=[],mistakes=[],everWrong=[],bookmarks=[],clocks={};
    for(const [id,state] of Object.entries(normalized)){const rec={...(state.rec||{})};if(state.favorite)rec.favorite=true;else delete rec.favorite;clocks[id]=state.updatedAt||nowIso();if(!rec.updatedAt&&Object.keys(rec).length)rec.updatedAt=clocks[id];if(Object.keys(rec).some(key=>key!=='updatedAt'))records[id]=rec;if(state.seen)seen.push(id);if(state.wrong)mistakes.push(id);if(state.everWrong)everWrong.push(id);if(state.favorite)bookmarks.push(id)}
    return{schema:'everflow-408-relax-backup-v2',capturedAt:nowIso(),resetAt:resetAt||null,records,srs:srs||emptySrs(),seen,mistakes,everWrong,bookmarks,clocks};
  }
  function mergeRelax(local,remote){
    if(!remote)return local;
    const lt=isoTime(local?.resetAt),rt=isoTime(remote?.resetAt),resetAt=lt>=rt?local?.resetAt:remote?.resetAt,resetTime=Math.max(lt,rt);let left=normalizeRelax(local),right=normalizeRelax(remote);
    if(resetTime){left=Object.fromEntries(Object.entries(left).filter(([,s])=>isoTime(s.updatedAt)>resetTime));right=Object.fromEntries(Object.entries(right).filter(([,s])=>isoTime(s.updatedAt)>resetTime))}
    const merged={};for(const id of new Set([...Object.keys(right),...Object.keys(left)]))merged[id]=newer(left[id],right[id])||left[id]||right[id];
    const srs=lt>rt?(local.srs||emptySrs()):rt>lt?(remote.srs||emptySrs()):mergeSrs(local.srs||emptySrs(),remote.srs||emptySrs());
    return rebuildRelax(merged,srs,resetAt);
  }
  function applyRelax(s){writeText(RELAX.reset,s?.resetAt||'');writeJson(RELAX.records,object(s?.records));writeJson(RELAX.srs,object(s?.srs));writeJson(RELAX.seen,array(s?.seen));writeJson(RELAX.mistakes,array(s?.mistakes));writeJson(RELAX.everWrong,array(s?.everWrong));writeJson(RELAX.bookmarks,array(s?.bookmarks));writeJson(RELAX.clocks,object(s?.clocks))}

  const baseExport=store.exportAll.bind(store),baseImport=store.importAll.bind(store);
  store.exportAll=async(...args)=>{const base=await baseExport(...args);return{...base,schema:'everflow-study-backup-v3',questionBanks:{schema:'everflow-question-local-backup-v2',zhenti:trueSnapshot(),relax1000:relaxSnapshot()}}};
  store.importAll=async(payload={})=>{
    const result=await baseImport(payload);
    const q=payload?.questionBanks;
    if(q&&typeof q==='object'){
      if(q.zhenti)applyTrue(mergeTrue(trueSnapshot(),q.zhenti));
      if(q.relax1000)applyRelax(mergeRelax(relaxSnapshot(),q.relax1000));
      document.dispatchEvent(new CustomEvent('everflow:zhenti-records-change',{detail:{source:'local-backup-import'}}));
      document.dispatchEvent(new CustomEvent('everflow:relax-records-change',{detail:{source:'local-backup-import'}}));
      document.dispatchEvent(new CustomEvent('everflow:question-backup-import',{detail:{zhenti:Boolean(q.zhenti),relax1000:Boolean(q.relax1000)}}));
    }
    return result;
  };
  store.__questionBackupV2=true;
  window.EveraQuestionLocalBackup={version:2,snapshot:()=>({zhenti:trueSnapshot(),relax1000:relaxSnapshot()})};
})();
