const PRACTICE_ID='ds-reinforcement-2027';
const LOCAL_KEY='everflow-practice-ds-reinforcement-v1';
const LEGACY_KEY='everflow_27_ds_reinforcement_v1';
const SCOPE_KEY=`everflow-practice-scope:${PRACTICE_ID}`;
const SNAPSHOT_PREFIX=`everflow-practice-snapshot:${PRACTICE_ID}:`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let manifest=null,sheets={},active='alg',state={done:{},notes:{},updated:{},activeKey:'alg'};
let syncRunning=false,syncAgain=false,syncTimer=null;

function todayStr(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function timeMs(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:0}
function normalizeState(x={}){return {done:x.done&&typeof x.done==='object'?x.done:{},notes:x.notes&&typeof x.notes==='object'?x.notes:{},updated:x.updated&&typeof x.updated==='object'?x.updated:{},activeKey:x.activeKey||'alg'}}
function snapshotKey(userId){return SNAPSHOT_PREFIX+userId}
function saveSnapshot(userId){if(!userId)return;try{localStorage.setItem(snapshotKey(userId),JSON.stringify(state))}catch{}}
function loadSnapshot(userId){try{const raw=localStorage.getItem(snapshotKey(userId));return raw?normalizeState(JSON.parse(raw)):normalizeState()}catch{return normalizeState()}}
function loadState(){
  try{
    const raw=localStorage.getItem(LOCAL_KEY);
    if(raw){state=normalizeState(JSON.parse(raw))}
    else{
      const legacy=localStorage.getItem(LEGACY_KEY);
      if(legacy){
        const old=normalizeState(JSON.parse(legacy)),now=new Date().toISOString();
        for(const id of new Set([...Object.keys(old.done),...Object.keys(old.notes)]))old.updated[id]=old.updated[id]||old.done[id]||now;
        state=old;
      }else state=normalizeState();
    }
    const now=new Date().toISOString();
    for(const id of new Set([...Object.keys(state.done),...Object.keys(state.notes)]))state.updated[id]=state.updated[id]||state.done[id]||now;
  }catch{state=normalizeState()}
  saveState();
}
function saveState(){state.activeKey=active;localStorage.setItem(LOCAL_KEY,JSON.stringify(state));const scope=localStorage.getItem(SCOPE_KEY);if(scope)saveSnapshot(scope)}
function bindScope(userId){
  if(!userId)return false;
  const bound=localStorage.getItem(SCOPE_KEY);
  if(!bound){localStorage.setItem(SCOPE_KEY,userId);saveSnapshot(userId);return false}
  if(bound===userId)return false;
  saveSnapshot(bound);
  state=loadSnapshot(userId);
  active=sheets[state.activeKey]?state.activeKey:'alg';
  localStorage.setItem(SCOPE_KEY,userId);
  saveState();
  return true;
}
function sheet(){return sheets[active]||{tasks:[],name:'',title:'',subtitle:''}}
function completionDate(id){const v=state.done[id];if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?String(v).slice(0,10):todayStr(d)}
function isTruth(t){return t.module==='真题训练'||/真题\s*\d{4}_/.test(t.task||'')||/\d{4}应用题/.test(t.index||'')}
function badgeClass(p){if(p==='必做')return'must';if(p==='高优先级')return'high';if(p==='中优先级')return'mid';if(p==='低优先级')return'low';if(String(p).includes('基本功'))return'basic';return'other'}
function allTasks(){return Object.values(sheets).flatMap(s=>s.tasks||[])}
function findTask(id){return allTasks().find(t=>t.id===id)}
function calcStreak(){const dates=[...new Set(Object.keys(state.done).map(completionDate).filter(Boolean))].sort().reverse();if(!dates.length)return 0;const now=new Date();now.setHours(0,0,0,0);const y=new Date(now);y.setDate(y.getDate()-1);const start=dates[0]===todayStr(now)?now:(dates[0]===todayStr(y)?y:null);if(!start)return 0;const set=new Set(dates);let c=0,d=new Date(start);while(set.has(todayStr(d))){c++;d.setDate(d.getDate()-1)}return c}
function setSync(text,type=''){const el=$('[data-sync-message]');if(!el)return;el.textContent=text;el.className=type?`sync-${type}`:''}

function filters(){return {q:$('[data-filter-search]').value.trim().toLowerCase(),module:$('[data-filter-module]').value,priority:$('[data-filter-priority]').value,status:$('[data-filter-status]').value}}
function filteredTasks(){const f=filters();return sheet().tasks.filter(t=>{const done=Boolean(state.done[t.id]);const hay=[t.module,t.point,t.priority,t.index,t.task,t.remark,state.notes[t.id]||''].join(' ').toLowerCase();return(!f.q||hay.includes(f.q))&&(!f.module||t.module===f.module)&&(!f.priority||t.priority===f.priority)&&(!f.status||(f.status==='done'?done:!done))})}
function resetPretty(select){const host=select?.closest('.pretty-select-host');if(host){host.parentNode.insertBefore(select,host);host.remove();delete select.dataset.prettyReady;select.classList.remove('pretty-select-native')}}
function fillStaticFilters(){
  const moduleSel=$('[data-filter-module]'),prioritySel=$('[data-filter-priority]');
  const moduleOld=moduleSel?.value||'',priorityOld=prioritySel?.value||'';
  resetPretty(moduleSel);resetPretty(prioritySel);
  const modules=[...new Set(sheet().tasks.map(t=>t.module).filter(Boolean))],priorities=[...new Set(sheet().tasks.map(t=>t.priority).filter(Boolean))];
  moduleSel.innerHTML='<option value="">全部模块</option>'+modules.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  prioritySel.innerHTML='<option value="">全部优先级</option>'+priorities.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  if([...moduleSel.options].some(o=>o.value===moduleOld))moduleSel.value=moduleOld;
  if([...prioritySel.options].some(o=>o.value===priorityOld))prioritySel.value=priorityOld;
  queueMicrotask(()=>window.EveraPrettySelect?.refresh?.());
}
function renderTabs(){$$('[data-sheet-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.sheetTab===active);const s=sheets[b.dataset.sheetTab];const count=s?.tasks?.length||0;b.querySelector('span').textContent=count})}
function renderMetrics(){const all=sheet().tasks,list=filteredTasks(),done=all.filter(t=>state.done[t.id]).length,today=all.filter(t=>completionDate(t.id)===todayStr()).length,rate=all.length?Math.round(done*100/all.length):0;$('[data-kpi-total]').textContent=all.length;$('[data-kpi-done]').textContent=done;$('[data-kpi-rate]').textContent=rate+'%';$('[data-kpi-today]').textContent=today;$('[data-kpi-streak]').textContent=calcStreak()+' 天';$('[data-remain-hint]').textContent=`剩余 ${all.length-done} 项`;$('[data-visible-hint]').textContent=list.length===all.length?'当前页全部任务':`筛选后显示 ${list.length} 项`;$('[data-progress-bar]').style.width=rate+'%'}
function renderNav(){const modules=[...new Set(sheet().tasks.map(t=>t.module))];$('[data-section-nav]').innerHTML=modules.map((m,i)=>`<button type="button" data-jump="${i}">${esc(m)}</button>`).join('')}
function rowHtml(t,showIndex){const done=Boolean(state.done[t.id]),truth=isTruth(t);return `<tr class="${done?'completed ':''}${truth?'truth':''}"><td class="reinforcement-point">${esc(t.point)}</td><td><span class="reinforcement-badge ${badgeClass(t.priority)}">${esc(t.priority)}</span></td>${showIndex?`<td class="reinforcement-index">${esc(t.index)}</td>`:''}<td class="reinforcement-task">${esc(t.task)}</td><td style="text-align:center"><input class="reinforcement-check" type="checkbox" data-done-id="${esc(t.id)}" ${done?'checked':''} aria-label="完成"></td><td class="reinforcement-remark">${esc(t.remark)}</td><td><textarea class="reinforcement-note" data-note-id="${esc(t.id)}" placeholder="我的复盘 / 备注">${esc(state.notes[t.id]||'')}</textarea></td></tr>`}
function cardHtml(t){const done=Boolean(state.done[t.id]),truth=isTruth(t);return `<article class="reinforcement-card ${done?'completed ':''}${truth?'truth':''}"><div class="reinforcement-card-head"><input class="reinforcement-check" type="checkbox" data-done-id="${esc(t.id)}" ${done?'checked':''} aria-label="完成"><div><h3>${esc(t.point)}</h3>${t.index?`<div class="reinforcement-card-index">${esc(t.index)}</div>`:''}</div><span class="reinforcement-badge ${badgeClass(t.priority)}">${esc(t.priority)}</span></div><div class="reinforcement-card-task">${esc(t.task)}</div>${t.remark?`<div class="reinforcement-card-remark">${esc(t.remark)}</div>`:''}<textarea class="reinforcement-note" data-note-id="${esc(t.id)}" placeholder="我的复盘 / 备注">${esc(state.notes[t.id]||'')}</textarea></article>`}
function render(){if(!manifest)return;renderTabs();renderMetrics();renderNav();const s=sheet();$('[data-sheet-title]').textContent=s.title;$('[data-sheet-note]').textContent=s.subtitle;$('[data-sheet-subtitle]').textContent=s.subtitle;const list=filteredTasks(),root=$('[data-reinforcement-content]');if(!list.length){root.innerHTML='<div class="reinforcement-empty">没有符合当前筛选条件的任务。</div>';return}const modules=[...new Set(s.tasks.map(t=>t.module))];root.innerHTML=modules.map((m,idx)=>{const all=s.tasks.filter(t=>t.module===m),rows=list.filter(t=>t.module===m);if(!rows.length)return'';const done=all.filter(t=>state.done[t.id]).length,showIndex=active==='app';return `<section class="reinforcement-module" id="reinforce-${active}-${idx}"><header><h2>${esc(m)}</h2><span>${done}/${all.length} 已完成 · ${all.length?Math.round(done*100/all.length):0}%</span></header><div class="reinforcement-table-wrap"><table class="reinforcement-table"><thead><tr><th>考点</th><th>优先级</th>${showIndex?'<th>索引</th>':''}<th>训练任务</th><th>完成</th><th>原表备注</th><th>我的复盘</th></tr></thead><tbody>${rows.map(t=>rowHtml(t,showIndex)).join('')}</tbody></table></div><div class="reinforcement-mobile">${rows.map(cardHtml).join('')}</div></section>`}).join('')}

async function waitCloud(){for(let i=0;i<80;i++){if(window.EveraCloud?.listPracticeStates)return window.EveraCloud;await new Promise(r=>setTimeout(r,80))}return null}
async function pushOne(cloud,id){
  const task=findTask(id);if(!task)return null;
  const localAt=state.updated[id]||new Date().toISOString();
  const row=await cloud.savePracticeState({practice_id:PRACTICE_ID,item_id:id,subject:'ds',status:state.done[id]?'done':'todo',note:state.notes[id]||'',first_done_at:state.done[id]||null,last_attempt_at:localAt});
  if(row?.updated_at)state.updated[id]=row.updated_at;
  return row;
}
async function syncIds(cloud,ids,{silent=false}={}){
  const unique=[...new Set(ids)].filter(id=>findTask(id));
  if(!unique.length)return {ok:0,failed:0};
  let cursor=0,ok=0,failed=0;
  if(!silent)setSync(`本机已保存 · 正在同步 ${unique.length} 项…`);
  const worker=async()=>{while(cursor<unique.length){const id=unique[cursor++];try{await pushOne(cloud,id);ok++}catch(e){failed++;console.warn('reinforcement item sync failed',id,e)}}};
  await Promise.all(Array.from({length:Math.min(4,unique.length)},worker));
  saveState();
  if(!silent)setSync(failed?`已同步 ${ok} 项，${failed} 项稍后重试`:'本机与云端已同步',failed?'error':'success');
  return {ok,failed};
}
async function persist(id){
  const cloud=await waitCloud();if(!cloud)return;
  try{
    const user=await cloud.getUser?.();
    if(!user){setSync('未登录 · 当前保存在本机');return}
    bindScope(user.id);
    await syncIds(cloud,[id],{silent:true});
    setSync('已保存本机并同步云端','success');
  }catch(e){console.warn(e);setSync('已保存本机；云同步稍后重试','error')}
}
function applyRemoteRow(r){
  const id=r.item_id;if(!findTask(id))return false;
  const remoteAt=r.updated_at||'',localAt=state.updated[id]||state.done[id]||'';
  if(localAt&&timeMs(remoteAt)<=timeMs(localAt))return false;
  if(r.status==='done'||r.status==='mastered')state.done[id]=r.first_done_at||r.updated_at||new Date().toISOString();else delete state.done[id];
  state.notes[id]=r.note||'';
  state.updated[id]=remoteAt;
  return true;
}
async function mergeCloud(){
  if(syncRunning){syncAgain=true;return}
  syncRunning=true;
  try{
    const cloud=await waitCloud();if(!cloud)return;
    const user=await cloud.getUser?.();if(!user){setSync('未登录 · 当前保存在本机');return}
    const switched=bindScope(user.id);
    if(switched){fillStaticFilters();render();setSync('已切换账户 · 正在载入该账户云端进度')}
    const rows=await cloud.listPracticeStates(PRACTICE_ID),remote=new Map(rows.map(r=>[r.item_id,r]));
    let changed=false;
    for(const r of rows)if(applyRemoteRow(r))changed=true;
    if(changed){saveState();render()}
    const localIds=[...new Set([...Object.keys(state.updated),...Object.keys(state.done),...Object.keys(state.notes)])].filter(id=>findTask(id));
    const pending=localIds.filter(id=>{const r=remote.get(id);return !r||timeMs(state.updated[id]||state.done[id])>timeMs(r.updated_at)});
    if(pending.length)await syncIds(cloud,pending,{silent:true});
    saveState();render();
    setSync(pending.length?`已登录 · 已合并并补传 ${pending.length} 项`:'已登录 · 本机与云端进度一致','success');
  }catch(e){console.warn('reinforcement sync failed',e);setSync('云端同步失败，本机记录仍可使用','error')}
  finally{syncRunning=false;if(syncAgain){syncAgain=false;scheduleSync(100)}}
}
function scheduleSync(delay=250){clearTimeout(syncTimer);syncTimer=setTimeout(()=>mergeCloud(),delay)}

function exportJson(){const blob=new Blob([JSON.stringify({version:3,practiceId:PRACTICE_ID,exportedAt:new Date().toISOString(),done:state.done,notes:state.notes,updated:state.updated,activeKey:active},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`27考研数据结构强化_打卡进度_${todayStr()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function importJson(file){if(!file)return;const fr=new FileReader();fr.onload=()=>{try{const x=JSON.parse(fr.result),next=normalizeState({...state,...x}),now=new Date().toISOString();for(const id of new Set([...Object.keys(next.done),...Object.keys(next.notes)]))next.updated[id]=next.updated[id]||now;state=next;active=state.activeKey&&sheets[state.activeKey]?state.activeKey:active;saveState();fillStaticFilters();render();window.EveraUI?.toast?.('进度已导入；正在检查云同步',{type:'success'});scheduleSync(50)}catch(e){window.EveraUI?.toast?.('导入失败：'+e.message,{type:'error'})}};fr.readAsText(file)}
function exportCsv(){const rows=filteredTasks(),cols=['模块','考点','优先级','索引','训练任务','完成','原表备注','我的复盘'],csv=[cols,...rows.map(t=>[t.module,t.point,t.priority,t.index,t.task,state.done[t.id]?'已完成':'未完成',t.remark,state.notes[t.id]||''])].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n'),blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`27考研数据结构强化_${active}_${todayStr()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

async function loadCatalog(){const base='../../../data/practice/';const r=await fetch(base+'ds-reinforcement-2027.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('manifest_load_failed');manifest=await r.json();for(const meta of manifest.sheets){const parts=await Promise.all(meta.parts.map(async p=>{const x=await fetch(base+p+'?t='+Date.now(),{cache:'no-store'});if(!x.ok)throw new Error('part_load_failed:'+p);return x.json()}));const tasks=parts.flatMap(x=>x.tasks||[]);sheets[meta.key]={...meta,tasks}}}
async function boot(){loadState();try{await loadCatalog();active=sheets[state.activeKey]?state.activeKey:'alg';await import('./pretty-select.js');fillStaticFilters();render();scheduleSync(50)}catch(e){console.error(e);$('[data-reinforcement-content]').innerHTML='<div class="reinforcement-empty">打卡表加载失败，请稍后刷新。</div>'}}

document.addEventListener('click',e=>{
  const tab=e.target.closest('[data-sheet-tab]');
  if(tab){active=tab.dataset.sheetTab;saveState();$('[data-filter-search]').value='';$('[data-filter-status]').value='';fillStaticFilters();render();return}
  const jump=e.target.closest('[data-jump]');
  if(jump){document.getElementById(`reinforce-${active}-${jump.dataset.jump}`)?.scrollIntoView({behavior:'smooth',block:'start'});return}
  if(e.target.closest('[data-clear-filter]')){$('[data-filter-search]').value='';$('[data-filter-module]').value='';$('[data-filter-priority]').value='';$('[data-filter-status]').value='';render();return}
  if(e.target.closest('[data-print]')){print();return}
  if(e.target.closest('[data-export]')){exportJson();return}
  if(e.target.closest('[data-import]')){$('[data-import-file]').click();return}
  if(e.target.closest('[data-export-csv]')){exportCsv();return}
  if(e.target.closest('[data-reset]')){
    if(confirm('确定清空当前打卡表的完成状态和个人复盘吗？')){
      const now=new Date().toISOString(),ids=sheet().tasks.map(t=>t.id);
      for(const id of ids){delete state.done[id];delete state.notes[id];state.updated[id]=now}
      saveState();render();
      waitCloud().then(async cloud=>{const user=await cloud?.getUser?.();if(user){bindScope(user.id);syncIds(cloud,ids)}else setSync('已重置本机；登录后会同步清空结果')}).catch(()=>setSync('已重置本机；云同步稍后重试','error'));
    }
    return;
  }
});
document.addEventListener('change',e=>{
  if(e.target.matches('[data-done-id]')){
    const id=e.target.dataset.doneId,now=new Date().toISOString();
    if(e.target.checked)state.done[id]=now;else delete state.done[id];
    state.updated[id]=now;saveState();render();persist(id);
  }
  if(e.target.matches('[data-filter-module],[data-filter-priority],[data-filter-status]'))render();
  if(e.target.matches('[data-import-file]')){importJson(e.target.files?.[0]);e.target.value=''}
});
document.addEventListener('input',e=>{
  if(e.target.matches('[data-filter-search]'))render();
  if(e.target.matches('[data-note-id]')){
    const id=e.target.dataset.noteId;
    state.notes[id]=e.target.value;state.updated[id]=new Date().toISOString();saveState();
    clearTimeout(e.target._timer);e.target._timer=setTimeout(()=>persist(id),650);
  }
});
document.addEventListener('everflow:auth-change',e=>{if(e.detail?.user)scheduleSync(50)});
window.addEventListener('online',()=>scheduleSync(120));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)scheduleSync(180)});
boot();