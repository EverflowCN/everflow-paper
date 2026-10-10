import {YEARS,SUBJECTS,SUBSHORT,esc,yearData,subjectIndex,relaxData,getRecord,getRecords,getNav,saveNav,patchRecord,statusOf,questionHtml,optionsFor,grade,progressOf} from './core.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const els={layout:$('[data-graph-layout]'),matrix:$('[data-graph-matrix]'),scroll:$('[data-graph-scroll]'),
 detail:$('[data-graph-detail]'),body:$('[data-detail-body]'),filter:$('[data-graph-filter]'),subject:$('[data-graph-subject]'),
 title:$('[data-detail-title]'),heading:$('[data-graph-heading]'),caption:$('[data-graph-caption]'),
 total:$('[data-stat-total]'),done:$('[data-stat-done]'),weak:$('[data-stat-weak]'),rate:$('[data-stat-rate]'),
 visible:$('[data-visible-summary]'),zoom:$('[data-zoom-level]'),link:$('[data-open-workspace]')};
const params=new URLSearchParams(location.search), initial=getNav('zhenti');
let source=params.get('source')==='relax'?'relax':params.get('source')==='zhenti'?'zhenti':'zhenti';
let subject='all',filter='all',size=20,rows=[],entries=[],chosen=null,showAnswer=false,loadCounter=0,relax=null,subjects=null;
const yearly=new Map(),relaxMap=new Map();
const codeFor=(year,q)=>year+'-'+q;
const sourceKey=()=>source==='relax'?'relax':'zhenti';
function getRecordFast(id, records){return records?.[id]||{}}
function stateMatches(entry, record){
 const status=statusOf(record);
 const selectedSubj=subject==='all'||entry.subject===subject;
 const selectedStatus=filter==='all'||(filter==='weak'&&(status==='weak'||status==='fuzzy'))
 ||(filter==='mastered'&&status==='mastered')
 ||(filter==='unmarked'&&status==='unmarked')
 ||(filter==='wrong'&&record.correct===false);
 return selectedSubj&&selectedStatus;
}
function noteFrom(entry){return source==='relax'?`${SUBJECTS[entry.subject]} · ${entry.chapter} · 第 ${entry.number} 题`:`${entry.year} 年 · 第 ${entry.q} 题 · ${SUBJECTS[entry.subject]}`}
function cellTitle(entry, rec){return `${noteFrom(entry)} · ${statusOf(rec)==='unmarked'?'未标记':{mastered:'熟练',fuzzy:'模糊',weak:'不会'}[statusOf(rec)]}${rec.answer?' · 已作答':''}`;}
async function readRows(next){
 if(next==='zhenti'){
  subjects=await subjectIndex().catch(()=>null);
  rows=YEARS.map(y=>{
   const items=Array.from({length:47},(_,i)=>{
    const q=i+1,code=codeFor(y,q),data=subjects?.years?.[y]||{};
    const subject=Object.entries(data).find(([,qs])=>qs.includes(q))?.[0]||(q<=10||q===41||q===42?'ds':q<=22||q===43||q===44?'co':q<=32||q===45||q===46?'os':'cn');
    return{year:y,q,id:code,subject,number:q};
   });
   return{label:String(y),items};
  });
 }else{
  relax=await relaxData();
  relaxMap.clear();for(const q of relax.questions)relaxMap.set(String(q.id),q);
  const groupMap=new Map();
  for(const q of relax.questions){const key=q.subjectId+'\u0000'+q.chapterId;if(!groupMap.has(key))groupMap.set(key,[]);groupMap.get(key).push(q)}
  const chunks=[];
  for(const s of relax.subjects)for(const [i,c] of (s.chapters||[]).entries()){
   const row=groupMap.get(s.id+'\u0000'+c.id)||[];
   for(let p=0;p<Math.max(1,Math.ceil(row.length/45));p++){
    const items=row.slice(p*45,(p+1)*45).map(q=>({id:String(q.id),subject:s.id,number:Number(String(q.id).split('-').at(-1)),chapter:c.name,question:q}));
    chunks.push({label:`${SUBSHORT[s.id]} · ${i+1}${p?' / '+(p+1):''}`,longLabel:`${s.name} · ${c.name}`,items});
   }
  }
  rows=chunks;
 }
 entries=rows.flatMap(r=>r.items);
}
function fillStats(){
 const all=getRecords(sourceKey());
 let done=0,weak=0;
 for(const e of entries){const r=getRecordFast(e.id,all);if(r.answer||r.reviewed||r.status)done++;if(['weak','fuzzy'].includes(r.status))weak++}
 els.total.textContent=entries.length.toLocaleString('zh-CN');
 els.done.textContent=done.toLocaleString('zh-CN');
 els.weak.textContent=weak;
 els.rate.textContent=entries.length?Math.round(done/entries.length*100)+'%':'0%';
}
function resizeGrid(){
 const grid=els.matrix;
 const cols=source==='relax'?45:47;
 grid.style.setProperty('--gcols',cols);
 grid.style.setProperty('--gsize',size+'px');
 els.zoom.textContent=size+'px';
}
function renderGrid(){
 const grid=els.matrix,all=getRecords(sourceKey()),cols=source==='relax'?45:47;
 resizeGrid();
 grid.classList.toggle('labels-wide',source==='relax');
 const parts=[];
 parts.push('<span class="lab-m-index top corner"></span>');
 for(let i=1;i<=cols;i++)parts.push('<span class="lab-m-index top">'+i+'</span>');
 let visible=0;
 for(const row of rows){
  parts.push('<span class="lab-m-index row" title="'+esc(row.longLabel||row.label)+'">'+esc(row.label)+'</span>');
  for(let i=0;i<cols;i++){
   const entry=row.items[i];
   if(!entry){parts.push('<span class="lab-m-blank"></span>');continue}
   const record=getRecordFast(entry.id,all),status=statusOf(record),match=stateMatches(entry,record);
   if(match)visible++;
   const result=record.correct===true?'correct':record.correct===false?'wrong':'';
   parts.push(`<button type="button" class="lab-m-cell ${status}${match?'':' is-dim'}${chosen?.id===entry.id?' current':''}" data-graph-key="${esc(entry.id)}" data-result="${result}" title="${esc(cellTitle(entry,record))}" aria-label="${esc(cellTitle(entry,record))}"></button>`);
  }
 }
 grid.innerHTML=parts.join('');
 grid.setAttribute('aria-busy','false');
 els.visible.textContent=`当前高亮 ${visible.toLocaleString('zh-CN')} / ${entries.length.toLocaleString('zh-CN')} 题`;
 fillStats();
}
function fitGrid(){
 const available=Math.max(350,els.scroll.clientWidth-55-(source==='relax'?178:73)),cols=source==='relax'?45:47;
 const next=Math.floor((available-cols*4)/cols);
 size=Math.max(13,Math.min(27,next));
 renderGrid();
}
function updateFilters(){
 $$('[data-graph-source]').forEach(b=>b.classList.toggle('active',b.dataset.graphSource===source));
 els.subject.value=subject;els.filter.value=filter;
 els.heading.textContent=source==='zhenti'?'408 真题 · 年份 × 题号':'Relax1000 · 章节 × 题序';
 els.caption.textContent=source==='zhenti'?'2009—2026 · 18 年 · 共 846 题':'按四科及各章节分组 · 每行最多 45 题';
}
async function switchSource(next){
 if(!['zhenti','relax'].includes(next)||!next)return;
 ++loadCounter;const token=loadCounter;source=next;subject='all';filter='all';
 chosen=null;els.detail.hidden=true;els.layout.classList.remove('has-detail');els.matrix.innerHTML='<div class="lab-loading">正在读取图谱数据…</div>';els.matrix.setAttribute('aria-busy','true');
 updateFilters();
 try{await readRows(next);if(token!==loadCounter)return;renderGrid();restoreScroll(next)}
 catch(error){els.matrix.innerHTML='<div class="lab-error">图谱加载失败：'+esc(error.message)+'。请刷新重试。</div>';els.matrix.setAttribute('aria-busy','false')}
}
function rememberScroll(){
 try{const key='everflow-preview-graph-scroll-'+source;sessionStorage.setItem(key,JSON.stringify({left:els.scroll.scrollLeft,top:els.scroll.scrollTop}))}catch{}
}
function restoreScroll(next){
 try{const pos=JSON.parse(sessionStorage.getItem('everflow-preview-graph-scroll-'+next)||'null');if(pos)requestAnimationFrame(()=>els.scroll.scrollTo({left:pos.left||0,top:pos.top||0}))}catch{}
}
let scrollDebounce=0;els.scroll.addEventListener('scroll',()=>{clearTimeout(scrollDebounce);scrollDebounce=setTimeout(rememberScroll,150)},{passive:true});
function markActive(key){
 chosen=entries.find(e=>e.id===key)||null;
 els.matrix.querySelector('.lab-m-cell.current')?.classList.remove('current');
 if(chosen)els.matrix.querySelector('[data-graph-key="'+CSS.escape(key)+'"]')?.classList.add('current');
}
async function openDetail(id){
 const entry=entries.find(e=>e.id===id);if(!entry)return;
 markActive(id);const token=++loadCounter,ourSource=source;
 showAnswer=false;els.detail.hidden=false;els.layout.classList.add('has-detail');
 els.title.textContent=source==='relax'?SUBJECTS[entry.subject]+' · Relax1000':entry.year+' 年 · 第 '+entry.q+' 题';
 els.body.innerHTML='<div class="lab-loading">正在核验并读取试题…</div>';
 els.link.hidden=source==='relax';
 if(source==='zhenti')els.link.href='/preview/zhenti/?year='+entry.year+'&q='+entry.q;
 saveNav(sourceKey(),{selected:id,source,last:source==='zhenti'?{year:entry.year,q:entry.q}:entry.id});
 let item=entry.question||null;
 if(ourSource==='zhenti'){
  if(!yearly.has(entry.year))yearly.set(entry.year,yearData(entry.year).catch(e=>{yearly.delete(entry.year);throw e}));
  try{item=(await yearly.get(entry.year)).questions?.[entry.q]||null}catch(e){if(token===loadCounter)els.body.innerHTML='<div class="lab-error">'+esc(e.message)+'</div>';return}
 }
 if(token!==loadCounter||source!==ourSource)return;
 paintDetail(entry,item);
}
function paintDetail(entry,item){
 if(!chosen||chosen.id!==entry.id||!item)return;
 const rec=getRecord(sourceKey(),entry.id);
 els.body.innerHTML=questionHtml(item,{number:entry.number,subject:SUBJECTS[entry.subject],source:sourceKey(),id:entry.id,reveal:showAnswer});
 const opts=optionsFor(item);
 $('[data-detail-submit]').hidden=!opts.length||source==='zhenti'&&item.verification?.status!=='verified';
 $('[data-detail-submit]').disabled=Boolean(rec.answer)||!Boolean(rec.draftAnswer);
 $('[data-detail-submit]').textContent=rec.answer?'已提交':'提交答案';
 $('[data-detail-answer]').textContent=showAnswer?'收起解析':'查看答案';
 $$('[data-detail-mark]').forEach(b=>b.classList.toggle('active',b.dataset.detailMark===statusOf(rec)||b.dataset.detailMark===''&&statusOf(rec)==='unmarked'));
 if(!opts.length)els.body.insertAdjacentHTML('beforeend','<p class="lab-hint">本题请在纸上完成推导，再标记「熟练 / 模糊 / 不会」即可。</p>');
}
function closeDetail(){
 ++loadCounter;chosen=null;els.detail.hidden=true;els.layout.classList.remove('has-detail');
 els.matrix.querySelector('.lab-m-cell.current')?.classList.remove('current');
}
function jumpWeak(){
 const rec=getRecords(sourceKey()),weak=entries.filter(e=>['fuzzy','weak'].includes(rec[e.id]?.status));
 if(!weak.length){els.visible.textContent='还没有标记为模糊或不会的题目';return}
 const index=weak.findIndex(e=>e.id===chosen?.id),next=weak[(index+1)%weak.length];
 openDetail(next.id);
 requestAnimationFrame(()=>els.matrix.querySelector('[data-graph-key="'+CSS.escape(next.id)+'"]')?.scrollIntoView({block:'nearest',inline:'nearest'}));
}
async function handleClick(e){
 const btn=e.target.closest('button,[data-open-workspace]');if(!btn)return;
 if(btn.dataset.graphSource){switchSource(btn.dataset.graphSource);return}
 if(btn.dataset.zoom){const action=btn.dataset.zoom;if(action==='in')size=Math.min(35,size+3);else if(action==='out')size=Math.max(13,size-3);else if(action==='standard')size=23;else if(action==='fit'){fitGrid();return}renderGrid();return}
 if(btn.dataset.resetFilters!==undefined){filter='all';subject='all';updateFilters();renderGrid();return}
 if(btn.dataset.nextWeak!==undefined){jumpWeak();return}
 if(btn.dataset.graphKey){openDetail(btn.dataset.graphKey);return}
 if(btn.dataset.closeDetail!==undefined){closeDetail();return}
 if(!chosen)return;
 const entry=chosen,item=entry.question||await (async()=>{try{return (await (yearly.get(entry.year)||yearData(entry.year))).questions?.[entry.q]}catch{return null}})();
 if(!item)return;
 if(btn.dataset.choice){
  const r=getRecord(sourceKey(),entry.id);if(r.answer)return;
  patchRecord(sourceKey(),entry.id,{draftAnswer:btn.dataset.choice});paintDetail(entry,item);renderGrid();return;
 }
 if(btn.dataset.detailSubmit!==undefined){
  const r=getRecord(sourceKey(),entry.id),selected=r.draftAnswer;
  if(selected&&!r.answer&&(source==='relax'||item.verification?.status==='verified')){grade(sourceKey(),entry.id,item,selected);showAnswer=true;paintDetail(entry,item);renderGrid()}return;
 }
 if(btn.dataset.detailAnswer!==undefined){showAnswer=!showAnswer;paintDetail(entry,item);return}
 if(btn.dataset.detailMark!==undefined){patchRecord(sourceKey(),entry.id,{status:btn.dataset.detailMark});paintDetail(entry,item);renderGrid();return}
}
document.addEventListener('click',e=>{handleClick(e).catch(err=>console.warn('Preview graph interaction error',err))});
els.subject.addEventListener('change',()=>{subject=els.subject.value;renderGrid()});
els.filter.addEventListener('change',()=>{filter=els.filter.value;renderGrid()});
document.addEventListener('keydown',e=>{
 if(e.target.closest('input,textarea,select')||e.ctrlKey||e.altKey||e.metaKey)return;
 if(e.key==='Escape'){if(chosen){e.preventDefault();closeDetail()}return}
 const cells=[...els.matrix.querySelectorAll('.lab-m-cell')];if(!cells.length)return;
 const active=cells.findIndex(x=>x.dataset.graphKey===chosen?.id);
 if(e.key==='Enter'&&document.activeElement?.matches('.lab-m-cell')){e.preventDefault();openDetail(document.activeElement.dataset.graphKey);return}
 const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-(source==='relax'?45:47),ArrowDown:source==='relax'?45:47};
 if(!(e.key in offsets))return;
 const anchor=active<0?0:active,other=Math.max(0,Math.min(cells.length-1,anchor+offsets[e.key]));
 e.preventDefault();const target=cells[other];if(target){target.focus();target.scrollIntoView({block:'nearest',inline:'nearest'});if(chosen)openDetail(target.dataset.graphKey)}
});
window.addEventListener('pageshow',e=>{if(e.persisted)renderGrid()});
switchSource(source);
