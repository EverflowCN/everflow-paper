import {YEARS,SUBJECTS,SUBSHORT,esc,yearData,subjectIndex,topicIndex,sourceFromQuestion,getRecord,getRecords,getNav,saveNav,patchRecord,grade,questionHtml,progressOf,statusOf} from './core.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const elements={
 sidebar:$('[data-sidebar]'), yearList:$('[data-year-list]'),topicButtons:$('[data-topic-buttons]'),
 landing:$('[data-landing]'),focus:$('[data-focus]'), content:$('[data-question-content]'),sheet:$('[data-answer-sheet]'),
 breadcrumb:$('[data-focus-breadcrumb]'), resume:$('[data-resume]'),statDone:$('[data-stat-done]'),statMastered:$('[data-stat-mastered]'),
 statWeak:$('[data-stat-weak]'),statRate:$('[data-stat-rate]'),yearFilter:$('[data-year-filter]'),filter:$$('[data-record-filter]')
};
const params=new URLSearchParams(location.search);
const nav=getNav('zhenti');
let mode=['paper','subject','topic'].includes(params.get('mode'))?params.get('mode'):['paper','subject','topic'].includes(nav.mode)?nav.mode:'paper';
let subject=SUBJECTS[params.get('subject')]?params.get('subject'):SUBJECTS[nav.subject]?nav.subject:'ds';
let topic='all',yearFilter='all',recordFilter='all',subjectData=null,topicData=null;
let active=null,activeIds=[],revealed=false,renderToken=0,loadedItem=null;
const id=(y,q)=>y+'-'+q;
const validYear=(y)=>YEARS.includes(Number(y));
function subjectOf(y,q){
 const fromIndex=subjectData?.years?.[y];return sourceFromQuestion(q,fromIndex);
}
function qsFor(year){
 const topics=topicData?.years?.[year]||{},groups=subjectData?.years?.[year]||{};
 const base=mode==='paper'?Array.from({length:47},(_,i)=>i+1):groups[subject]||[];
 return base.filter(q=>mode!=='topic'||topic==='all'||topics[q]===topic);
}
const years=()=>yearFilter==='recent'?YEARS.filter(y=>y>=2017):YEARS;
function allIds(){return years().flatMap(y=>qsFor(y).map(q=>id(y,q)))}
function renderStats(){
 const all=allIds(),p=progressOf(all,'zhenti');
 elements.statDone.textContent=p.done;elements.statMastered.textContent=p.mastered;
 elements.statWeak.textContent=p.weak;elements.statRate.textContent=p.rate+'%';
}
function renderSidebar(){
 $$('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 $$('[data-subject]').forEach(b=>b.classList.toggle('active',b.dataset.subject===subject));
 $('[data-subject-list]').hidden=mode==='paper';
 $('[data-topic-list]').hidden=mode!=='topic';
 if(mode!=='topic')return;
 let list=new Map();
 for(const y of YEARS)for(const q of subjectData?.years?.[y]?.[subject]||[]){
   const name=topicData?.years?.[y]?.[q]||'待归类';list.set(name,(list.get(name)||0)+1);
 }
 const names=[...list.entries()].sort((a,b)=>a[0]==='待归类'?1:b[0]==='待归类'?-1:b[1]-a[1]);
 elements.topicButtons.innerHTML='<button class="lab-side-button '+(topic==='all'?'active':'')+'" data-topic="all">全部考点 <small>'+[...list.values()].reduce((a,b)=>a+b,0)+'</small></button>'+names.map(([name,n])=>'<button class="lab-side-button '+(topic===name?'active':'')+'" data-topic="'+esc(name)+'">'+esc(name)+' <small>'+n+'</small></button>').join('');
}
function renderLanding(){
 if(!subjectData||!topicData)return;
 renderSidebar();renderStats();
 $('[data-land-eyebrow]').textContent=mode==='paper'?'PAST PAPERS / 2009 — 2026':mode==='subject'?'FOCUS BY SUBJECT':'FOCUS BY KNOWLEDGE';
 $('[data-land-title]').textContent=mode==='paper'?'按年份开始练习':mode==='subject'?SUBJECTS[subject]+' · 分科练习':SUBJECTS[subject]+' · '+(topic==='all'?'按考点练习':topic);
 $('[data-land-desc]').textContent=mode==='paper'?'按年份逐套训练，保留 47 题导航与真实年份题型。':mode==='subject'?'选择年份后，只练该科目的真实历年题目。':'依据现有考点目录定位试题；「待归类」表示尚未确定考点。';
 elements.filter.forEach(b=>b.classList.toggle('active',b.dataset.recordFilter===recordFilter));
 const rows=years().map(y=>{
   const all=qsFor(y).map(q=>id(y,q)),p=progressOf(all,'zhenti');
   if(!all.length)return'';
   if(recordFilter==='weak'&&!p.weak)return'';
   if(recordFilter==='unmarked'&&p.done>=p.total)return'';
   return `<button class="lab-year-row" data-open-year="${y}"><strong>${y}</strong><div><div style="display:flex;justify-content:space-between;gap:6px;margin-bottom:9px"><span>${mode==='paper'?'408 全国统考':mode==='subject'?SUBJECTS[subject]:topic==='all'?'考点练习':esc(topic)}</span><span>${p.done} / ${p.total} 题</span></div><div class="lab-year-bar"><i style="width:${p.rate}%"></i></div></div><b>↗</b></button>`;
 }).filter(Boolean);
 elements.yearList.innerHTML=rows.join('')||'<div class="lab-empty">当前筛选下没有对应年份记录，试试切换筛选条件。</div>';
 const recent=getNav('zhenti')?.last;
 if(recent&&validYear(recent.year)&&Number.isInteger(Number(recent.q))&&Number(recent.q)>=1&&Number(recent.q)<=47){
  const r=getRecord('zhenti',id(recent.year,recent.q));
  elements.resume.hidden=false;
  elements.resume.innerHTML=`<div><div class="lab-eyebrow">PICK UP WHERE YOU LEFT OFF</div><strong>${recent.year} 年 · 第 ${recent.q} 题 · ${SUBJECTS[subjectOf(recent.year,recent.q)]||'408 真题'}</strong><span>${r.answer?'本题已提交，可接着复习':'返回上次查看的真题位置'}</span></div><button class="lab-btn primary" type="button" data-resume-year="${recent.year}" data-resume-q="${recent.q}">继续上次 →</button>`;
 }else elements.resume.hidden=true;
}
async function openYear(year,targetQ=null){
 if(!validYear(year))return;
 const items=qsFor(year);
 if(!items.length){alert('该范围暂无可练习试题');return}
 activeIds=items;
 const n=Number(targetQ);
 const q=Number.isInteger(n)&&n>=1&&n<=47&&items.includes(n)?n:items.find(q=>!getRecord('zhenti',id(year,q)).answer)||items[0];
 active={year,q};
 revealed=false;
 elements.landing.hidden=true;elements.focus.hidden=false;
 await focusRender();
}
async function focusRender(){
 if(!active)return;
 const token=++renderToken,{year,q}=active,rec=getRecord('zhenti',id(year,q));
 elements.content.innerHTML='<div class="lab-loading">正在读取并核验题目…</div>';
 elements.breadcrumb.textContent=year+' 年 / '+SUBJECTS[subjectOf(year,q)]+' / 第 '+q+' 题';
 saveNav('zhenti',{mode,subject,topic,last:{year,q}});
 const panel=await yearData(year).catch(e=>{if(token===renderToken)elements.content.innerHTML='<div class="lab-error">'+esc(e.message||'题库加载失败')+'</div>';return null});
 if(token!==renderToken||!panel)return;
 loadedItem=panel.questions?.[q]||null;
 elements.content.innerHTML=questionHtml(loadedItem,{number:q,subject:SUBJECTS[subjectOf(year,q)],source:'zhenti',id:id(year,q),reveal:revealed});
 const note=$('[data-question-note]');if(note)note.value=rec.note||'';
 const select=rec.draftAnswer||rec.answer||'';
 $$('[data-choice]').forEach(b=>b.classList.toggle('is-selected',b.dataset.choice===select));
 $$('[data-mark]').forEach(b=>b.classList.toggle('active',b.dataset.mark===statusOf(rec)||b.dataset.mark===''&&statusOf(rec)==='unmarked'));
 const options=loadedItem?.options;
 const canGrade=loadedItem?.verification?.status==='verified'&&options&&Object.keys(options).length>0;
 $('[data-submit-answer]').hidden=!canGrade;
 $('[data-submit-answer]').disabled=!select||Boolean(rec.answer);
 $('[data-submit-answer]').textContent=rec.answer?'已提交':'提交答案';
 $('[data-show-answer]').textContent=revealed?'收起答案与解析':'查看答案与解析';
 $('[data-prev-question]').disabled=activeIds.indexOf(q)===0;
 $('[data-next-question]').disabled=activeIds.indexOf(q)===activeIds.length-1;
 renderSheet();
 renderStats();
}
function renderSheet(){
 if(!active)return;
 const year=active.year,ids=activeIds.map(q=>id(year,q)),p=progressOf(ids,'zhenti');
 elements.sheet.innerHTML=activeIds.map(q=>{
  const r=getRecord('zhenti',id(year,q)),s=statusOf(r);
  return `<button type="button" class="lab-sheet-button ${s==='unmarked'?'':s} ${q===active.q?'current':''}" data-jump="${q}" title="第 ${q} 题 · ${r.answer?'已作答':'未提交'}">${q}</button>`;
 }).join('');
 $('[data-sheet-count]').textContent=p.done+' / '+p.total;
 $('[data-sheet-current]').textContent='第 '+active.q+' 题';
}
function chooseQ(q){
 if(!active||!activeIds.includes(q))return;
 active.q=q;revealed=false;focusRender();
}
function switchMode(next){
 if(!['paper','subject','topic'].includes(next))return;
 mode=next;topic='all';active=null;elements.focus.hidden=true;elements.landing.hidden=false;
 saveNav('zhenti',{mode,subject,topic});renderLanding();
}
document.addEventListener('click',e=>{
 const el=e.target.closest('button');if(!el)return;
 if(el.dataset.mode){switchMode(el.dataset.mode);return}
 if(el.dataset.subject){subject=el.dataset.subject;topic='all';saveNav('zhenti',{subject,topic});renderLanding();return}
 if(el.dataset.topic!==undefined){topic=el.dataset.topic;saveNav('zhenti',{topic});renderLanding();return}
 if(el.dataset.recordFilter){recordFilter=el.dataset.recordFilter;renderLanding();return}
 if(el.dataset.openYear){openYear(Number(el.dataset.openYear));return}
 if(el.dataset.resumeYear){mode='paper';subject='ds';topic='all';renderSidebar();openYear(Number(el.dataset.resumeYear),Number(el.dataset.resumeQ));return}
 if(el.dataset.exitFocus!==undefined){active=null;elements.focus.hidden=true;elements.landing.hidden=false;renderLanding();return}
 if(el.dataset.goGraph!==undefined){location.href='/preview/graph/';return}
 if(el.dataset.jump){chooseQ(Number(el.dataset.jump));return}
 if(el.dataset.prevQuestion!==undefined){const i=activeIds.indexOf(active?.q);if(i>0)chooseQ(activeIds[i-1]);return}
 if(el.dataset.nextQuestion!==undefined){const i=activeIds.indexOf(active?.q);if(i>=0&&i<activeIds.length-1)chooseQ(activeIds[i+1]);return}
 if(el.dataset.choice){if(!active)return;const r=getRecord('zhenti',id(active.year,active.q));if(r.answer)return;patchRecord('zhenti',id(active.year,active.q),{draftAnswer:el.dataset.choice});focusRender();return}
 if(el.dataset.submitAnswer!==undefined){
  if(!active||!loadedItem||loadedItem.verification?.status!=='verified')return;
  const key=id(active.year,active.q),selected=getRecord('zhenti',key).draftAnswer;
  if(!selected||getRecord('zhenti',key).answer)return;
  grade('zhenti',key,loadedItem,selected);revealed=true;focusRender();return;
 }
 if(el.dataset.showAnswer!==undefined){revealed=!revealed;focusRender();return}
 if(el.dataset.mark!==undefined&&active){
  patchRecord('zhenti',id(active.year,active.q),{status:el.dataset.mark});focusRender();return;
 }
});
elements.yearFilter.addEventListener('change',()=>{yearFilter=elements.yearFilter.value;renderLanding()});
let noteTimer=0;document.addEventListener('input',e=>{
 if(!e.target.matches('[data-question-note]')||!active)return;
 const key=id(active.year,active.q),note=e.target.value;
 clearTimeout(noteTimer);noteTimer=setTimeout(()=>patchRecord('zhenti',key,{note}),220);
});
document.addEventListener('keydown',e=>{
 if(!active||e.target.closest('textarea,input,select')||e.ctrlKey||e.metaKey)return;
 if(e.key==='ArrowLeft'){e.preventDefault();const n=activeIds.indexOf(active.q);if(n>0)chooseQ(activeIds[n-1])}
 if(e.key==='ArrowRight'){e.preventDefault();const n=activeIds.indexOf(active.q);if(n<activeIds.length-1)chooseQ(activeIds[n+1])}
 if(e.key==='Escape'){active=null;elements.focus.hidden=true;elements.landing.hidden=false;renderLanding()}
});
async function init(){
 try{
  [subjectData,topicData]=await Promise.all([subjectIndex(),topicIndex()]);
  renderLanding();
  const yy=Number(params.get('year')),qq=Number(params.get('q'));
  if(validYear(yy)&&Number.isInteger(qq)&&qq>=1&&qq<=47){mode='paper';renderSidebar();openYear(yy,qq)}
 }catch(e){elements.yearList.innerHTML='<div class="lab-error">真题目录载入失败：'+esc(e.message)+'。请刷新重试。</div>'}
}
init();
