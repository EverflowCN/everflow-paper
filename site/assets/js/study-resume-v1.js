/* Everflow study resume: device-local navigation markers + saved learning records.
   Never invent activity and never overwrite answer/progress data. */
(()=>{
'use strict';
const STORAGE_KEY='everflow-study-resume-v1';
const KINDS=['course','zhenti','relax'];
const ROOTS={course:'/408/',zhenti:'/zhenti/',relax:'/zhenti/relax-reader/'};
const $=s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const timestamp=value=>{const n=Date.parse(value||'');return Number.isFinite(n)&&n>0&&n<Date.now()+120000?n:0};
function readJson(key,fallback={}){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:fallback}catch{return fallback}}
function scope(){try{return localStorage.getItem('everflow-408-question-cloud-user-v1')||localStorage.getItem('everflow-last-cloud-user-id-v2')||'local'}catch{return'local'}}
function safeHref(kind,href){
  try{
    const url=new URL(String(href||ROOTS[kind]),location.origin);
    if(url.origin!==location.origin)return'';
    const path=url.pathname;
    if(kind==='course'&&path!=='/408/')return'';
    if(kind==='zhenti'&&path!=='/zhenti/')return'';
    if(kind==='relax'&&path!=='/zhenti/relax-reader/')return'';
    return path+url.search;
  }catch{return''}
}
function sanitize(kind,value){
  if(!KINDS.includes(kind)||!value||typeof value!=='object')return null;
  const id=String(value.id||'').slice(0,200);
  const valid=kind==='course'?Boolean(id):kind==='zhenti'?/^(20(?:0[9]|1\d|2[0-6]))-(?:[1-9]|[1-3]\d|4[0-7])$/.test(id):/^(?:ds|co|os|cn)-\d{1,3}-\d{1,4}$/.test(id);
  const href=safeHref(kind,value.href);
  const at=timestamp(value.at);
  if(!valid||!href||!at)return null;
  return{kind,id,title:String(value.title||'').slice(0,100),detail:String(value.detail||'').slice(0,180),href,at:new Date(at).toISOString()};
}
function read(){
  const raw=readJson(STORAGE_KEY);
  if(raw.scope!==scope())return{};
  const items={};
  for(const kind of KINDS){const item=sanitize(kind,raw.items?.[kind]);if(item)items[kind]=item}
  return items;
}
function mark(kind,input){
  if(!KINDS.includes(kind))return;
  const next=sanitize(kind,{...input,at:new Date().toISOString()});
  if(!next)return;
  try{
    const items=read();
    items[kind]=next;
    localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,scope:scope(),items}));
    document.dispatchEvent(new CustomEvent('everflow:study-resume-change',{detail:{kind}}));
  }catch{}
}
const courseHref=(catalogId,itemId='')=>'/408/?course='+encodeURIComponent(catalogId)+(itemId?'&item='+encodeURIComponent(itemId):'');
const zhentiHref=(year,q)=>'/zhenti/?source=zhenti&year='+year+'&q='+q;
const relaxHref=id=>'/zhenti/relax-reader/?id='+encodeURIComponent(id);
function newest(a,b){return !a?b:!b?a:timestamp(b.at)>timestamp(a.at)?b:a}
function bestLocalRecord(key,parser){
  let winner=null;
  for(const [id,value] of Object.entries(readJson(key))){
    const at=timestamp(value?.updatedAt);
    if(!at)continue;
    const row=parser(id,value,new Date(at).toISOString());
    if(row)winner=newest(winner,row);
  }
  return winner;
}
function recentZhenti(){
  return bestLocalRecord('everflow-408-zhenti-wall-v1',(id,_,at)=>{
    const m=id.match(/^(20(?:0[9]|1\d|2[0-6]))-([1-9]|[1-3]\d|4[0-7])$/);
    if(!m)return null;
    const year=Number(m[1]),q=Number(m[2]);
    return sanitize('zhenti',{id,title:'408 历年真题',detail:year+' 年 · 第 '+q+' 题',href:zhentiHref(year,q),at});
  });
}
function recentRelax(){
  return bestLocalRecord('everflow-408-relax1000-records-v1',(id,_,at)=>{
    const m=id.match(/^(ds|co|os|cn)-(\d{1,3})-(\d{1,4})$/);
    if(!m)return null;
    const subject={ds:'数据结构',co:'组成原理',os:'操作系统',cn:'计算机网络'}[m[1]];
    return sanitize('relax',{id,title:'Relax1000',detail:subject+' · 第 '+Number(m[2])+' 章 / 第 '+Number(m[3])+' 题',href:relaxHref(id),at});
  });
}
async function recentCourse(){
  let rows=[];
  try{if(window.EveraStore?.listCourseStates)rows=await window.EveraStore.listCourseStates()}catch(error){console.warn('Course resume local store unavailable',error)}
  if(!rows.length)rows=Object.entries(readJson('oxygen408-progress-v2')).map(([id,value])=>({...value,id}));
  rows=rows.filter(r=>r?.id&&timestamp(r.updatedAt));
  if(!rows.length)return null;
  rows.sort((a,b)=>timestamp(b.updatedAt)-timestamp(a.updatedAt));
  try{
    const source=await window.EveraCourseCatalog?.load?.();
    const known=new Map();
    for(const catalog of source?.catalogs||[])for(const item of source.itemMap?.get(catalog.id)||[]){
      for(const id of [item.progress_id,item.item_id])if(id)known.set(String(id),{catalog,item});
    }
    for(const row of rows){
      const match=known.get(String(row.id));if(!match)continue;
      const {catalog,item}=match,id=String(item.progress_id||item.item_id);
      return sanitize('course',{id,title:String(catalog.title||'课程学习'),detail:String(item.title||'课时打卡'),href:courseHref(catalog.id,id),at:row.updatedAt});
    }
  }catch{}
  // Unknown IDs cannot be safely assigned to a course catalog.
  return null;
}
function relativeTime(at){
  const age=Date.now()-timestamp(at);
  if(age<0||!Number.isFinite(age))return'最近';
  if(age<60000)return'刚刚';
  if(age<3600000)return Math.floor(age/60000)+' 分钟前';
  if(age<86400000)return Math.floor(age/3600000)+' 小时前';
  if(age<604800000)return Math.floor(age/86400000)+' 天前';
  return new Date(at).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'});
}
const META={
  course:{icon:'课',name:'课程',empty:'还没有课程学习记录',url:'/408/'},
  zhenti:{icon:'真',name:'408 真题',empty:'还没有真题做题记录',url:'/zhenti/?source=zhenti'},
  relax:{icon:'R',name:'Relax1000',empty:'还没有 Relax1000 记录',url:'/zhenti/relax-reader/'}
};
const arrow='<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
function draw(items){
  const list=$('[data-recent-entries]');if(!list)return;
  list.innerHTML=KINDS.map(kind=>{
    const meta=META[kind],item=items[kind];
    if(!item)return '<article class="study-recent-item is-empty"><div class="study-recent-icon">'+esc(meta.icon)+'</div><div class="study-recent-copy"><span>'+esc(meta.name)+'</span><strong>'+esc(meta.empty)+'</strong><small>完成学习或打开题目后会记录当前位置</small></div><a class="study-recent-action secondary" href="'+esc(meta.url)+'">开始学习 '+arrow+'</a></article>';
    return '<article class="study-recent-item"><div class="study-recent-icon">'+esc(meta.icon)+'</div><div class="study-recent-copy"><span>'+esc(meta.name)+' · '+esc(relativeTime(item.at))+'</span><strong>'+esc(item.title||meta.name)+'</strong><small>'+esc(item.detail||'继续学习')+'</small></div><a class="study-recent-action" href="'+esc(item.href)+'" aria-label="继续'+esc(meta.name)+'：'+esc(item.detail)+'">继续上次 '+arrow+'</a></article>';
  }).join('');
  const best=Object.values(items).filter(Boolean).sort((a,b)=>timestamp(b.at)-timestamp(a.at))[0];
  const top=$('[data-recent-primary]');
  if(top){top.hidden=!best;if(best){top.href=best.href;top.innerHTML='继续最近一次学习 '+arrow;top.setAttribute('aria-label','继续'+(best.title||META[best.kind].name)+'，'+best.detail)}}
  const note=$('[data-recent-status]');if(note)note.textContent=best?'已根据最近打开的位置和打卡记录恢复':'尚无学习记录，开始课程或做题后即可继续';
}
let refreshCount=0;
async function refresh(){
  if(!$('[data-recent-entries]'))return;
  const id=++refreshCount,tracked=read();
  const localCourse=await recentCourse();
  if(id!==refreshCount)return;
  const entries={course:newest(tracked.course,localCourse),zhenti:newest(tracked.zhenti,recentZhenti()),relax:newest(tracked.relax,recentRelax())};
  draw(entries);
}
if($('[data-recent-entries]')){
  refresh();
  document.addEventListener('everflow:study-resume-change',refresh);
  document.addEventListener('everflow:course-state-merged',refresh);
  document.addEventListener('everflow:zhenti-records-change',refresh);
  document.addEventListener('everflow:relax-records-change',refresh);
  document.addEventListener('everflow:question-cloud-sync',refresh);
  document.addEventListener('everflow:cloud-sync',refresh);
  addEventListener('pageshow',refresh);
  addEventListener('storage',e=>{if([STORAGE_KEY,'everflow-408-zhenti-wall-v1','everflow-408-relax1000-records-v1','oxygen408-progress-v2'].includes(e.key))refresh()});
}
window.EveraStudyRecent={mark,read,refresh,courseHref,zhentiHref,relaxHref};
})();
