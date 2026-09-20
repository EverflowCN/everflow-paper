import{loadRelaxData,patchRecord,syncAnswerCompatibility,toggleBookmark,questionState,optionEntries,assetUrl,questionImages,explanationImages,imageMarkup,usesQuestionImageFallback,questionNumber,subjectName,esc}from'./relax1000-core.js?v=20260904-editor1';
import{richText,inlineText,verification}from'./question-content-v1.js?v=20260904-question2';
import{applyZhentiOverrides}from'./question-overrides-v1.js?v=20260904-editor1';

const app=document.querySelector('[data-paper-builder]');
if(!app)throw new Error('408 paper builder root missing');

const $=s=>app.querySelector(s),$$=s=>[...app.querySelectorAll(s)];
const els={builder:$('[data-builder]'),paper:$('[data-paper]'),result:$('[data-result]'),subjects:$('[data-subjects]'),ranges:$('[data-ranges]'),generate:$('[data-generate]'),tip:$('[data-builder-tip]'),rangeTitle:$('[data-range-title]'),rangeNote:$('[data-range-note]'),paperTitle:$('[data-paper-title]'),progress:$('[data-progress]'),answered:$('[data-answered]'),timer:$('[data-timer]'),grid:$('[data-answer-grid]'),card:$('[data-question-card]'),prev:$('[data-prev]'),next:$('[data-next]'),submit:$('[data-submit]'),exit:$('[data-exit]'),bankTotal:$('[data-bank-total]'),seenTotal:$('[data-seen-total]'),wrongTotal:$('[data-wrong-total]'),builderExport:$('[data-pdf-export-builder]'),exportTrigger:$('[data-pdf-export]'),exportLayer:$('[data-export-layer]'),exportAdmin:$('[data-export-admin]'),exportSteps:$('[data-export-steps]'),exportStatus:$('[data-export-status-label]'),exportWorker:$('[data-export-worker]'),exportPosition:$('[data-export-position]'),exportMessage:$('[data-export-message]'),exportStart:$('[data-export-start]'),exportBackground:$('[data-export-background]'),exportPreview:$('[data-export-preview]'),exportDownload:$('[data-export-download]'),exportAccess:$('[data-export-access]'),exportAccessTitle:$('[data-export-access-title]'),exportAccessCopy:$('[data-export-access-copy]'),exportAccessAction:$('[data-export-access-action]'),exportEta:$('[data-export-eta]'),exportEtaRange:$('[data-export-eta-range]'),exportCountdown:$('[data-export-countdown]')};

const YEARS=Array.from({length:18},(_,i)=>2009+i);
const SUBJECT_ORDER=['ds','co','os','cn'];
const SUBJECT_LABEL={ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络'};
const QUOTA={ds:11,co:11,os:10,cn:8};
const ZHENTI_KEY='everflow-408-zhenti-wall-v1';
const SOURCE_KEY='everflow-408-paper-source-v1';
const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const choose=(list,count,random=true)=>(random?shuffle(list):[...list]).slice(0,Math.max(0,count));
const storage={get:key=>{try{return localStorage.getItem(key)}catch{return null}},set:(key,value)=>{try{localStorage.setItem(key,value)}catch{}},json:(key,fallback={})=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?v:fallback}catch{return fallback}}};

let relaxData=null,relaxQuestions=[],zhentiQuestions=[];
let relaxPromise=null,zhentiPromise=null,loading=false,zhentiRecordsCache=null;
let relaxChapterCounts=new Map(),zhentiYearCounts=new Map();
let source=storage.get(SOURCE_KEY)==='relax'?'relax':'zhenti',mode='simulation',scope='all',size=40;
let selectedYears=new Set(YEARS.map(String)),selectedChapters=new Set();
let paper=[],answers={},index=0,seconds=0,timer=null;

function normalizeRelax(q){return{source:'relax',uid:`relax:${q.id}`,raw:q,id:q.id,subjectId:q.subjectId,chapterId:q.chapterId,chapter:q.chapter||'',stem:q.stem||'',answer:String(q.answer||''),explanation:q.explanation||'',number:questionNumber(q),options:null}}
function normalizeZhenti(year,item){return{source:'zhenti',uid:`zhenti:${year}-${item.number}`,id:`${year}-${item.number}`,year:Number(year),number:Number(item.number),subjectId:item.subject||'ds',chapterId:String(year),chapter:`${year} 年真题`,stem:item.stem||'',answer:String(item.answer||''),explanation:item.analysis||'',options:item.options||{},figures:Array.isArray(item.figures)?item.figures:[],raw:item}}

async function loadZhenti(){
  const manifest=await fetch('/data/zhenti/manifest.json?v=20260825-paper9',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error(`真题目录 HTTP ${r.status}`);return r.json()});
  const entries=Object.entries(manifest?.years||{}).filter(([,meta])=>Array.isArray(meta.verifiedQuestions)&&meta.verifiedQuestions.length);
  const groups=await Promise.all(entries.map(async([year,meta])=>{
    let data=await fetch(`/data/zhenti/${year}.json?v=20260904-editor1`,{cache:'force-cache'}).then(r=>r.ok?r.json():null).catch(()=>null);
    if(!data)return[];
    data=await applyZhentiOverrides(data,year);
    return meta.verifiedQuestions.map(n=>data.questions?.[String(n)]).filter(item=>item?.verification?.status==='verified'&&item?.options&&/^[A-D]$/.test(String(item.answer||''))).map(item=>normalizeZhenti(year,item));
  }));
  return groups.flat();
}
async function ensureRelax(){
  if(relaxData)return relaxData;
  if(!relaxPromise)relaxPromise=loadRelaxData().then(data=>{
    relaxData=data;
    relaxQuestions=data.questions.map(normalizeRelax);
    selectedChapters=new Set(data.subjects.flatMap(s=>s.chapters.map(c=>c.id)));
    relaxChapterCounts=new Map();
    for(const q of relaxQuestions)relaxChapterCounts.set(q.chapterId,(relaxChapterCounts.get(q.chapterId)||0)+1);
    return data;
  }).catch(error=>{relaxPromise=null;throw error});
  return relaxPromise;
}
async function ensureZhenti(){
  if(zhentiQuestions.length)return zhentiQuestions;
  if(!zhentiPromise)zhentiPromise=loadZhenti().then(rows=>{
    zhentiQuestions=rows;
    zhentiYearCounts=new Map();
    for(const q of rows)zhentiYearCounts.set(q.year,(zhentiYearCounts.get(q.year)||0)+1);
    return rows;
  }).catch(error=>{zhentiPromise=null;throw error});
  return zhentiPromise;
}
async function ensureSource(which=source){return which==='relax'?ensureRelax():ensureZhenti()}
async function ensureModeData(){if(mode==='wrong'){await Promise.all([ensureRelax(),ensureZhenti()]);return}await ensureSource(source)}

function zhentiRecords(){if(zhentiRecordsCache)return zhentiRecordsCache;zhentiRecordsCache=storage.json(ZHENTI_KEY,{});return zhentiRecordsCache}
function relaxRecord(q){return questionState(q.raw).rec}
function recordState(q){
  if(q.source==='relax'){
    const state=questionState(q.raw);return{rec:state.rec,seen:state.seen,wrong:state.wrong||state.rec.status==='weak',favorite:state.favorite};
  }
  const rec=zhentiRecords()[`${q.year}-${q.number}`]||{};return{rec,seen:Boolean(rec.answer||rec.reviewed||rec.status||Number.isFinite(Number(rec.selfScore))),wrong:rec.correct===false||rec.status==='weak',favorite:Boolean(rec.favorite)};
}
function patchZhenti(q,patch){
  const all=zhentiRecords(),key=`${q.year}-${q.number}`,prev=all[key]||{},next={...prev,...patch,updatedAt:new Date().toISOString()};
  Object.keys(next).forEach(k=>next[k]===undefined&&delete next[k]);all[key]=next;zhentiRecordsCache=all;storage.set(ZHENTI_KEY,JSON.stringify(all));
  document.dispatchEvent(new CustomEvent('everflow:zhenti-records-change',{detail:{year:q.year,q:q.number}}));return next;
}
function toggleFavorite(q){if(q.source==='relax'){toggleBookmark(q.raw);return}const s=recordState(q);patchZhenti(q,{favorite:!s.favorite})}
function persistAnswer(q,answer,correct){if(!answer)return;if(q.source==='relax'){const prev=relaxRecord(q);patchRecord(q.raw.id,{answer,draftAnswer:answer,correct,reviewed:true,attempts:(Number(prev.attempts)||0)+1});syncAnswerCompatibility(q.raw,correct);return}const prev=recordState(q).rec;patchZhenti(q,{answer,draftAnswer:answer,correct,reviewed:true,attempts:(Number(prev.attempts)||0)+1})}

function sourcePool(which=source){return which==='relax'?relaxQuestions:zhentiQuestions}
function selectedPool(which=source){
  let pool=sourcePool(which).filter(q=>scope==='all'||q.subjectId===scope);
  if(which==='zhenti')pool=pool.filter(q=>selectedYears.has(String(q.year)));
  else pool=pool.filter(q=>selectedChapters.has(q.chapterId));
  return pool;
}
function checkedStates(){return $$('.relax-filters input:checked').map(i=>i.value)}
function filterByState(pool){
  const checked=checkedStates();if(!checked.length||checked.includes('all'))return pool;
  return pool.filter(q=>{const s=recordState(q);return checked.some(v=>v==='unseen'?!s.seen:v==='wrong'?s.wrong:v==='seen'?s.seen:v==='favorite'?s.favorite:false)});
}
function wrongPool(){return[...zhentiQuestions,...relaxQuestions].filter(q=>(scope==='all'||q.subjectId===scope)&&recordState(q).wrong)}
function activePool(){return mode==='wrong'?wrongPool():filterByState(selectedPool(source))}

function syncStats(){
  const pool=mode==='wrong'?[...zhentiQuestions,...relaxQuestions]:sourcePool(source);let seen=0,wrong=0;
  for(const q of pool){const s=recordState(q);if(s.seen)seen++;if(s.wrong)wrong++}
  els.bankTotal.textContent=pool.length;els.seenTotal.textContent=seen;els.wrongTotal.textContent=wrong;
}
function renderSources(){$$('[data-source]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.source===source);btn.disabled=loading||mode==='wrong'})}
function renderSubjects(){
  const pool=mode==='wrong'?[...zhentiQuestions,...relaxQuestions]:sourcePool(source);
  const counts=Object.fromEntries(SUBJECT_ORDER.map(s=>[s,0]));for(const q of pool)if(q.subjectId in counts)counts[q.subjectId]++;
  els.subjects.innerHTML=`<button type="button" data-subject="all" class="${scope==='all'?'active':''}"><b>全部</b><small>${pool.length} 题</small></button>`+SUBJECT_ORDER.map(s=>`<button type="button" data-subject="${s}" class="${scope===s?'active':''}" ${mode==='simulation'?'disabled':''}><b>${SUBJECT_LABEL[s]}</b><small>${counts[s]} 题</small></button>`).join('');
  els.subjects.querySelectorAll('[data-subject]').forEach(btn=>btn.addEventListener('click',()=>{if(mode==='simulation')return;scope=btn.dataset.subject;renderSubjects();renderRanges();syncStats()}));
}
function renderRanges(){
  if(mode==='wrong'){
    els.rangeTitle.textContent='跨题库错题';els.rangeNote.textContent='自动合并 408 真题与 Relax1000 中的未掌握错题；可继续用上方科目限制范围。';
    let z=0,r=0;for(const q of zhentiQuestions)if(recordState(q).wrong)z++;for(const q of relaxQuestions)if(recordState(q).wrong)r++;
    els.ranges.innerHTML=`<section class="paper-wrong-summary"><div><b>408 真题错题</b><strong>${z}</strong></div><div><b>Relax1000 错题</b><strong>${r}</strong></div><p>错题以“作答错误”或标记为“不会”为准。</p></section>`;return;
  }
  if(source==='zhenti'){
    els.rangeTitle.textContent='科目与年份';els.rangeNote.textContent='选择参与组卷的已核验真题年份；默认全部年份。';
    els.ranges.innerHTML=`<section><header><b>真题年份</b><button type="button" data-toggle-years>全选 / 取消</button></header><div class="paper-year-grid">${YEARS.slice().reverse().map(y=>{const count=zhentiYearCounts.get(y)||0;return`<label class="${selectedYears.has(String(y))?'checked':''}"><input type="checkbox" data-year="${y}" ${selectedYears.has(String(y))?'checked':''}><span>${y}</span><b>${y} 真题</b><small>${count}题</small></label>`}).join('')}</div></section>`;
    els.ranges.querySelectorAll('[data-year]').forEach(input=>input.addEventListener('change',()=>{input.checked?selectedYears.add(input.dataset.year):selectedYears.delete(input.dataset.year);renderRanges()}));
    els.ranges.querySelector('[data-toggle-years]')?.addEventListener('click',()=>{const all=selectedYears.size===YEARS.length;selectedYears=all?new Set():new Set(YEARS.map(String));renderRanges()});return;
  }
  els.rangeTitle.textContent='科目与章节';els.rangeNote.textContent='选择参与组卷的 Relax1000 章节；默认全部章节。';
  const subjects=scope==='all'?relaxData.subjects:relaxData.subjects.filter(s=>s.id===scope);
  els.ranges.innerHTML=subjects.map(s=>`<section><header><b>${esc(s.name)}</b><button type="button" data-toggle-subject="${s.id}">全选 / 取消</button></header><div>${s.chapters.map((c,i)=>{const count=relaxChapterCounts.get(c.id)||0;return`<label class="${selectedChapters.has(c.id)?'checked':''}"><input type="checkbox" data-chapter="${c.id}" ${selectedChapters.has(c.id)?'checked':''}><span>${String(i+1).padStart(2,'0')}</span><b>${esc(c.name)}</b><small>${count}题</small></label>`}).join('')}</div></section>`).join('');
  els.ranges.querySelectorAll('[data-chapter]').forEach(input=>input.addEventListener('change',()=>{input.checked?selectedChapters.add(input.dataset.chapter):selectedChapters.delete(input.dataset.chapter);renderRanges()}));
  els.ranges.querySelectorAll('[data-toggle-subject]').forEach(btn=>btn.addEventListener('click',()=>{const s=relaxData.subjects.find(x=>x.id===btn.dataset.toggleSubject),ids=s.chapters.map(c=>c.id),all=ids.every(id=>selectedChapters.has(id));ids.forEach(id=>all?selectedChapters.delete(id):selectedChapters.add(id));renderRanges()}));
}
function syncSizeButtons(){$$('[data-size]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.size)===size);b.disabled=loading||mode==='simulation'})}
function syncBuilder(){renderSources();renderSubjects();renderRanges();syncSizeButtons();syncStats();els.generate.disabled=loading;els.tip.textContent=loading?'正在按需读取当前题源…':mode==='simulation'?'按 408 当前选择题结构：数据结构 11、计组 11、操作系统 10、计网 8。':mode==='wrong'?'双题库错题合并组卷；不会把未作答题自动写入错题本。':source==='zhenti'?'仅使用已核验且可自动判分的历年真题选择题。':'使用 Relax1000 现有题目、答案、解析及原题截图。'}
async function withLoading(task){
  loading=true;renderSources();syncSizeButtons();els.generate.disabled=true;els.tip.textContent='正在按需读取当前题源…';
  try{return await task()}finally{loading=false}
}
async function setMode(next){
  mode=next;$$('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));if(mode==='simulation'){size=40;scope='all'}if(mode==='wrong')size=20;if(mode==='quick')size=10;
  try{await withLoading(ensureModeData);syncBuilder()}catch(error){showLoadError(error)}
}
async function setSource(next){
  if(mode==='wrong')return;const wanted=next==='relax'?'relax':'zhenti';if(wanted===source)return;
  source=wanted;storage.set(SOURCE_KEY,source);scope='all';renderSources();
  try{await withLoading(()=>ensureSource(source));syncBuilder()}catch(error){showLoadError(error)}
}

function simulationPaper(pool){const result=[];for(const sid of SUBJECT_ORDER)result.push(...choose(pool.filter(q=>q.subjectId===sid),QUOTA[sid],true));return result}
function currentPaperTitle(){
  const label=mode==='wrong'?'双题库错题组卷':mode==='simulation'?'408 仿真组卷':mode==='quick'?'快速练习':'范围专项';
  const src=mode==='wrong'?'真题 + Relax1000':source==='zhenti'?'408 真题':'Relax1000';
  return `${label} · ${src}`;
}
async function buildPaperSelection(){
  if(loading)return null;
  try{await withLoading(ensureModeData)}catch(error){showLoadError(error);return null}
  loading=false;syncBuilder();
  const pool=activePool();if(!pool.length){window.EveraUI?.toast?.('当前范围没有可用题目',{type:'error'});return null}
  if(mode==='simulation'){
    const shortage=SUBJECT_ORDER.find(s=>pool.filter(q=>q.subjectId===s).length<QUOTA[s]);
    if(shortage){window.EveraUI?.toast?.(`${SUBJECT_LABEL[shortage]} 可用题量不足，无法保持 11/11/10/8 仿真结构`,{type:'error'});return null}
  }
  let next=mode==='simulation'?simulationPaper(pool):choose(pool,size,true);
  if(!next.length)return null;
  if($('[data-shuffle]')?.checked)next=shuffle(next);
  return next;
}
async function generate(){
  const next=await buildPaperSelection();if(!next)return;
  paper=next;if(!['queued','preparing','compiling','storing'].includes(exportJob.status))resetExportUi();answers={};index=0;seconds=0;clearInterval(timer);timer=setInterval(()=>{seconds++;els.timer.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`},1000);
  els.builder.hidden=true;els.result.hidden=true;els.paper.hidden=false;els.paperTitle.textContent=currentPaperTitle();renderPaper();window.scrollTo({top:0,behavior:'smooth'});
}
async function prepareExportFromBuilder(){
  if(exportBusy()){await openExportDialog();return}
  const access=await checkPdfAccess();
  if(!access.allowed){await openExportDialog(access);return}
  const next=await buildPaperSelection();if(!next)return;
  paper=next;resetExportUi();renderPdfAccess(access);els.paperTitle.textContent=currentPaperTitle();
  await openExportDialog(access);
}

function optionList(q){
  if(q.source==='relax'){const entries=optionEntries(q.raw);return entries.length?entries:'ABCD'.split('').map(key=>({key,text:''}))}
  return Object.entries(q.options||{}).map(([key,text])=>({key,text}));
}
function mediaList(q){if(q.source==='relax')return questionImages(q.raw).map(src=>({src:assetUrl(src),alt:'原题截图'}));return(q.figures||[]).filter(f=>f?.src).map(f=>({src:String(f.src),alt:f.alt||`${q.year}年第${q.number}题图`}))}
function analysisMedia(q){return q.source==='relax'?explanationImages(q.raw).map(src=>({src:assetUrl(src),alt:'解析截图'})):[]}
function imageStack(list){return list.length?`<div class="relax-source-images">${list.map((item,i)=>imageMarkup(item.src,item.alt||`题图${i+1}`)).join('')}</div>`:''}
function renderPaper(){
  const q=paper[index];if(!q)return;app.dataset.feedbackBank=q.source==='zhenti'?'zhenti':'relax1000';app.dataset.feedbackEntity=q.source==='zhenti'?`${q.year}-${q.number}`:String(q.id||'');els.progress.textContent=`${index+1} / ${paper.length}`;els.answered.textContent=`已答 ${Object.keys(answers).length}`;
  els.grid.innerHTML=paper.map((item,i)=>`<button type="button" data-jump="${i}" class="${i===index?'current':''} ${answers[item.uid]?'answered':''}">${i+1}</button>`).join('');els.grid.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{index=Number(b.dataset.jump);renderPaper()}));
  const opts=optionList(q),chosen=answers[q.uid]||'',media=mediaList(q),state=recordState(q),sourceText=q.source==='zhenti'?`${q.year} 真题 · 第 ${q.number} 题`:`Relax1000 · 原册第 ${q.number} 题`;
  const trust=q.source==='zhenti'?verification(q.raw?.verification):null;
  els.card.innerHTML=`<div class="relax-q-meta"><span>${esc(SUBJECT_LABEL[q.subjectId]||subjectName(q.subjectId))} · ${esc(sourceText)}</span><b>${q.source==='relax'?esc(q.chapter):`<span class="verify-badge ${trust.tier}">${esc(trust.label)}</span>`}</b><button type="button" data-bookmark>${state.favorite?'★ 已收藏':'☆ 收藏'}</button></div><div class="question-rich-text relax-builder-stem">${richText(q.stem,{fallback:'题干见下方原题图'})}</div>${trust?.tier==='paraphrase'?`<p class="verification-hint">${esc(trust.note)}。</p>`:''}${imageStack(media)}${q.source==='relax'&&usesQuestionImageFallback(q.raw)?'<p class="relax-image-fallback-note">公式或图表请以原题图为准；选项仍可正常作答。</p>':''}<div class="relax-options">${opts.map(o=>`<button type="button" data-answer="${esc(o.key)}" class="${chosen===o.key?'selected':''}"><b>${esc(o.key)}</b><span class="question-rich-text">${inlineText(o.text,{fallback:'见原题图中的选项'})}</span><i>✓</i></button>`).join('')}</div>`;
  els.card.querySelectorAll('[data-answer]').forEach(btn=>btn.addEventListener('click',()=>{answers[q.uid]=btn.dataset.answer;renderPaper()}));els.card.querySelector('[data-bookmark]')?.addEventListener('click',()=>{toggleFavorite(q);renderPaper()});els.prev.disabled=index===0;els.next.textContent=index===paper.length-1?'交卷':'下一题 →';
}
function handIn(){
  clearInterval(timer);timer=null;let correct=0;const rows=[];paper.forEach(q=>{const answer=answers[q.uid]||'',ok=Boolean(answer)&&answer===q.answer;if(ok)correct++;if(answer)persistAnswer(q,answer,ok);if(!ok)rows.push(q)});syncStats();els.paper.hidden=true;els.result.hidden=false;const score=paper.length?Math.round(correct/paper.length*100):0;
  els.result.innerHTML=`<section class="relax-result-hero"><div><span>本次完成</span><h1>${correct} / ${paper.length}</h1><p>正确率 ${score}% · 用时 ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')} · 未作答不会自动记为错题</p></div><button type="button" data-again>再组一套</button></section><section class="relax-result-list"><h2>${rows.length?`错题 / 未作答复盘 · ${rows.length} 题`:'本套全对'}</h2>${rows.map(q=>{const am=analysisMedia(q);return`<article><header><b>${esc(SUBJECT_LABEL[q.subjectId])} · ${q.source==='zhenti'?`${q.year} 第${q.number}题`:`Relax1000 第${q.number}题`}</b><span>你的答案 ${esc(answers[q.uid]||'未作答')} · 正确答案 ${esc(q.answer)}</span></header><div class="question-rich-text">${richText(q.stem)}</div>${imageStack(mediaList(q))}<details><summary>查看解析</summary>${am.length?imageStack(am):`<div class="question-rich-text">${richText(q.explanation,{fallback:'暂无文字解析'})}</div>`}</details></article>`}).join('')}</section>`;
  els.result.querySelector('[data-again]')?.addEventListener('click',()=>{els.result.hidden=true;els.builder.hidden=false;syncBuilder();window.scrollTo({top:0,behavior:'smooth'})});window.scrollTo({top:0,behavior:'smooth'});
}
const EXPORT_API='https://api.evera.top/api/pdf/export';
const EXPORT_JOB_KEY='everflow-pdf-export-job-v1';
let exportJob={id:'',status:'idle',pollTimer:0,eventSource:null,downloadUrl:'',title:'',count:0,updatedAt:0};
const exportBusy=()=>['queued','preparing','compiling','storing'].includes(exportJob.status);
const exportOrder=['queued','preparing','compiling','storing','completed'];
let exportManager=false;
let exportRequestId='',exportPollFailures=0,exportOwner='',exportSubmitting=false;
const exportLayoutInputs=$$('[data-export-layout-input]');
const selectedExportLayout=()=>exportLayoutInputs.find(input=>input.checked)?.value==='spacious'?'spacious':'compact';
function setSelectedExportLayout(value){exportLayoutInputs.forEach(input=>{input.checked=input.value===(value==='spacious'?'spacious':'compact')})}
let exportAccessAllowed=false,exportAccessCache=null,exportEtaDeadline=0,exportEtaKey='',exportEtaTimer=0;
async function checkPdfAccess(force=false){
  if(!force&&exportAccessCache&&Date.now()-exportAccessCache.checkedAt<30000)return exportAccessCache;
  await window.EveraCloud?.ready;
  const user=await window.EveraCloud?.getUser?.().catch(()=>null);
  if(!user)return exportAccessCache={allowed:false,kind:'login',user:null,checkedAt:Date.now()};
  try{
    const membership=await window.EveraCloud.membership('status');
    const allowed=Boolean(membership?.active&&['member','pro'].includes(membership?.plan));
    return exportAccessCache={allowed,kind:allowed?'member':'membership',user,membership,checkedAt:Date.now()};
  }catch(error){
    return exportAccessCache={allowed:false,kind:'error',user,error,checkedAt:Date.now()};
  }
}
function renderPdfAccess(access){
  exportAccessAllowed=Boolean(access?.allowed);
  if(els.exportAccess){
    els.exportAccess.hidden=exportAccessAllowed;
    if(!exportAccessAllowed){
      const login=access?.kind==='login',error=access?.kind==='error';
      if(els.exportAccessTitle)els.exportAccessTitle.textContent=login?'登录后使用 PDF 导出':error?'暂时无法核验会员':'会员专属 PDF 导出';
      if(els.exportAccessCopy)els.exportAccessCopy.textContent=login?'请先登录 Everflow 账户，再使用在线组卷导出。':error?'会员状态读取失败，请稍后重试。':'当前账户没有有效会员；普通会员或 Pro 均可使用。';
      if(els.exportAccessAction){els.exportAccessAction.href=login?'../account/':'../membership/';els.exportAccessAction.textContent=login?'去登录':error?'查看账户':'开通会员'}
    }
  }
  if(els.exportStart)els.exportStart.disabled=!exportAccessAllowed||exportBusy();
}
function fallbackEta(status,position=1){
  const p=Math.max(1,Number(position)||1);
  if(status==='queued')return{min:90+(p-1)*20,max:420+(p-1)*60};
  if(status==='preparing')return{min:60,max:180};
  if(status==='compiling')return{min:20,max:120};
  if(status==='storing')return{min:5,max:30};
  return{min:0,max:0};
}
function etaRangeText(min,max){
  if(max<=0)return '—';
  if(max<60)return `约 ${Math.max(1,Math.ceil(min))}–${Math.ceil(max)} 秒`;
  return `约 ${Math.max(1,Math.ceil(min/60))}–${Math.ceil(max/60)} 分钟`;
}
function formatCountdown(seconds){
  const s=Math.max(0,Math.ceil(seconds)),m=Math.floor(s/60),r=s%60;
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}
function stopExportEta(){clearInterval(exportEtaTimer);exportEtaTimer=0}
function tickExportEta(){
  if(!els.exportCountdown||!exportEtaDeadline)return;
  const remain=Math.max(0,(exportEtaDeadline-Date.now())/1000);
  els.exportCountdown.textContent=remain>0?formatCountdown(remain):'仍在处理中';
}
function updateExportEta(data={},status=exportJob.status,position=data.position){
  if(status==='completed'){stopExportEta();exportEtaDeadline=0;exportEtaKey='';if(els.exportEtaRange)els.exportEtaRange.textContent='已完成';if(els.exportCountdown)els.exportCountdown.textContent='00:00';return}
  if(status==='failed'){stopExportEta();exportEtaDeadline=0;exportEtaKey='';if(els.exportEtaRange)els.exportEtaRange.textContent='—';if(els.exportCountdown)els.exportCountdown.textContent='—';return}
  if(status==='idle'){stopExportEta();exportEtaDeadline=0;exportEtaKey='';if(els.exportEtaRange)els.exportEtaRange.textContent='约 2–7 分钟';if(els.exportCountdown)els.exportCountdown.textContent='提交后开始';return}
  const fallback=fallbackEta(status,position),min=Number.isFinite(Number(data.etaMinSeconds))?Number(data.etaMinSeconds):fallback.min,max=Number.isFinite(Number(data.etaMaxSeconds))?Number(data.etaMaxSeconds):fallback.max;
  if(els.exportEtaRange)els.exportEtaRange.textContent=etaRangeText(min,max);
  const key=`${status}:${position??''}:${min}:${max}`;
  if(key!==exportEtaKey||!exportEtaDeadline){exportEtaKey=key;exportEtaDeadline=Date.now()+max*1000}
  if(!exportEtaTimer)exportEtaTimer=setInterval(tickExportEta,1000);
  tickExportEta();
}
function exportRole(user){const role=String(user?.app_metadata?.role||'').toLowerCase();return role==='owner'||role==='admin'}
function renderExportPriority(user,enabled=null){
  exportManager=exportRole(user);
  if(!els.exportAdmin)return;
  if(!exportManager||enabled===null){els.exportAdmin.hidden=true;els.exportAdmin.replaceChildren();return}
  els.exportAdmin.hidden=false;
  els.exportAdmin.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 3 3 4-6 4 6 3-3-1 9H6L5 8ZM6 20h12"/></svg><span><b>${enabled?'优先导出已启用':'当前任务未启用优先'}</b><small>${enabled?'管理账号将在下一可用编译节点优先处理。':'本次任务按普通队列顺序处理。'}</small></span>`;
}
function setExportSteps(status='queued'){
  const normalized=status==='processing'?'compiling':status==='ready'?'completed':status,current=Math.max(0,exportOrder.indexOf(normalized));
  els.exportSteps?.querySelectorAll('[data-export-step]').forEach((node,i)=>{node.classList.toggle('active',i===current);node.classList.toggle('done',i<current||normalized==='completed')});
}
function persistExportJob(){
  try{if(!exportJob.id&&!exportJob.downloadUrl){localStorage.removeItem(EXPORT_JOB_KEY);return}localStorage.setItem(EXPORT_JOB_KEY,JSON.stringify({id:exportJob.id,status:exportJob.status,downloadUrl:exportJob.downloadUrl,title:exportJob.title,count:exportJob.count,updatedAt:Date.now(),owner:exportOwner,requestId:exportRequestId}))}catch{}
}
function clearPersistedExportJob(){try{localStorage.removeItem(EXPORT_JOB_KEY)}catch{}}
function setExportState(status,{position=null,workers=null,message='',downloadUrl=''}={}){
  exportJob.status=status;setExportSteps(status);exportLayoutInputs.forEach(input=>{input.disabled=exportBusy()||!exportAccessAllowed});
  els.exportLayer?.classList.toggle('is-busy',['queued','preparing','compiling','storing'].includes(status));
  els.exportLayer?.classList.toggle('is-complete',status==='completed');els.exportLayer?.classList.toggle('is-error',status==='failed');
  const labels={idle:'准备生成',queued:'正在排队',preparing:'正在准备排版',compiling:'正在生成 PDF',processing:'正在生成 PDF',storing:'正在保存 PDF',completed:'生成完成',failed:'生成失败'};
  if(els.exportStatus)els.exportStatus.textContent=labels[status]||labels.idle;
  if(els.exportPosition)els.exportPosition.textContent=status==='completed'?'完成':status==='failed'?'失败':position!==null&&position!==undefined&&Number.isFinite(Number(position))?String(position):'—';
  if(els.exportWorker)els.exportWorker.textContent=workers?('编译节点 '+(workers.busy??0)+' / '+(workers.total??0)+' 忙碌'):status==='queued'?'等待可用编译节点':status==='compiling'?'XeLaTeX 正在排版':status==='completed'?'文件已准备好':'编译节点状态将在提交后显示';
  if(message&&els.exportMessage)els.exportMessage.textContent=message;
  if(downloadUrl){exportJob.downloadUrl=downloadUrl;if(els.exportDownload){els.exportDownload.href=downloadUrl;els.exportDownload.hidden=false}if(els.exportPreview){els.exportPreview.href=downloadUrl;els.exportPreview.hidden=false}}
  if(els.exportStart){els.exportStart.disabled=!exportAccessAllowed||['queued','preparing','compiling','storing'].includes(status);els.exportStart.hidden=false;els.exportStart.textContent=status==='completed'?'重新生成':status==='failed'?'重新尝试':'开始生成'}
  if(els.exportBackground)els.exportBackground.hidden=!['queued','preparing','compiling','storing'].includes(status);
  exportJob.updatedAt=Date.now();persistExportJob();
}
function resetExportUi(){
  stopExportStream();clearPersistedExportJob();exportRequestId='';exportPollFailures=0;exportJob={id:'',status:'idle',pollTimer:0,eventSource:null,downloadUrl:'',title:'',count:0,updatedAt:0};
  if(els.exportStart){els.exportStart.hidden=false;els.exportStart.disabled=false;els.exportStart.textContent='开始生成'}
  if(els.exportDownload){els.exportDownload.hidden=true;els.exportDownload.removeAttribute('href')}if(els.exportPreview){els.exportPreview.hidden=true;els.exportPreview.removeAttribute('href')}
  setExportState('idle',{message:'仅生成题目页，不含封面、前言、目录、答案与解析。'});updateExportEta({},'idle');
}
function closeExportDialog(){if(!els.exportLayer)return;els.exportLayer.hidden=true;document.body.classList.remove('paper-export-open')}
async function openExportDialog(accessOverride=null){
  if(!els.exportLayer)return;
  const access=accessOverride||await checkPdfAccess();
  els.exportLayer.hidden=false;document.body.classList.add('paper-export-open');renderPdfAccess(access);
  const user=access?.user||null;
  if(exportOwner&&user?.id!==exportOwner)resetExportUi();
  renderExportPriority(user,null);
  if(!access.allowed&&!exportJob.id&&!exportJob.downloadUrl){
    setExportState('idle',{message:access.kind==='login'?'PDF 导出仅对已登录用户开放。':'PDF 导出为会员权益，请先开通有效会员。'});updateExportEta({},'idle');return;
  }
  if(!paper.length&&!exportJob.id&&!exportJob.downloadUrl){window.EveraUI?.toast?.('请先生成一套试卷',{type:'error'});closeExportDialog();return}
  if(exportJob.id)void pollExportJob();
  if(exportJob.title&&exportJob.status!=='idle'&&els.exportMessage)els.exportMessage.textContent=`${exportJob.status==='completed'?'已生成':exportJob.status==='failed'?'生成失败':'正在生成'}「${exportJob.title}」· ${exportJob.count} 题`;
  setTimeout(()=>els.exportStart?.focus(),40);
}
function exportPayload(){
  return{
    schema:'everflow-pdf-export-v1',
    requestId:exportRequestId||=crypto.randomUUID(),
    template:'exam-A4',
    templateVersion:'everflow-exam-online-v1',
    layout:selectedExportLayout(),
    answerSpace:selectedExportLayout()==='spacious'?'25mm':'none',
    includeAnswers:false,
    title:els.paperTitle?.textContent||'408 组卷',
    source,
    mode,
    questions:paper.map((q,i)=>({
      order:i+1,
      source:q.source,
      id:String(q.id||''),
      year:q.year||null,
      number:q.number||null,
      subjectId:q.subjectId,
      chapterId:q.chapterId||null
    }))
  };
}
async function exportHeaders(){
  const headers={'Content-Type':'application/json'};
  try{const client=await window.EveraCloud?.getClient?.(),session=(await client?.auth?.getSession?.())?.data?.session;if(session?.access_token)headers.Authorization='Bearer '+session.access_token}catch{}
  return headers;
}
function stopExportStream(){clearTimeout(exportJob.pollTimer);exportJob.pollTimer=0;if(exportJob.eventSource){exportJob.eventSource.close();exportJob.eventSource=null}}
function applyExportUpdate(data={}){
  if(exportManager&&('priorityEnabled'in data||'priority'in data))renderExportPriority({app_metadata:{role:'owner'}},Boolean(data.priorityEnabled??data.priority));
  const rawStatus=String(data.status||exportJob.status||'queued');const status=({processing:'compiling',ready:'completed'})[rawStatus]||rawStatus;
  if(data.title)exportJob.title=data.title;if(data.count)exportJob.count=data.count;
  if(data.layout)setSelectedExportLayout(data.layout);setExportState(status,{position:data.position,workers:data.workers,message:data.message||'',downloadUrl:data.downloadUrl||data.download_url||''});updateExportEta(data,status,data.position);
  if(status==='completed'||status==='failed'){stopExportStream();exportRequestId='';persistExportJob()}
}
async function pollExportJob(){
  if(!exportJob.id)return;
  try{
    const res=await fetch(EXPORT_API+'?id='+encodeURIComponent(exportJob.id),{headers:await exportHeaders(),credentials:'include',cache:'no-store',signal:AbortSignal.timeout(20000)});
    if([401,403].includes(res.status)){setExportState('failed',{message:'无法继续读取该导出任务，请重新登录后再生成。'});stopExportStream();return}
    if([404,410].includes(res.status)){setExportState('failed',{message:'该 PDF 导出任务已失效，请重新生成。'});stopExportStream();return}
    if(!res.ok)throw new Error('HTTP '+res.status);
    exportPollFailures=0;applyExportUpdate(await res.json());if(!['completed','failed'].includes(exportJob.status))exportJob.pollTimer=setTimeout(pollExportJob,exportJob.status==='queued'?10000:3000)
  }catch{exportPollFailures++;if(els.exportMessage)els.exportMessage.textContent='暂时无法获取进度，正在重连；已提交的任务仍在后台保留。';exportJob.pollTimer=setTimeout(pollExportJob,Math.min(30000,3000*exportPollFailures))}
}
function watchExportJob(){stopExportStream();pollExportJob();}
async function restoreExportJob(){
  let saved=null;try{saved=JSON.parse(localStorage.getItem(EXPORT_JOB_KEY)||'null')}catch{}
  if(!saved||(!saved.id&&!saved.downloadUrl))return;
  const user=await window.EveraCloud?.getUser?.().catch(()=>null);if(!user||saved.owner!==user.id){clearPersistedExportJob();return}exportOwner=user.id;exportRequestId=saved.requestId||'';
  const age=Date.now()-Number(saved.updatedAt||0);if(age>24*60*60*1000){clearPersistedExportJob();return}
  exportJob={id:String(saved.id||''),status:String(saved.status||'queued'),pollTimer:0,eventSource:null,downloadUrl:String(saved.downloadUrl||''),title:String(saved.title||''),count:Number(saved.count)||0,updatedAt:Number(saved.updatedAt)||Date.now()};
  setExportState(exportJob.status,{downloadUrl:exportJob.downloadUrl,message:exportJob.title?`${exportJob.status==='completed'?'已生成':'正在恢复'}「${exportJob.title}」· ${exportJob.count} 题`:''});
  if(exportJob.id){if(exportBusy())watchExportJob();else void pollExportJob();}
}
async function startPdfExport(){
  if(!paper.length||exportBusy()||exportSubmitting)return;
  exportSubmitting=true;
  const access=await checkPdfAccess(true);
  renderPdfAccess(access);
  const user=access?.user||null;
  if(!access.allowed){exportSubmitting=false;setExportState('idle',{message:access.kind==='login'?'请先登录账户，再导出 PDF。':'PDF 导出为会员权益，请先开通有效会员。'});updateExportEta({},'idle');return}
  exportOwner=user.id;stopExportStream();exportJob.id='';exportJob.downloadUrl='';
  for(const link of [els.exportDownload,els.exportPreview])if(link){link.hidden=true;link.removeAttribute('href')}
  const payload=exportPayload();exportJob.title=payload.title;exportJob.count=payload.questions.length;
  setExportState('queued',{message:`正在提交「${exportJob.title}」· ${exportJob.count} 题到 PDF 生成队列…`});updateExportEta({},'queued',1);if(els.exportStart)els.exportStart.disabled=true;
  try{
    const res=await fetch(EXPORT_API,{method:'POST',headers:await exportHeaders(),credentials:'include',body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
    let data={};try{data=await res.json()}catch{}
    if(!res.ok)throw new Error(data?.message||data?.error||('PDF 服务 HTTP '+res.status));
    exportJob.id=String(data.jobId||data.id||'');persistExportJob();
    if(!exportJob.id&&data.downloadUrl){applyExportUpdate({...data,status:'completed'});return}
    if(!exportJob.id)throw new Error('PDF 服务未返回任务编号');
    applyExportUpdate({...data,status:data.status||'queued'});watchExportJob(data.eventUrl||data.event_url||'');
  }catch(error){
    console.error('PDF export failed',error);
    setExportState('failed',{message:/404|Failed to fetch|HTTP 404/i.test(String(error?.message||error))?'暂时无法连接 PDF 服务，请稍后重试。':String(error?.message||error||'PDF 生成失败')});
    if(els.exportStart){els.exportStart.disabled=false;els.exportStart.textContent='重新尝试'}
  }finally{exportSubmitting=false}
}

function showLoadError(error){
  console.error(error);loading=false;
  els.builder.innerHTML=`<section class="paper-builder-error"><h2>组卷题库载入失败</h2><p>${esc(error?.message||error)}</p><button type="button" onclick="location.reload()">重新载入</button></section>`;
}

$$('[data-source]').forEach(b=>b.addEventListener('click',()=>{void setSource(b.dataset.source)}));$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{void setMode(b.dataset.mode)}));$$('[data-size]').forEach(b=>b.addEventListener('click',()=>{if(mode==='simulation')return;size=Number(b.dataset.size);syncSizeButtons()}));
$$('.relax-filters input').forEach(input=>input.addEventListener('change',()=>{if(input.value==='all'&&input.checked)$$('.relax-filters input').forEach(i=>{if(i!==input)i.checked=false});else if(input.value!=='all'&&input.checked)$('.relax-filters input[value="all"]').checked=false;if(!$$('.relax-filters input:checked').length)$('.relax-filters input[value="all"]').checked=true}));
els.builderExport?.addEventListener('click',()=>{void prepareExportFromBuilder()});els.exportTrigger?.addEventListener('click',()=>{void openExportDialog()});$$('[data-export-close]').forEach(btn=>btn.addEventListener('click',closeExportDialog));els.exportBackground?.addEventListener('click',closeExportDialog);els.exportStart?.addEventListener('click',()=>{void startPdfExport()});
exportLayoutInputs.forEach(input=>input.addEventListener('change',()=>{if(!exportBusy()){resetExportUi();renderPdfAccess(exportAccessCache)}}));
els.generate.addEventListener('click',()=>{void generate()});els.prev.addEventListener('click',()=>{if(index>0){index--;renderPaper()}});els.next.addEventListener('click',()=>{if(index<paper.length-1){index++;renderPaper()}else handIn()});els.submit.addEventListener('click',handIn);els.exit.addEventListener('click',()=>{clearInterval(timer);timer=null;els.paper.hidden=true;els.builder.hidden=false;syncBuilder()});
document.addEventListener('keydown',e=>{if(!els.exportLayer?.hidden&&e.key!=='Escape'){if(e.key==='Tab'){const nodes=[...els.exportLayer.querySelectorAll('button:not([disabled]),a[href],select:not([disabled])')].filter(n=>!n.hidden&&n.tabIndex>=0&&n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){last?.focus();e.preventDefault()}else if(!e.shiftKey&&document.activeElement===last){first?.focus();e.preventDefault()}}return;}if(e.key==='Escape'&&!els.exportLayer?.hidden){closeExportDialog();e.preventDefault();return}if(els.paper.hidden||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const k=e.key.toUpperCase();if(['A','B','C','D'].includes(k)){answers[paper[index].uid]=k;renderPaper();e.preventDefault()}else if(e.key==='ArrowLeft'&&index>0){index--;renderPaper();e.preventDefault()}else if(e.key==='ArrowRight'){index<paper.length-1?(index++,renderPaper()):handIn();e.preventDefault()}else if(e.key==='Enter'){index<paper.length-1?(index++,renderPaper()):handIn();e.preventDefault()}});
window.addEventListener('storage',event=>{if(event.key===ZHENTI_KEY)zhentiRecordsCache=null});

try{await withLoading(()=>ensureSource(source));loading=false;syncBuilder();restoreExportJob()}catch(error){showLoadError(error)}
