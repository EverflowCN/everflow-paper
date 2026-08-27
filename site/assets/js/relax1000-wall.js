import{loadRelaxData,loadRecords,questionState,questionNumber,esc,subjectName,idKey}from'./relax1000-core.js?v=20260825-bank1';

const CONTEXT_KEY='everflow-relax-reader-context-v1';
const sourceBar=document.querySelector('.bank-source-shell');
const root=document.createElement('main');
root.className='relax-bank-root relax-wall-root';
root.innerHTML=`<section class="relax-loading"><strong>正在读取 Relax1000…</strong><span>题库正在载入，首次打开可能稍慢。</span><i></i></section>`;
(sourceBar||document.querySelector('header'))?.after(root);

function readContext(){
  try{
    const value=JSON.parse(sessionStorage.getItem(CONTEXT_KEY)||'null');
    if(!value||typeof value!=='object'||Date.now()-Number(value.savedAt||0)>7200000)return null;
    return value;
  }catch{return null}
}
const restored=readContext();
let data=null,subject=restored?.subject||'ds',chapter=restored?.chapter||'all',filter=restored?.filter||'all',query=restored?.query||'',visibleQuestions=[],dirty=false;
try{if(!restored?.subject)subject=localStorage.getItem('everflow-408-relax-subject')||'ds'}catch{}

const getSubject=()=>data?.subjects?.find(item=>item.id===subject)||data?.subjects?.[0];
const chapterMap=()=>new Map((getSubject()?.chapters||[]).map(item=>[item.id,item]));
const allForSubject=()=>data.questions.filter(question=>question.subjectId===subject);
function filtered(){
  const records=loadRecords(),needle=query.trim().toLowerCase();
  return allForSubject().filter(question=>{
    if(chapter!=='all'&&question.chapterId!==chapter)return false;
    const state=questionState(question,records);
    if(filter==='unseen'&&state.seen)return false;
    if(filter==='seen'&&!state.seen)return false;
    if(filter==='wrong'&&!state.wrong)return false;
    if(filter==='bookmarked'&&!state.favorite)return false;
    if(needle){const hay=`${question.stem||''} ${question.chapter||''} ${question.explanation||''}`.toLowerCase();if(!hay.includes(needle))return false}
    return true;
  });
}
function stats(){
  const records=loadRecords(),questions=allForSubject();let seen=0,wrong=0,mastered=0;
  questions.forEach(question=>{const state=questionState(question,records);if(state.seen)seen++;if(state.wrong)wrong++;if(state.rec.status==='mastered')mastered++});
  return{total:questions.length,seen,wrong,mastered,rate:questions.length?Math.round(seen/questions.length*100):0};
}
function statusClass(question,records){
  const state=questionState(question,records),classes=[];
  if(state.rec.status)classes.push(`status-${state.rec.status}`);
  if(state.wrong)classes.push('is-wrong');else if(state.rec.correct===true)classes.push('is-correct');
  if(state.favorite)classes.push('is-bookmarked');
  if(state.seen)classes.push('is-seen');
  return classes.join(' ');
}
function saveContext(selectedId=''){
  try{sessionStorage.setItem(CONTEXT_KEY,JSON.stringify({version:1,ids:visibleQuestions.map(idKey),selectedId,subject,chapter,filter,query,savedAt:Date.now()}))}catch{}
}
function openReader(id){
  saveContext(id);
  try{localStorage.setItem('everflow-408-relax-subject',subject)}catch{}
  location.assign(`/zhenti/relax-reader/?id=${encodeURIComponent(id)}`);
}
function render({focusSearch=false}={}){
  const subj=getSubject();if(!subj)return;
  if(!data.subjects.some(item=>item.id===subject))subject=subj.id;
  const s=stats(),records=loadRecords();visibleQuestions=filtered();
  const chapters=chapterMap(),groups=new Map();
  visibleQuestions.forEach(question=>{const key=question.chapterId||'other';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(question)});
  const subjectTabs=data.subjects.map(item=>`<button type="button" data-relax-subject="${esc(item.id)}" class="${item.id===subject?'active':''}">${esc(subjectName(item.id,item.name))}<small>${item.chapters?.reduce((n,c)=>n+(Number(c.count)||0),0)||data.questions.filter(q=>q.subjectId===item.id).length}</small></button>`).join('');
  const chapterButtons=[`<button type="button" data-relax-chapter="all" class="${chapter==='all'?'active':''}"><span>全部章节</span><b>${allForSubject().length}</b></button>`,...(subj.chapters||[]).map(item=>`<button type="button" data-relax-chapter="${esc(item.id)}" class="${item.id===chapter?'active':''}"><span>${esc(item.name)}</span><b>${item.count??data.questions.filter(q=>q.chapterId===item.id).length}</b></button>`)].join('');
  const groupHtml=[...groups.entries()].map(([chapterId,questions])=>{
    const chapterInfo=chapters.get(chapterId),title=chapterInfo?.name||questions[0]?.chapter||'其他';
    const chips=questions.map((question,index)=>`<button type="button" class="relax-q-chip ${statusClass(question,records)}" data-relax-id="${esc(idKey(question))}" title="${esc((question.stem||'').slice(0,100))}"><span>${esc(questionNumber(question,index))}</span>${questionState(question,records).favorite?'<i>★</i>':''}</button>`).join('');
    return `<section class="relax-chapter-block"><header><div><h3>${esc(title)}</h3><span>${questions.length} 题</span></div><small>${subjectName(subject)}</small></header><div class="relax-chip-grid">${chips}</div></section>`;
  }).join('')||'<section class="relax-empty"><strong>没有匹配题目</strong><p>更换章节、状态筛选或清空搜索后再试。</p></section>';
  root.innerHTML=`
    <section class="relax-wall-hero"><div><div class="eyebrow">RELAX 1000 QUESTION BANK</div><h1>${esc(subjectName(subject,subj.name))} · Relax1000</h1><p>按科目与章节整理，支持状态筛选、收藏、笔记与快捷作答。点题后进入独立阅读器，不再让整面题号墙参与题目渲染。</p></div><div class="relax-stats"><div><strong>${s.seen}</strong><span>已做</span></div><div><strong>${s.wrong}</strong><span>待掌握错题</span></div><div><strong>${s.mastered}</strong><span>已掌握</span></div><div><strong>${s.rate}%</strong><span>完成率</span></div></div></section>
    <section class="relax-subject-tabs">${subjectTabs}</section>
    <div class="relax-wall-workspace"><aside class="relax-sidebar"><div class="relax-side-title"><strong>章节目录</strong><span>${subj.chapters?.length||0} 章</span></div><div class="relax-chapter-list">${chapterButtons}</div></aside><section class="relax-wall-main"><div class="relax-toolbar"><label class="relax-search"><span>⌕</span><input data-relax-search type="search" value="${esc(query)}" placeholder="搜索题干、章节或解析"></label><div class="relax-filter" role="group"><button data-relax-filter="all" class="${filter==='all'?'active':''}">全部</button><button data-relax-filter="unseen" class="${filter==='unseen'?'active':''}">未做</button><button data-relax-filter="wrong" class="${filter==='wrong'?'active':''}">错题</button><button data-relax-filter="bookmarked" class="${filter==='bookmarked'?'active':''}">收藏</button><button data-relax-filter="seen" class="${filter==='seen'?'active':''}">已做</button></div><span class="relax-result-count">当前 ${visibleQuestions.length} 题</span></div><div class="relax-question-groups">${groupHtml}</div></section></div>`;
  bindRoot();dirty=false;
  if(focusSearch)requestAnimationFrame(()=>{const input=root.querySelector('[data-relax-search]');if(input){input.focus({preventScroll:true});const end=input.value.length;input.setSelectionRange?.(end,end)}});
}
function bindRoot(){
  root.querySelectorAll('[data-relax-subject]').forEach(button=>button.addEventListener('click',()=>{subject=button.dataset.relaxSubject;chapter='all';query='';try{localStorage.setItem('everflow-408-relax-subject',subject)}catch{}render()}));
  root.querySelectorAll('[data-relax-chapter]').forEach(button=>button.addEventListener('click',()=>{chapter=button.dataset.relaxChapter;render()}));
  root.querySelectorAll('[data-relax-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.relaxFilter;render()}));
  const search=root.querySelector('[data-relax-search]');if(search)search.addEventListener('input',event=>{query=event.target.value;window.clearTimeout(search._timer);search._timer=window.setTimeout(()=>render({focusSearch:true}),220)});
  root.querySelectorAll('[data-relax-id]').forEach(button=>button.addEventListener('click',()=>openReader(button.dataset.relaxId)));
}

document.addEventListener('everflow:relax-records-change',()=>{dirty=true;if(data&&!root.hidden)render()});
new MutationObserver(()=>{if(data&&!root.hidden&&dirty)render()}).observe(root,{attributes:true,attributeFilter:['hidden']});

loadRelaxData().then(value=>{
  data=value;
  if(!data.subjects.some(item=>item.id===subject))subject=data.subjects[0]?.id||'ds';
  const subj=getSubject();if(chapter!=='all'&&!subj?.chapters?.some(item=>item.id===chapter))chapter='all';
  render();
}).catch(error=>{
  console.error('Everflow Relax1000 wall failed',error);
  root.innerHTML=`<section class="relax-load-error"><strong>Relax1000 载入失败</strong><p>${esc(error.message||error)}</p><button type="button" data-relax-retry>重新载入</button></section>`;
  root.querySelector('[data-relax-retry]')?.addEventListener('click',()=>location.reload());
});
