import{loadRelaxData,loadRecords,patchRecord,syncAnswerCompatibility,toggleBookmark,optionEntries,assetUrl,questionImages,explanationImages,questionNumber,subjectName,esc}from'./relax1000-core.js';

const app=document.querySelector('[data-paper-builder]');
if(!app)throw new Error('408 paper builder root missing');

const $=s=>app.querySelector(s),$$=s=>[...app.querySelectorAll(s)];
const els={builder:$('[data-builder]'),paper:$('[data-paper]'),result:$('[data-result]'),subjects:$('[data-subjects]'),ranges:$('[data-ranges]'),generate:$('[data-generate]'),tip:$('[data-builder-tip]'),rangeTitle:$('[data-range-title]'),rangeNote:$('[data-range-note]'),paperTitle:$('[data-paper-title]'),progress:$('[data-progress]'),answered:$('[data-answered]'),timer:$('[data-timer]'),grid:$('[data-answer-grid]'),card:$('[data-question-card]'),prev:$('[data-prev]'),next:$('[data-next]'),submit:$('[data-submit]'),exit:$('[data-exit]'),bankTotal:$('[data-bank-total]'),seenTotal:$('[data-seen-total]'),wrongTotal:$('[data-wrong-total]')};

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
let source=storage.get(SOURCE_KEY)==='relax'?'relax':'zhenti',mode='simulation',scope='all',size=40;
let selectedYears=new Set(YEARS.map(String)),selectedChapters=new Set();
let paper=[],answers={},index=0,seconds=0,timer=null;

function normalizeRelax(q){return{source:'relax',uid:`relax:${q.id}`,raw:q,id:q.id,subjectId:q.subjectId,chapterId:q.chapterId,chapter:q.chapter||'',stem:q.stem||'',answer:String(q.answer||''),explanation:q.explanation||'',number:questionNumber(q),options:null}}
function normalizeZhenti(year,item){return{source:'zhenti',uid:`zhenti:${year}-${item.number}`,id:`${year}-${item.number}`,year:Number(year),number:Number(item.number),subjectId:item.subject||'ds',chapterId:String(year),chapter:`${year} 年真题`,stem:item.stem||'',answer:String(item.answer||''),explanation:item.analysis||'',options:item.options||{},figures:Array.isArray(item.figures)?item.figures:[],raw:item}}

async function loadZhenti(){
  const manifest=await fetch('/data/zhenti/manifest.json?v=20260824-paper7',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`真题目录 HTTP ${r.status}`);return r.json()});
  const entries=Object.entries(manifest?.years||{}).filter(([,meta])=>Array.isArray(meta.verifiedQuestions)&&meta.verifiedQuestions.length);
  const groups=await Promise.all(entries.map(async([year,meta])=>{
    const paper=await fetch(`/data/zhenti/${year}.json?v=20260824-paper7`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
    if(!paper)return[];
    return meta.verifiedQuestions.map(n=>paper.questions?.[String(n)]).filter(item=>item?.verification?.status==='verified'&&item?.options&&/^[A-D]$/.test(String(item.answer||''))).map(item=>normalizeZhenti(year,item));
  }));
  return groups.flat();
}

function zhentiRecords(){return storage.json(ZHENTI_KEY,{})}
function relaxRecord(q){return loadRecords()[String(q.raw.id)]||{}}
function recordState(q){
  if(q.source==='relax'){
    const rec=relaxRecord(q);return{rec,seen:Boolean(rec.answer||rec.reviewed||rec.status),wrong:rec.correct===false||rec.status==='weak',favorite:Boolean(rec.favorite)};
  }
  const rec=zhentiRecords()[`${q.year}-${q.number}`]||{};return{rec,seen:Boolean(rec.answer||rec.reviewed||rec.status||Number.isFinite(Number(rec.selfScore))),wrong:rec.correct===false||rec.status==='weak',favorite:Boolean(rec.favorite)};
}
function patchZhenti(q,patch){
  const all=zhentiRecords(),key=`${q.year}-${q.number}`,prev=all[key]||{},next={...prev,...patch,updatedAt:new Date().toISOString()};Object.keys(next).forEach(k=>next[k]===undefined&&delete next[k]);all[key]=next;storage.set(ZHENTI_KEY,JSON.stringify(all));document.dispatchEvent(new CustomEvent('everflow:zhenti-records-change',{detail:{year:q.year,q:q.number}}));return next;
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
  const pool=mode==='wrong'?[...zhentiQuestions,...relaxQuestions]:sourcePool(source);let seen=0,wrong=0;pool.forEach(q=>{const s=recordState(q);if(s.seen)seen++;if(s.wrong)wrong++});els.bankTotal.textContent=pool.length;els.seenTotal.textContent=seen;els.wrongTotal.textContent=wrong;
}
function renderSources(){
  $$('[data-source]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.source===source);btn.disabled=mode==='wrong'});
}
function renderSubjects(){
  const pool=mode==='wrong'?[...zhentiQuestions,...relaxQuestions]:sourcePool(source);const counts=Object.fromEntries(SUBJECT_ORDER.map(s=>[s,pool.filter(q=>q.subjectId===s).length]));
  els.subjects.innerHTML=`<button type="button" data-subject="all" class="${scope==='all'?'active':''}"><b>全部</b><small>${pool.length} 题</small></button>`+SUBJECT_ORDER.map(s=>`<button type="button" data-subject="${s}" class="${scope===s?'active':''}"><b>${SUBJECT_LABEL[s]}</b><small>${counts[s]} 题</small></button>`).join('');
  els.subjects.querySelectorAll('[data-subject]').forEach(btn=>btn.addEventListener('click',()=>{scope=btn.dataset.subject;renderSubjects();syncStats()}));
}
function renderRanges(){
  if(mode==='wrong'){
    els.rangeTitle.textContent='跨题库错题';els.rangeNote.textContent='自动合并 408 真题与 Relax1000 中的未掌握错题；可继续用上方科目限制范围。';
    const z=zhentiQuestions.filter(q=>recordState(q).wrong).length,r=relaxQuestions.filter(q=>recordState(q).wrong).length;els.ranges.innerHTML=`<section class="paper-wrong-summary"><div><b>408 真题错题</b><strong>${z}</strong></div><div><b>Relax1000 错题</b><strong>${r}</strong></div><p>错题以“作答错误”或标记为“不会”为准。</p></section>`;return;
  }
  if(source==='zhenti'){
    els.rangeTitle.textContent='科目与年份';els.rangeNote.textContent='选择参与组卷的已核验真题年份；默认全部年份。';
    els.ranges.innerHTML=`<section><header><b>真题年份</b><button type="button" data-toggle-years>全选 / 取消</button></header><div class="paper-year-grid">${YEARS.slice().reverse().map(y=>{const count=zhentiQuestions.filter(q=>q.year===y).length;return`<label class="${selectedYears.has(String(y))?'checked':''}"><input type="checkbox" data-year="${y}" ${selectedYears.has(String(y))?'checked':''}><span>${y}</span><b>${y} 真题</b><small>${count}题</small></label>`}).join('')}</div></section>`;
    els.ranges.querySelectorAll('[data-year]').forEach(input=>input.addEventListener('change',()=>{input.checked?selectedYears.add(input.dataset.year):selectedYears.delete(input.dataset.year);renderRanges()}));
    els.ranges.querySelector('[data-toggle-years]')?.addEventListener('click',()=>{const all=selectedYears.size===YEARS.length;selectedYears=all?new Set():new Set(YEARS.map(String));renderRanges()});return;
  }
  els.rangeTitle.textContent='科目与章节';els.rangeNote.textContent='选择参与组卷的 Relax1000 章节；默认全部章节。';
  const subjects=scope==='all'?relaxData.subjects:relaxData.subjects.filter(s=>s.id===scope);
  els.ranges.innerHTML=subjects.map(s=>`<section><header><b>${esc(s.name)}</b><button type="button" data-toggle-subject="${s.id}">全选 / 取消</button></header><div>${s.chapters.map((c,i)=>{const count=relaxQuestions.filter(q=>q.chapterId===c.id).length;return`<label class="${selectedChapters.has(c.id)?'checked':''}"><input type="checkbox" data-chapter="${c.id}" ${selectedChapters.has(c.id)?'checked':''}><span>${String(i+1).padStart(2,'0')}</span><b>${esc(c.name)}</b><small>${count}题</small></label>`}).join('')}</div></section>`).join('');
  els.ranges.querySelectorAll('[data-chapter]').forEach(input=>input.addEventListener('change',()=>{input.checked?selectedChapters.add(input.dataset.chapter):selectedChapters.delete(input.dataset.chapter);renderRanges()}));
  els.ranges.querySelectorAll('[data-toggle-subject]').forEach(btn=>btn.addEventListener('click',()=>{const s=relaxData.subjects.find(x=>x.id===btn.dataset.toggleSubject),ids=s.chapters.map(c=>c.id),all=ids.every(id=>selectedChapters.has(id));ids.forEach(id=>all?selectedChapters.delete(id):selectedChapters.add(id));renderRanges()}));
}
function syncSizeButtons(){$$('[data-size]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.size)===size);b.disabled=mode==='simulation'})}
function syncBuilder(){renderSources();renderSubjects();renderRanges();syncSizeButtons();syncStats();els.tip.textContent=mode==='simulation'?'按 408 当前选择题结构：数据结构 11、计组 11、操作系统 10、计网 8。':mode==='wrong'?'双题库错题合并组卷；不会把未作答题自动写入错题本。':source==='zhenti'?'仅使用已核验且可自动判分的历年真题选择题。':'使用 Relax1000 现有题目、答案、解析及原题截图。'}
function setMode(next){mode=next;$$('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));if(mode==='simulation')size=40;if(mode==='wrong')size=20;if(mode==='quick')size=10;syncBuilder()}
function setSource(next){if(mode==='wrong')return;source=next==='relax'?'relax':'zhenti';storage.set(SOURCE_KEY,source);scope='all';syncBuilder()}

function simulationPaper(pool){
  const result=[];const used=new Set();
  for(const sid of SUBJECT_ORDER){const subjectPool=pool.filter(q=>q.subjectId===sid),picked=choose(subjectPool,QUOTA[sid],true);picked.forEach(q=>{used.add(q.uid);result.push(q)})}
  if(result.length<40)result.push(...choose(pool.filter(q=>!used.has(q.uid)),40-result.length,true));
  return result.slice(0,40);
}
function generate(){
  let pool=activePool();if(!pool.length){window.EveraUI?.toast?.('当前范围没有可用题目',{type:'error'});return}
  paper=mode==='simulation'?simulationPaper(pool):choose(pool,size,true);if(!paper.length)return;
  if($('[data-shuffle]')?.checked)paper=shuffle(paper);answers={};index=0;seconds=0;clearInterval(timer);timer=setInterval(()=>{seconds++;els.timer.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`},1000);
  els.builder.hidden=true;els.result.hidden=true;els.paper.hidden=false;
  const label=mode==='wrong'?'双题库错题组卷':mode==='simulation'?'408 仿真组卷':mode==='quick'?'快速练习':'范围专项';const src=mode==='wrong'?'真题 + Relax1000':source==='zhenti'?'408 真题':'Relax1000';els.paperTitle.textContent=`${label} · ${src}`;renderPaper();window.scrollTo({top:0,behavior:'smooth'});
}

function optionList(q){if(q.source==='relax')return optionEntries(q.raw);return Object.entries(q.options||{}).map(([key,text])=>({key,text}))}
function mediaList(q){
  if(q.source==='relax')return questionImages(q.raw).map(src=>({src:assetUrl(src),alt:'原题截图'}));
  return(q.figures||[]).filter(f=>f?.src).map(f=>({src:String(f.src),alt:f.alt||`${q.year}年第${q.number}题图`}));
}
function analysisMedia(q){return q.source==='relax'?explanationImages(q.raw).map(src=>({src:assetUrl(src),alt:'解析截图'})):[]}
function imageStack(list){return list.length?`<div class="relax-source-images">${list.map((item,i)=>`<a href="${esc(item.src)}" target="_blank" rel="noopener"><img src="${esc(item.src)}" alt="${esc(item.alt||`题图${i+1}`)}" loading="lazy"></a>`).join('')}</div>`:''}
function renderPaper(){
  const q=paper[index];if(!q)return;els.progress.textContent=`${index+1} / ${paper.length}`;els.answered.textContent=`已答 ${Object.keys(answers).length}`;
  els.grid.innerHTML=paper.map((item,i)=>`<button type="button" data-jump="${i}" class="${i===index?'current':''} ${answers[item.uid]?'answered':''}">${i+1}</button>`).join('');els.grid.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{index=Number(b.dataset.jump);renderPaper()}));
  const opts=optionList(q),chosen=answers[q.uid]||'',media=mediaList(q),state=recordState(q);const sourceText=q.source==='zhenti'?`${q.year} 真题 · 第 ${q.number} 题`:`Relax1000 · 原册第 ${q.number} 题`;
  els.card.innerHTML=`<div class="relax-q-meta"><span>${esc(SUBJECT_LABEL[q.subjectId]||subjectName(q.subjectId))} · ${esc(sourceText)}</span><b>${q.source==='relax'?esc(q.chapter):'已核验真题'}</b><button type="button" data-bookmark>${state.favorite?'★ 已收藏':'☆ 收藏'}</button></div><h2>${esc(q.stem||'题干见下方原题图')}</h2>${imageStack(media)}<div class="relax-options">${opts.map(o=>`<button type="button" data-answer="${esc(o.key)}" class="${chosen===o.key?'selected':''}"><b>${esc(o.key)}</b><span>${esc(o.text)}</span><i>✓</i></button>`).join('')}</div>`;
  els.card.querySelectorAll('[data-answer]').forEach(btn=>btn.addEventListener('click',()=>{answers[q.uid]=btn.dataset.answer;renderPaper()}));els.card.querySelector('[data-bookmark]')?.addEventListener('click',()=>{toggleFavorite(q);renderPaper()});els.prev.disabled=index===0;els.next.textContent=index===paper.length-1?'交卷':'下一题 →';
}
function handIn(){
  clearInterval(timer);timer=null;let correct=0;const rows=[];
  paper.forEach(q=>{const answer=answers[q.uid]||'',ok=Boolean(answer)&&answer===q.answer;if(ok)correct++;if(answer)persistAnswer(q,answer,ok);if(!ok)rows.push(q)});syncStats();els.paper.hidden=true;els.result.hidden=false;const score=paper.length?Math.round(correct/paper.length*100):0;
  els.result.innerHTML=`<section class="relax-result-hero"><div><span>本次完成</span><h1>${correct} / ${paper.length}</h1><p>正确率 ${score}% · 用时 ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')} · 未作答不会自动记为错题</p></div><button type="button" data-again>再组一套</button></section><section class="relax-result-list"><h2>${rows.length?`错题 / 未作答复盘 · ${rows.length} 题`:'本套全对'}</h2>${rows.map(q=>{const am=analysisMedia(q);return`<article><header><b>${esc(SUBJECT_LABEL[q.subjectId])} · ${q.source==='zhenti'?`${q.year} 第${q.number}题`:`Relax1000 第${q.number}题`}</b><span>你的答案 ${esc(answers[q.uid]||'未作答')} · 正确答案 ${esc(q.answer)}</span></header><h3>${esc(q.stem||'')}</h3>${imageStack(mediaList(q))}<details><summary>查看解析</summary>${am.length?imageStack(am):`<p>${esc(q.explanation||'暂无文字解析')}</p>`}</details></article>`}).join('')}</section>`;
  els.result.querySelector('[data-again]')?.addEventListener('click',()=>{els.result.hidden=true;els.builder.hidden=false;syncBuilder();window.scrollTo({top:0,behavior:'smooth'})});window.scrollTo({top:0,behavior:'smooth'});
}

$$('[data-source]').forEach(b=>b.addEventListener('click',()=>setSource(b.dataset.source)));$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));$$('[data-size]').forEach(b=>b.addEventListener('click',()=>{if(mode==='simulation')return;size=Number(b.dataset.size);syncSizeButtons()}));
$$('.relax-filters input').forEach(input=>input.addEventListener('change',()=>{if(input.value==='all'&&input.checked)$$('.relax-filters input').forEach(i=>{if(i!==input)i.checked=false});else if(input.value!=='all'&&input.checked)$('.relax-filters input[value="all"]').checked=false;if(!$$('.relax-filters input:checked').length)$('.relax-filters input[value="all"]').checked=true}));
els.generate.addEventListener('click',generate);els.prev.addEventListener('click',()=>{if(index>0){index--;renderPaper()}});els.next.addEventListener('click',()=>{if(index<paper.length-1){index++;renderPaper()}else handIn()});els.submit.addEventListener('click',handIn);els.exit.addEventListener('click',()=>{clearInterval(timer);timer=null;els.paper.hidden=true;els.builder.hidden=false;syncBuilder()});
document.addEventListener('keydown',e=>{if(els.paper.hidden||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const k=e.key.toUpperCase();if(['A','B','C','D'].includes(k)){answers[paper[index].uid]=k;renderPaper();e.preventDefault()}else if(e.key==='ArrowLeft'&&index>0){index--;renderPaper();e.preventDefault()}else if(e.key==='ArrowRight'){index<paper.length-1?(index++,renderPaper()):handIn();e.preventDefault()}else if(e.key==='Enter'){index<paper.length-1?(index++,renderPaper()):handIn();e.preventDefault()}});

try{
  [relaxData,zhentiQuestions]=await Promise.all([loadRelaxData(),loadZhenti()]);relaxQuestions=relaxData.questions.map(normalizeRelax);selectedChapters=new Set(relaxData.subjects.flatMap(s=>s.chapters.map(c=>c.id)));syncBuilder();
}catch(error){console.error(error);els.builder.innerHTML=`<section class="paper-builder-error"><h2>组卷题库载入失败</h2><p>${esc(error.message||error)}</p><button type="button" onclick="location.reload()">重新载入</button></section>`}
