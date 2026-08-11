const CFG=window.EVERFLOW_CLOUD||{};
const SOURCES={course:{label:'课程',icon:'▶'},practice:{label:'刷题',icon:'✓'},manual:{label:'手动',icon:'＋'}};
const SOURCE_LABELS={
  'course_states':'408 强化课程',
  '408-1800-2027-reinforcement':'1800题强化必刷',
  'ds-reinforcement-2027':'数据结构强化专项',
  'math2-lilin880-2027':'李林880题 · 数学二',
  'manual':'手动补录'
};
const MONTH_COLORS=['#f36b75','#e99842','#d8a94f','#58a96d','#4db3a5','#52b8d4','#5a9be6','#ff5a68','#9b7fd6','#bb8b65','#61adba','#e36e91'];
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const timeMs=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:0};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let supa=null,user=null,events=[],mode='month';
const today=new Date();today.setHours(12,0,0,0);
let cursorYear=today.getFullYear(),cursorMonth=today.getMonth();

async function initClient(){
  if(!CFG.url||!CFG.publishableKey)return null;
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm');
  supa=createClient(CFG.url,CFG.publishableKey,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data}=await supa.auth.getSession();user=data?.session?.user||null;
  return supa;
}
function level(count){return count<=0?0:count===1?1:count===2?2:count<=4?3:4}
function localEvent(type,sourceId,itemId,subject,at,note=''){if(!at||!timeMs(at))return null;return {id:`local:${type}:${sourceId}:${itemId}:${at}`,event_type:type,source_id:sourceId,item_id:itemId,subject:subject||'',occurred_at:at,metadata:{local:true,note}}}
async function collectLocalEvents(){
  const out=[];
  try{
    if(window.EveraStore?.exportAll){
      await window.EveraStore.init?.();
      const data=await window.EveraStore.exportAll();
      for(const r of data.courseStates||[])if(r.done){const e=localEvent('course','course_states',r.id,r.subject,r.completedAt||r.updatedAt);if(e)out.push(e)}
    }
  }catch(e){console.warn('heatmap course local read failed',e)}
  try{
    const done=JSON.parse(localStorage.getItem('everflow_1800_done_v2')||'{}');
    for(const [id,v] of Object.entries(done)){const at=v?.updatedAt||(v?.ts?new Date(v.ts).toISOString():v?.date?`${v.date}T12:00:00`:null);const e=localEvent('practice','408-1800-2027-reinforcement',id,'408',at);if(e)out.push(e)}
  }catch{}
  try{
    const state=JSON.parse(localStorage.getItem('everflow-practice-ds-reinforcement-v1')||'{}');
    for(const [id,at] of Object.entries(state.done||{})){const e=localEvent('practice','ds-reinforcement-2027',id,'ds',at);if(e)out.push(e)}
  }catch{}
  try{
    const done=JSON.parse(localStorage.getItem('everflow-math880-done-v3')||'{}');
    for(const [id,v] of Object.entries(done)){const at=v?.updatedAt||(v?.ts?new Date(v.ts).toISOString():v?.date?`${v.date}T12:00:00`:null);const e=localEvent('practice','math2-lilin880-2027',id,'math2',at);if(e)out.push(e)}
  }catch{}
  return out;
}
async function loadEvents(){
  setStatus('正在读取学习记录…');
  try{
    if(!supa)await initClient();
    if(user){
      const start=new Date(cursorYear-1,0,1),end=new Date(cursorYear+2,0,1);
      const {data,error}=await supa.from('study_checkin_events').select('id,event_type,source_id,item_id,subject,occurred_at,metadata').eq('user_id',user.id).gte('occurred_at',start.toISOString()).lt('occurred_at',end.toISOString()).order('occurred_at',{ascending:true});
      if(error)throw error;events=data||[];setStatus(`已登录 · 已读取 ${events.length} 条云端打卡记录`);
    }else{
      events=await collectLocalEvents();setStatus(`未登录 · 显示本机可识别的 ${events.length} 条打卡记录`);
    }
  }catch(e){console.warn('heatmap load failed',e);events=await collectLocalEvents();setStatus('云端读取失败 · 已回退到本机记录','error')}
  renderAll();
}
function setStatus(text,type=''){const el=$('[data-source-status]');if(!el)return;el.textContent=text;el.dataset.state=type}
function eventsForDay(y,m,d){return events.filter(e=>{const x=new Date(e.occurred_at);return x.getFullYear()===y&&x.getMonth()===m&&x.getDate()===d})}
function eventsForMonth(y,m){return events.filter(e=>{const x=new Date(e.occurred_at);return x.getFullYear()===y&&x.getMonth()===m})}
function daysInMonth(y,m){return new Date(y,m+1,0).getDate()}
function monthOffset(y,m){const day=new Date(y,m,1).getDay();return(day+6)%7}
function accent(){document.querySelector('.heatmap-shell')?.style.setProperty('--heat-accent',MONTH_COLORS[cursorMonth%12])}
function calcStreak(){
  const set=new Set(events.map(e=>dateKey(new Date(e.occurred_at))));
  const start=new Date(today);if(!set.has(dateKey(start))){start.setDate(start.getDate()-1);if(!set.has(dateKey(start)))return 0}
  let n=0,d=new Date(start);while(set.has(dateKey(d))){n++;d.setDate(d.getDate()-1)}return n;
}
function sourceCounts(list){const out={course:0,practice:0,manual:0};for(const e of list)out[e.event_type]=(out[e.event_type]||0)+1;return out}
function renderMetrics(){
  const list=eventsForMonth(cursorYear,cursorMonth),byDay=new Map();for(const e of list){const k=dateKey(new Date(e.occurred_at));byDay.set(k,(byDay.get(k)||0)+1)}
  const max=Math.max(0,...byDay.values()),active=byDay.size,total=list.length;
  $('[data-kpi-total]').textContent=total;$('[data-kpi-days]').textContent=active;$('[data-kpi-streak]').textContent=calcStreak()+' 天';$('[data-kpi-max]').textContent=max;
  const denom=(cursorYear===today.getFullYear()&&cursorMonth===today.getMonth())?today.getDate():daysInMonth(cursorYear,cursorMonth),rate=denom?Math.round(active/denom*100):0;
  $('[data-summary-rate]').textContent=rate+'%';
  const title=rate>=85?'非常出色！':rate>=65?'保持稳定':rate>=40?'继续推进':'重新起步';$('[data-summary-title]').textContent=title;
  $('[data-summary-desc]').textContent=rate>=85?'这个月学习密度很高，连续性也很稳定。':rate>=65?'整体节奏不错，少数空白天可以继续压缩。':rate>=40?'已经形成节奏，下一步优先减少断档。':'每天先完成一个小任务，让热力图重新连续起来。';
  renderSourceLists(list);
}
function renderSourceLists(monthList){
  const todayList=eventsForDay(today.getFullYear(),today.getMonth(),today.getDate()),todayCounts=sourceCounts(todayList);$('[data-today-count]').textContent=todayList.length;$('[data-today-sources]').innerHTML=sourceItems(todayCounts,todayList.length);
  const monthCounts=sourceCounts(monthList);$('[data-month-sources]').innerHTML=sourceItems(monthCounts,monthList.length);
}
function sourceItems(counts,total){return ['course','practice','manual'].map(k=>{const n=counts[k]||0,p=total?Math.round(n/total*100):0;return `<div class="heatmap-source-item"><strong>${SOURCES[k].icon} ${SOURCES[k].label}</strong><span>${n} 次</span><div class="heatmap-source-track"><i style="width:${p}%"></i></div></div>`}).join('')}
function renderMonth(){
  accent();
  const label=$('[data-jump-current]');label.textContent=`${cursorYear}年${cursorMonth+1}月`;
  const grid=$('[data-month-grid]');let html='';for(let i=0;i<monthOffset(cursorYear,cursorMonth);i++)html+='<div class="heatmap-day empty"></div>';
  const total=daysInMonth(cursorYear,cursorMonth);for(let d=1;d<=total;d++){const list=eventsForDay(cursorYear,cursorMonth,d),count=list.length,isToday=cursorYear===today.getFullYear()&&cursorMonth===today.getMonth()&&d===today.getDate();html+=`<button type="button" class="heatmap-day ${isToday?'today':''}" data-level="${level(count)}" data-day="${d}" title="${cursorYear}-${cursorMonth+1}-${d} · ${count} 次打卡"><b>${d}</b>${count?`<small>${count}</small>`:''}</button>`}grid.innerHTML=html;
  renderMetrics();
}
function renderYear(){
  $('[data-jump-year]').textContent=`${cursorYear} 年`;const root=$('[data-year-grid]');root.innerHTML=Array.from({length:12},(_,m)=>{let cells='';for(let i=0;i<monthOffset(cursorYear,m);i++)cells+='<i class="heatmap-mini-day"></i>';for(let d=1;d<=daysInMonth(cursorYear,m);d++)cells+=`<i class="heatmap-mini-day" data-level="${level(eventsForDay(cursorYear,m,d).length)}" title="${cursorYear}-${m+1}-${d}"></i>`;return `<article class="heatmap-mini-month"><h3>${m+1}月</h3><div class="heatmap-mini-grid">${cells}</div></article>`}).join('')
}
function renderAll(){renderMonth();renderYear();toggleMode(mode)}
function toggleMode(next){mode=next;$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===mode));$('[data-month-view]').hidden=mode!=='month';$('[data-year-view]').hidden=mode!=='year'}
function sourceName(e){return SOURCE_LABELS[e.source_id]||SOURCES[e.event_type]?.label||'学习打卡'}
function eventTitle(e){if(e.event_type==='manual')return e.metadata?.note||'手动补录';if(e.event_type==='course')return `${sourceName(e)} · ${e.subject||'课程'}`;return `${sourceName(e)} · ${e.subject||'刷题'}`}
function showDay(d){
  const list=eventsForDay(cursorYear,cursorMonth,d).sort((a,b)=>timeMs(a.occurred_at)-timeMs(b.occurred_at));$('[data-day-label]').textContent=`${cursorYear}年${cursorMonth+1}月${d}日`;$('[data-day-count]').textContent=`${list.length} 次打卡`;$('[data-day-events]').innerHTML=list.length?list.map(e=>{const time=new Date(e.occurred_at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});return `<article class="heatmap-event"><span class="heatmap-event-icon">${SOURCES[e.event_type]?.icon||'•'}</span><div><strong>${esc(eventTitle(e))}</strong><small>${time} · ${SOURCES[e.event_type]?.label||'学习'}${e.item_id?` · ${esc(String(e.item_id).slice(0,48))}`:''}</small></div></article>`}).join(''):'<div class="heatmap-empty">当天还没有打卡记录。</div>';$('[data-day-dialog]').showModal();
}
function localDatetimeValue(date=new Date()){const d=new Date(date.getTime()-date.getTimezoneOffset()*60000);return d.toISOString().slice(0,16)}
function openManual(){const input=$('[data-manual-time]');if(input)input.value=localDatetimeValue();const hint=$('[data-manual-hint]');hint.textContent=user?'已登录，补录会直接写入云端并显示在热力图。':'手动补录需要登录；未登录时仍可查看本机已有打卡。';$('[data-manual-dialog]').showModal()}
async function saveManual(event){
  event.preventDefault();if(!supa)await initClient();if(!user){$('[data-manual-hint]').textContent='请先登录账户，再进行手动补录。';return}
  const at=$('[data-manual-time]').value,note=$('[data-manual-note]').value.trim(),subject=$('[data-manual-subject]').value;if(!at)return;
  const {error}=await supa.from('study_checkin_events').insert({user_id:user.id,event_type:'manual',source_id:'manual',item_id:`manual:${crypto.randomUUID?.()||Date.now()}`,subject,occurred_at:new Date(at).toISOString(),metadata:{note}});if(error){$('[data-manual-hint]').textContent='补录失败：'+(error.message||'unknown');return}
  $('[data-manual-dialog]').close();$('[data-manual-note]').value='';await loadEvents();
}
function bind(){
  document.addEventListener('click',e=>{const day=e.target.closest('[data-day]');if(day){showDay(Number(day.dataset.day));return}const view=e.target.closest('[data-view]');if(view){toggleMode(view.dataset.view);return}if(e.target.closest('[data-prev-month]')){cursorMonth--;if(cursorMonth<0){cursorMonth=11;cursorYear--}renderAll();return}if(e.target.closest('[data-next-month]')){cursorMonth++;if(cursorMonth>11){cursorMonth=0;cursorYear++}renderAll();return}if(e.target.closest('[data-prev-year]')){cursorYear--;renderAll();return}if(e.target.closest('[data-next-year]')){cursorYear++;renderAll();return}if(e.target.closest('[data-jump-current]')){cursorYear=today.getFullYear();cursorMonth=today.getMonth();renderAll();return}if(e.target.closest('[data-jump-year]')){cursorYear=today.getFullYear();renderAll();return}if(e.target.closest('[data-manual-open]')){openManual();return}if(e.target.closest('[data-manual-close]')){$('[data-manual-dialog]').close();return}});
  $('[data-manual-form]')?.addEventListener('submit',saveManual);
  document.addEventListener('everflow:auth-change',async()=>{await initClient();await loadEvents()});
  addEventListener('online',()=>loadEvents());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadEvents()});
}
async function boot(){bind();await initClient();try{await import('./study-store.js')}catch{}await loadEvents()}
boot();
