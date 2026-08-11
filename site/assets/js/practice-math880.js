(()=>{
'use strict';

const PRACTICE_ID='math2-lilin880-2027';
const DATA_URL='/data/practice/math2-lilin880-2027.json';
const K_DONE='everflow-math880-done-v3';
const K_META='everflow-math880-meta-v3';
const K_NOTE='everflow-math880-note-v3';
const K_NOTE_META='everflow-math880-note-meta-v3';
const LEGACY_DONE='ll880_math2_checkin_v1';
const LEGACY_NOTE='ll880_math2_notes_v1';
const SCOPE_KEY=`everflow-practice-scope:${PRACTICE_ID}`;
const SNAPSHOT_PREFIX=`everflow-practice-snapshot:${PRACTICE_ID}:`;
const TIERS=['required','optional','hard'];
const TIER_NAMES={required:'必做题',optional:'选择做',hard:'特难题'};

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nowIso=()=>new Date().toISOString();
const timeMs=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:0};
const dateStr=(d=new Date())=>{const x=d instanceof Date?d:new Date(d);if(Number.isNaN(x.getTime()))return'';return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};

let catalog=null;
let done={};
let meta={};
let globalNote='';
let noteMeta='';
let syncRunning=false;
let syncAgain=false;
let syncTimer=null;

function itemId(ci,tier,group,item){return `c${ci}|${tier}|${group}|${item}`}
function snapshotKey(scope){return SNAPSHOT_PREFIX+scope}
function emptySnapshot(){return {done:{},meta:{},globalNote:'',noteMeta:''}}
function snapshotPayload(){return {done,meta,globalNote,noteMeta}}

function saveSnapshot(scope){if(!scope)return;try{localStorage.setItem(snapshotKey(scope),JSON.stringify(snapshotPayload()))}catch{}}
function hasSnapshot(scope){try{return Boolean(localStorage.getItem(snapshotKey(scope)))}catch{return false}}
function restoreSnapshot(scope){
  try{
    const raw=localStorage.getItem(snapshotKey(scope));
    if(!raw)return emptySnapshot();
    const x=JSON.parse(raw)||{};
    return {done:x.done&&typeof x.done==='object'?x.done:{},meta:x.meta&&typeof x.meta==='object'?x.meta:{},globalNote:typeof x.globalNote==='string'?x.globalNote:'',noteMeta:typeof x.noteMeta==='string'?x.noteMeta:''};
  }catch{return emptySnapshot()}
}
function applySnapshot(x){done=x.done||{};meta=x.meta||{};globalNote=x.globalNote||'';noteMeta=x.noteMeta||''}
function saveLocal(){
  localStorage.setItem(K_DONE,JSON.stringify(done));
  localStorage.setItem(K_META,JSON.stringify(meta));
  localStorage.setItem(K_NOTE,globalNote);
  localStorage.setItem(K_NOTE_META,noteMeta||'');
  saveSnapshot(localStorage.getItem(SCOPE_KEY)||'guest');
}
function migrateLocal(){
  try{done=JSON.parse(localStorage.getItem(K_DONE)||'null');meta=JSON.parse(localStorage.getItem(K_META)||'null')}catch{done=null;meta=null}
  if(!done||typeof done!=='object'){
    done={};
    try{
      const legacy=JSON.parse(localStorage.getItem(LEGACY_DONE)||'{}')||{},at=nowIso();
      for(const [id,value] of Object.entries(legacy))if(value)done[id]={date:dateStr(),ts:Date.now(),updatedAt:at};
    }catch{}
  }
  if(!meta||typeof meta!=='object')meta={};
  const migratedAt=nowIso();
  for(const [id,value] of Object.entries(done)){
    const at=value?.updatedAt||migratedAt;
    if(value&&typeof value==='object'&&!value.updatedAt)value.updatedAt=at;
    if(!meta[id])meta[id]=at;
  }
  globalNote=localStorage.getItem(K_NOTE);
  if(globalNote===null)globalNote=localStorage.getItem(LEGACY_NOTE)||'';
  noteMeta=localStorage.getItem(K_NOTE_META)||'';
  if(globalNote&&!noteMeta)noteMeta=migratedAt;
  if(!localStorage.getItem(SCOPE_KEY))localStorage.setItem(SCOPE_KEY,'guest');
  saveLocal();
}
function bindScope(target){
  target=target||'guest';
  const bound=localStorage.getItem(SCOPE_KEY)||'guest';
  if(bound===target)return false;
  saveSnapshot(bound);
  if(target!=='guest'&&bound==='guest'&&!hasSnapshot(target))saveSnapshot(target);else applySnapshot(restoreSnapshot(target));
  localStorage.setItem(SCOPE_KEY,target);saveLocal();return true;
}

function allItems(){
  if(!catalog)return[];
  const out=[];
  catalog.chapters.forEach((chapter,ci)=>{
    for(const tier of TIERS)for(const [group,items] of Object.entries(chapter[tier]||{}))for(const item of items)out.push({id:itemId(ci,tier,group,item),ci,chapter:chapter.chapter,tier,group,item});
  });
  return out;
}
function allIdsForChapter(ci){return allItems().filter(x=>x.ci===ci).map(x=>x.id)}
function isDone(id){return Boolean(done[id])}
function completionDate(id){const v=done[id];if(!v)return'';if(typeof v==='object'&&v.date)return v.date;const d=new Date(v?.updatedAt||v);return Number.isNaN(d.getTime())?'':dateStr(d)}
function calcStreak(){
  const dates=[...new Set(Object.keys(done).map(completionDate).filter(Boolean))].sort().reverse();if(!dates.length)return 0;
  const today=new Date();today.setHours(0,0,0,0);const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
  let cursor=dates[0]===dateStr(today)?today:(dates[0]===dateStr(yesterday)?yesterday:null);if(!cursor)return 0;
  const set=new Set(dates);let count=0;while(set.has(dateStr(cursor))){count++;cursor.setDate(cursor.getDate()-1)}return count;
}
function setMessage(text,type=''){const el=$('[data-sync-message]');if(!el)return;el.textContent=text;el.className=type||''}
function updateStats(){
  const items=allItems(),ids=items.map(x=>x.id),completed=ids.filter(isDone).length,total=ids.length,rate=total?Math.round(completed*100/total):0;
  const chapterDone=catalog.chapters.filter((_,ci)=>{const cids=allIdsForChapter(ci);return cids.length&&cids.every(isDone)}).length;
  const today=dateStr(),todayCount=Object.keys(done).filter(id=>completionDate(id)===today).length;
  $('[data-kpi-total]').textContent=total;$('[data-kpi-done]').textContent=completed;$('[data-kpi-rate]').textContent=rate+'%';$('[data-kpi-chapters]').textContent=`${chapterDone}/${catalog.chapters.length}`;$('[data-kpi-today]').textContent=todayCount;$('[data-kpi-streak]').textContent=calcStreak()+' 天';$('[data-progress-text]').textContent=`${completed} / ${total}`;$('[data-progress-bar]').style.width=rate+'%';
}
function tierHtml(chapter,ci,tier){
  const groups=chapter[tier]||{};if(!Object.keys(groups).length)return'';
  const tierIds=Object.entries(groups).flatMap(([group,items])=>items.map(item=>itemId(ci,tier,group,item))),tierDone=tierIds.filter(isDone).length;
  const groupsHtml=Object.entries(groups).map(([group,items])=>{
    const ids=items.map(item=>itemId(ci,tier,group,item)),allChecked=ids.every(isDone);
    return `<section class="math880-group" data-group="${esc(group)}"><div class="math880-group-head"><strong>${esc(group)}</strong><button type="button" data-group-toggle data-ci="${ci}" data-tier="${tier}" data-group-name="${esc(group)}">${allChecked?'全部取消':'全部完成'}</button></div><div class="math880-chips">${items.map(item=>{const id=itemId(ci,tier,group,item),search=`${chapter.chapter} ${TIER_NAMES[tier]} ${group} ${item}`;return `<span class="math880-chip" data-search="${esc(search.toLowerCase())}"><input type="checkbox" id="${esc(id)}" data-item-id="${esc(id)}" ${isDone(id)?'checked':''}><label for="${esc(id)}">${esc(item)}</label></span>`}).join('')}</div></section>`;
  }).join('');
  return `<section class="math880-tier" data-tier="${tier}"><header class="math880-tier-head"><strong>${TIER_NAMES[tier]}</strong><span>${tierDone} / ${tierIds.length}</span></header><div class="math880-groups">${groupsHtml}</div></section>`;
}
function render(preserve=true){
  if(!catalog)return;
  const opened=preserve?new Set($$('.math880-chapter[open]').map(x=>Number(x.dataset.ci))):new Set([0,1]),host=$('[data-chapters]');
  host.innerHTML=catalog.chapters.map((chapter,ci)=>{const ids=allIdsForChapter(ci),count=ids.filter(isDone).length,pct=ids.length?Math.round(count*100/ids.length):0;return `<details class="math880-chapter" data-ci="${ci}" data-chapter="${esc(chapter.chapter)}" ${opened.has(ci)?'open':''}><summary><span class="math880-chevron"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></span><span class="math880-chapter-title"><strong>${esc(chapter.chapter)}</strong><span>${count} / ${ids.length} 已完成</span></span><span class="math880-chapter-progress"><span>${pct}%</span><span class="math880-mini"><i style="width:${pct}%"></i></span></span></summary><div class="math880-chapter-body">${TIERS.map(tier=>tierHtml(chapter,ci,tier)).join('')}</div></details>`}).join('');
  const note=$('[data-global-note]');if(note&&note.value!==globalNote)note.value=globalNote;updateStats();applyFilters();
}
function applyFilters(){
  const q=String($('[data-filter-search]')?.value||'').trim().toLowerCase(),tier=$('[data-filter-tier]')?.value||'all',unfinished=Boolean($('[data-filter-unfinished]')?.checked);
  $$('.math880-chapter').forEach(ch=>{let chapterVisible=false;ch.querySelectorAll('.math880-tier').forEach(t=>{const tierMatch=tier==='all'||t.dataset.tier===tier;let tierVisible=false;t.querySelectorAll('.math880-group').forEach(g=>{let groupVisible=false;g.querySelectorAll('.math880-chip').forEach(chip=>{const input=chip.querySelector('input'),textMatch=!q||chip.dataset.search.includes(q),unfinishedMatch=!unfinished||!input.checked,show=tierMatch&&textMatch&&unfinishedMatch;chip.classList.toggle('hidden',!show);if(show)groupVisible=true});g.classList.toggle('hidden',!groupVisible);if(groupVisible)tierVisible=true});t.classList.toggle('hidden',!(tierMatch&&tierVisible));if(tierMatch&&tierVisible)chapterVisible=true});ch.classList.toggle('hidden',!chapterVisible);if(q||unfinished||tier!=='all')ch.open=chapterVisible});
}
function markItem(id,value,at=nowIso()){if(value)done[id]={date:dateStr(at),ts:Date.parse(at)||Date.now(),updatedAt:at};else delete done[id];meta[id]=at}
function setItem(id,value){markItem(id,value);saveLocal();render();persistIds([id])}
function toggleGroup(ci,tier,group){const chapter=catalog.chapters[ci],items=chapter?.[tier]?.[group]||[],ids=items.map(item=>itemId(ci,tier,group,item)),value=!ids.every(isDone),at=nowIso();ids.forEach(id=>markItem(id,value,at));saveLocal();render();persistIds(ids)}

async function waitCloud(){for(let i=0;i<80;i++){if(window.EveraCloud?.listPracticeStates)return window.EveraCloud;await new Promise(r=>setTimeout(r,80))}return null}
function cloudInput(id){const local=done[id],at=meta[id]||local?.updatedAt||nowIso();return {practice_id:PRACTICE_ID,item_id:id,subject:'math2',status:local?'done':'todo',first_done_at:local?.updatedAt||null,last_attempt_at:at}}
async function saveBatch(cloud,inputs){if(!inputs.length)return[];if(cloud.savePracticeStates)return cloud.savePracticeStates(inputs);const results=[];let cursor=0;const worker=async()=>{while(cursor<inputs.length){const input=inputs[cursor++];results.push(await cloud.savePracticeState(input))}};await Promise.all(Array.from({length:Math.min(4,inputs.length)},worker));return results}
async function pushIds(cloud,ids){
  const valid=new Set(allItems().map(x=>x.id)),unique=[...new Set(ids)].filter(id=>meta[id]&&valid.has(id)),rows=[];
  for(let i=0;i<unique.length;i+=100){const chunk=unique.slice(i,i+100),saved=await saveBatch(cloud,chunk.map(cloudInput));rows.push(...saved);for(const r of saved||[])if(r?.item_id&&r?.updated_at)meta[r.item_id]=r.updated_at}
  saveLocal();return rows;
}
async function pushNote(cloud){if(!noteMeta)return null;const input={practice_id:PRACTICE_ID,item_id:'note:global',subject:'math2',status:'todo',note:globalNote,last_attempt_at:noteMeta},saved=await cloud.savePracticeState(input);if(saved?.updated_at)noteMeta=saved.updated_at;saveLocal();return saved}
async function persistIds(ids){
  const edits=ids.map(id=>({id,value:done[id]||null,at:meta[id]||nowIso()})),cloud=await waitCloud();if(!cloud)return;
  try{
    const user=await cloud.getUser?.();if(!user){bindScope('guest');setMessage('未登录 · 当前进度保存在本机');return}
    const switched=bindScope(user.id);
    if(switched){for(const edit of edits){if(timeMs(edit.at)>=timeMs(meta[edit.id])){if(edit.value)done[edit.id]=edit.value;else delete done[edit.id];meta[edit.id]=edit.at}}saveLocal();render()}
    setMessage(ids.length>1?`本机已保存 · 正在同步 ${ids.length} 项…`:'本机已保存 · 正在同步…');await pushIds(cloud,ids);setMessage('已保存本机并同步云端','success');
  }catch(e){console.warn('math880 sync failed',e);setMessage('已保存本机；云同步稍后重试','error')}
}
async function persistGlobalNote(){
  const edit={value:globalNote,at:noteMeta||nowIso()},cloud=await waitCloud();if(!cloud)return;
  try{const user=await cloud.getUser?.();if(!user){bindScope('guest');return}const switched=bindScope(user.id);if(switched&&timeMs(edit.at)>=timeMs(noteMeta)){globalNote=edit.value;noteMeta=edit.at;saveLocal();render()}await pushNote(cloud);setMessage('学习备注已同步','success')}catch(e){console.warn('math880 note sync failed',e);setMessage('备注已保存本机；云同步稍后重试','error')}
}
function applyRemote(r){
  if(r.item_id==='note:global'){if(!noteMeta||timeMs(r.updated_at)>timeMs(noteMeta)){globalNote=r.note||'';noteMeta=r.updated_at||'';return true}return false}
  const valid=new Set(allItems().map(x=>x.id));if(!valid.has(r.item_id))return false;
  const localAt=meta[r.item_id]||done[r.item_id]?.updatedAt||'';if(localAt&&timeMs(r.updated_at)<=timeMs(localAt))return false;
  if(r.status==='done'||r.status==='mastered'){const at=r.first_done_at||r.updated_at||nowIso();done[r.item_id]={date:dateStr(at),ts:Date.parse(at)||Date.now(),updatedAt:at}}else delete done[r.item_id];
  meta[r.item_id]=r.updated_at||nowIso();return true;
}
async function mergeCloud(){
  if(syncRunning){syncAgain=true;return}syncRunning=true;
  try{
    const cloud=await waitCloud();if(!cloud)return;const user=await cloud.getUser?.();
    if(!user){const switched=bindScope('guest');if(switched)render(false);setMessage('未登录 · 当前进度保存在本机');return}
    const switched=bindScope(user.id);if(switched){render(false);setMessage('已切换账户 · 正在载入该账户云端进度')}
    const rows=await cloud.listPracticeStates(PRACTICE_ID),remote=new Map(rows.map(r=>[r.item_id,r]));let changed=false;for(const r of rows)if(applyRemote(r))changed=true;if(changed){saveLocal();render()}
    const valid=new Set(allItems().map(x=>x.id)),pending=Object.keys(meta).filter(id=>{if(!valid.has(id))return false;const r=remote.get(id);return !r||timeMs(meta[id])>timeMs(r.updated_at)});
    if(pending.length)await pushIds(cloud,pending);
    const remoteNote=remote.get('note:global');if(noteMeta&&(!remoteNote||timeMs(noteMeta)>timeMs(remoteNote.updated_at)))await pushNote(cloud);
    saveLocal();render();setMessage(pending.length?`已登录 · 已合并并补传 ${pending.length} 项`:'已登录 · 本机与云端进度一致','success');
  }catch(e){console.warn('math880 merge failed',e);setMessage('云端同步失败，本机记录仍可使用','error')}
  finally{syncRunning=false;if(syncAgain){syncAgain=false;scheduleSync(120)}}
}
function scheduleSync(delay=250){clearTimeout(syncTimer);syncTimer=setTimeout(()=>mergeCloud(),delay)}

function exportProgress(){
  const state=Object.fromEntries(allItems().map(x=>[x.id,isDone(x.id)]).filter(([,v])=>v)),payload={app:'李林880题数学二带刷打卡表',version:3,practiceId:PRACTICE_ID,exportedAt:nowIso(),state,done,meta,notes:globalNote,noteMeta};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`李林880题_数学二_打卡进度_${dateStr()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);window.EveraUI?.toast?.('880题进度已导出',{type:'success'});
}
function importProgress(file){
  if(!file)return;const reader=new FileReader();
  reader.onload=()=>{try{
    const x=JSON.parse(reader.result),at=nowIso(),importedDone={};
    if(x.done&&typeof x.done==='object')Object.assign(importedDone,x.done);else if(x.state&&typeof x.state==='object'){for(const [id,value] of Object.entries(x.state))if(value)importedDone[id]={date:dateStr(),ts:Date.now(),updatedAt:at}}else throw new Error('格式不正确');
    done=importedDone;meta=x.meta&&typeof x.meta==='object'?x.meta:{};for(const id of Object.keys(done))meta[id]=meta[id]||done[id]?.updatedAt||at;
    if(x.practiceId===PRACTICE_ID||x.app==='李林880题数学二带刷打卡表')for(const item of allItems())if(!meta[item.id])meta[item.id]=at;
    if(typeof x.notes==='string'){globalNote=x.notes;noteMeta=x.noteMeta||at}
    saveLocal();render(false);window.EveraUI?.toast?.('进度已导入，正在同步云端',{type:'success'});scheduleSync(50);
  }catch(e){window.EveraUI?.toast?.('导入失败：'+e.message,{type:'error'})}$('[data-import-file]').value=''};reader.readAsText(file);
}
function resetAll(){if(!confirm('确定清空《李林880题》数学二的全部打卡和学习备注吗？云端记录也会同步清空。'))return;const at=nowIso();done={};for(const item of allItems())meta[item.id]=at;globalNote='';noteMeta=at;saveLocal();render(false);setMessage('本机已清空 · 正在同步云端…');scheduleSync(30)}
async function boot(){
  migrateLocal();
  try{const r=await fetch(DATA_URL+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('catalog_load_failed');catalog=await r.json();$('[data-global-note]').value=globalNote;render(false);scheduleSync(60)}catch(e){console.error(e);$('[data-chapters]').innerHTML='<div class="math880-empty">题单目录加载失败，请稍后重新打开页面。</div>';setMessage('题单数据加载失败','error')}
}

document.addEventListener('change',e=>{if(e.target.matches('[data-item-id]')){setItem(e.target.dataset.itemId,e.target.checked);return}if(e.target.matches('[data-filter-tier],[data-filter-unfinished]')){applyFilters();return}if(e.target.matches('[data-import-file]')){importProgress(e.target.files?.[0]);return}});
document.addEventListener('input',e=>{if(e.target.matches('[data-filter-search]')){applyFilters();return}if(e.target.matches('[data-global-note]')){globalNote=e.target.value;noteMeta=nowIso();saveLocal();clearTimeout(e.target._saveTimer);e.target._saveTimer=setTimeout(()=>persistGlobalNote(),650)}});
document.addEventListener('click',e=>{const group=e.target.closest('[data-group-toggle]');if(group){toggleGroup(Number(group.dataset.ci),group.dataset.tier,group.dataset.groupName);return}if(e.target.closest('[data-expand]')){$$('.math880-chapter:not(.hidden)').forEach(x=>x.open=true);return}if(e.target.closest('[data-collapse]')){$$('.math880-chapter').forEach(x=>x.open=false);return}if(e.target.closest('[data-export]')){exportProgress();return}if(e.target.closest('[data-import]')){$('[data-import-file]').click();return}if(e.target.closest('[data-reset]')){resetAll();return}});
document.addEventListener('everflow:auth-change',()=>scheduleSync(80));
addEventListener('online',()=>scheduleSync(80));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleSync(120)});

boot();
})();
