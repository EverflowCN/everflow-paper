import{
  loadRelaxData,loadRecords as loadRelaxRecords,patchRecord as patchRelaxRecord,
  questionState,questionNumber,questionImages,explanationImages,optionEntries,
  assetUrl,esc as coreEsc,subjectName,idKey
}from'./relax1000-core.js';

const root=document.querySelector('[data-atlas-root]');
const frame=root?.querySelector('.atlas-frame');
const canvas=root?.querySelector('[data-atlas-canvas]');
const matrix=root?.querySelector('[data-atlas-matrix]');
const loading=root?.querySelector('[data-atlas-loading]');
const caption=root?.querySelector('[data-atlas-caption]');
const drawer=root?.querySelector('[data-atlas-drawer]');
const drawerTitle=root?.querySelector('[data-atlas-drawer-title]');
const drawerMeta=root?.querySelector('[data-atlas-drawer-meta]');
const drawerBody=root?.querySelector('[data-atlas-drawer-body]');
const drawerClose=root?.querySelector('[data-atlas-close]');
const drawerAnswer=root?.querySelector('[data-atlas-answer]');
const statusButtons=root?[...root.querySelectorAll('[data-atlas-status]')]:[];
const sourceButtons=root?[...root.querySelectorAll('[data-atlas-source]')]:[];
const fitButtons=root?[...root.querySelectorAll('[data-atlas-fit]')]:[];
if(!root||!frame||!canvas||!matrix||!loading||!caption||!drawer||!drawerBody)throw new Error('atlas preview shell missing');

const VERSION='20260824-atlas-v1';
const SOURCE_KEY='everflow-graph-next-source-v1';
const FIT_KEY='everflow-graph-next-fit-v1';
const CURRENT_KEY={zhenti:'everflow-graph-next-current-zhenti-v1',relax1000:'everflow-graph-next-current-relax-v1'};
const ZHENTI_RECORD_KEY='everflow-408-zhenti-wall-v1';
const YEARS=Array.from({length:18},(_,i)=>2026-i);
const ZHENTI_COLS=47;
const RELAX_COLS=45;
const SUBJECT_SHORT={ds:'DS',co:'CO',os:'OS',cn:'CN'};
const SUBJECT_LABEL={ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络'};
const paperCache=new Map();
let source=readText(SOURCE_KEY)==='relax1000'?'relax1000':'zhenti';
let fitMode=readText(FIT_KEY)==='native'?'native':'fit';
let rows=[];
let relaxData=null;
let selected=null;
let current='';
let answerVisible=false;
let renderToken=0;

function readText(key){try{return localStorage.getItem(key)||''}catch{return''}}
function writeText(key,value){try{localStorage.setItem(key,value)}catch{}}
function readJson(key,fallback={}){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function esc(value){return coreEsc(value)}
function fallbackSubject(q){if((q>=1&&q<=10)||q===41||q===42)return'ds';if((q>=11&&q<=22)||q===43||q===44)return'co';if((q>=23&&q<=32)||q===45||q===46)return'os';return'cn'}
function safeZhentiSrc(value){const src=String(value||'').trim();return src.startsWith('/data/zhenti/assets/')||/^data:image\/(?:png|jpeg|webp|svg\+xml);/i.test(src)?src:''}
function currentStorageKey(){return CURRENT_KEY[source]}
function setLoading(text='正在载入数据…'){loading.hidden=false;loading.textContent=text}
function clearLoading(){loading.hidden=true}

function loadZhentiRecords(){const value=readJson(ZHENTI_RECORD_KEY,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
function patchZhentiRecord(year,q,patch){
  const records=loadZhentiRecords(),key=`${year}-${q}`,previous=records[key]||{};
  const next={...previous,...patch,updatedAt:new Date().toISOString()};
  Object.keys(next).forEach(name=>next[name]===undefined&&delete next[name]);
  const meaningful=Boolean(next.status||next.note||next.answer||next.draftAnswer||next.reviewed||next.favorite||next.attempts||next.correct===true||next.correct===false);
  if(meaningful)records[key]=next;else delete records[key];
  writeJson(ZHENTI_RECORD_KEY,records);
  document.dispatchEvent(new CustomEvent('everflow:zhenti-records-change',{detail:{year,q,source:'graph-next'}}));
  return records[key]||{};
}
function answerClass(record){if(record?.correct===true)return'correct';if(record?.correct===false)return'wrong';if(record?.reviewed)return'reviewed';if(record?.draftAnswer)return'draft';return''}
function statusClass(record){return ['mastered','fuzzy','weak'].includes(record?.status)?record.status:''}
function zhentiState(year,q,records=loadZhentiRecords()){const rec=records[`${year}-${q}`]||{};return{rec,status:statusClass(rec),answer:answerClass(rec)}}
function relaxState(question,records=loadRelaxRecords()){
  const state=questionState(question,records),rec=state.rec||{};
  let answer='';
  if(state.wrong||rec.correct===false)answer='wrong';
  else if(rec.correct===true||(state.seen&&!state.wrong))answer='correct';
  else if(rec.reviewed)answer='reviewed';
  else if(rec.draftAnswer)answer='draft';
  return{rec,status:statusClass(rec),answer};
}

function buildZhentiRows(){
  return YEARS.map((year,rowIndex)=>({
    code:String(year),title:`${year} 年`,rowIndex,
    cells:Array.from({length:ZHENTI_COLS},(_,i)=>{const q=i+1;return{source:'zhenti',key:`${year}-${q}`,subject:fallbackSubject(q),year,q,row:rowIndex,col:i}})
  }));
}
function buildRelaxRows(data){
  const result=[];
  for(const subj of data.subjects||[]){
    (subj.chapters||[]).forEach((chapter,chapterIndex)=>{
      const questions=(data.questions||[]).filter(q=>q.subjectId===subj.id&&q.chapterId===chapter.id);
      const chunks=[];
      for(let start=0;start<questions.length;start+=RELAX_COLS)chunks.push(questions.slice(start,start+RELAX_COLS));
      (chunks.length?chunks:[[]]).forEach((chunk,chunkIndex)=>{
        const base=`${SUBJECT_SHORT[subj.id]||String(subj.id).toUpperCase()}·${chapterIndex+1}`;
        const rowIndex=result.length;
        result.push({
          code:chunks.length>1?`${base}-${chunkIndex+1}`:base,
          title:`${subjectName(subj.id,subj.name)} · ${chapter.name||''}`,
          rowIndex,
          cells:chunk.map((question,col)=>({source:'relax1000',key:`relax:${idKey(question)}`,subject:question.subjectId||subj.id,question,row:rowIndex,col}))
        });
      });
    });
  }
  return result;
}
function columns(){return source==='zhenti'?ZHENTI_COLS:RELAX_COLS}
function stateFor(cell,records){return cell.source==='zhenti'?zhentiState(cell.year,cell.q,records):relaxState(cell.question,records)}

function indexCell(text,className,title=''){
  const el=document.createElement('div');
  el.className=`atlas-index ${className}`;
  el.textContent=text;
  if(title)el.title=title;
  el.setAttribute('aria-hidden','true');
  return el;
}
function cellElement(cell,records){
  const state=stateFor(cell,records),button=document.createElement('button');
  button.type='button';
  button.className=['atlas-cell',cell.subject||'ds',state.status,state.answer,cell.key===current?'current':''].filter(Boolean).join(' ');
  button.dataset.atlasKey=cell.key;
  button.dataset.row=String(cell.row);
  button.dataset.col=String(cell.col);
  button.setAttribute('role','gridcell');
  const name=cell.source==='zhenti'?`${cell.year} 年第 ${cell.q} 题`:`${SUBJECT_LABEL[cell.subject]||'408'} · 第 ${questionNumber(cell.question,cell.col)} 题`;
  button.setAttribute('aria-label',name);
  button.title=name;
  button.addEventListener('click',()=>activateCell(cell,{open:true}));
  return button;
}
function renderMatrix({preserveScroll=false}={}){
  const x=canvas.scrollLeft,y=canvas.scrollTop,cols=columns();
  const records=source==='zhenti'?loadZhentiRecords():loadRelaxRecords();
  const fragment=document.createDocumentFragment();
  matrix.style.setProperty('--atlas-cols',String(cols));
  fragment.appendChild(indexCell('','corner'));
  for(let i=1;i<=cols;i++)fragment.appendChild(indexCell(String(i),'col'));
  rows.forEach(row=>{
    fragment.appendChild(indexCell(row.code,'row',row.title));
    const map=new Map(row.cells.map(cell=>[cell.col,cell]));
    for(let col=0;col<cols;col++){
      const cell=map.get(col);
      if(cell)fragment.appendChild(cellElement(cell,records));
      else{const blank=document.createElement('div');blank.className='atlas-blank';blank.setAttribute('aria-hidden','true');fragment.appendChild(blank)}
    }
  });
  matrix.replaceChildren(fragment);
  requestAnimationFrame(()=>{
    applyFit();
    if(preserveScroll){canvas.scrollLeft=x;canvas.scrollTop=y}
    ensureCurrentVisible(false);
  });
}

function sourceCaption(){return source==='zhenti'?'年份 × 题号 · 一屏看完整体分布':'章节 × 题序 · 按章节分行，单行最多 45 格'}
async function switchSource(next,{initial=false}={}){
  if(!['zhenti','relax1000'].includes(next))return;
  const token=++renderToken;
  source=next;writeText(SOURCE_KEY,source);
  sourceButtons.forEach(button=>{const active=button.dataset.atlasSource===source;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active))});
  caption.textContent=sourceCaption();
  drawer.hidden=true;selected=null;answerVisible=false;
  current=readText(currentStorageKey());
  setLoading(source==='zhenti'?'正在生成真题图谱…':'正在读取章节图谱…');
  try{
    if(source==='zhenti')rows=buildZhentiRows();
    else{relaxData=relaxData||await loadRelaxData();if(token!==renderToken)return;rows=buildRelaxRows(relaxData)}
    const first=rows.flatMap(row=>row.cells)[0];
    if(!rows.some(row=>row.cells.some(cell=>cell.key===current)))current=first?.key||'';
    if(current)writeText(currentStorageKey(),current);
    renderMatrix();clearLoading();
  }catch(error){
    console.error('atlas source failed',error);
    matrix.replaceChildren();setLoading('图谱数据加载失败，请刷新后重试。');
  }
  if(!initial)history.replaceState(null,'',`${location.pathname}?source=${source}`);
}

function setFitMode(next){
  fitMode=next==='native'?'native':'fit';writeText(FIT_KEY,fitMode);
  frame.dataset.fit=fitMode;
  fitButtons.forEach(button=>button.classList.toggle('active',button.dataset.atlasFit===fitMode));
  applyFit();
}
function applyFit(){
  const cols=columns(),rowCount=rows.length+1;
  if(!cols||!rowCount)return;
  if(fitMode==='native'){
    frame.dataset.fit='native';
    matrix.style.setProperty('--atlas-cell','25px');matrix.style.setProperty('--atlas-gap','3px');matrix.style.setProperty('--atlas-label','54px');
    return;
  }
  frame.dataset.fit='fit';
  if(matchMedia('(max-width:999px)').matches)return;
  const w=Math.max(120,canvas.clientWidth-20),h=Math.max(100,canvas.clientHeight-20);
  let gap=2,label=52;
  let size=Math.floor(Math.min((w-label-gap*(cols+1))/cols,(h-gap*(rowCount-1))/rowCount));
  if(size<=9){gap=1;label=44;size=Math.floor(Math.min((w-label-gap*(cols+1))/cols,(h-gap*(rowCount-1))/rowCount))}
  if(size<=6){gap=0;label=38;size=Math.floor(Math.min((w-label)/cols,h/rowCount))}
  size=Math.max(4,Math.min(30,size));
  matrix.style.setProperty('--atlas-cell',`${size}px`);matrix.style.setProperty('--atlas-gap',`${gap}px`);matrix.style.setProperty('--atlas-label',`${label}px`);
}

function findCellByKey(key){for(const row of rows){const found=row.cells.find(cell=>cell.key===key);if(found)return found}return null}
function findSpatial(row,col){
  const target=rows[row];if(!target)return null;
  return target.cells.find(cell=>cell.col===col)||target.cells.reduce((best,cell)=>!best||Math.abs(cell.col-col)<Math.abs(best.col-col)?cell:best,null);
}
function activateCell(cell,{open=false,pulse=false}={}){
  if(!cell)return;
  const previous=matrix.querySelector('.atlas-cell.current');previous?.classList.remove('current');
  current=cell.key;writeText(currentStorageKey(),current);
  const target=matrix.querySelector(`[data-atlas-key="${CSS.escape(current)}"]`);
  target?.classList.add('current');
  if(pulse&&target){target.classList.remove('key-pulse');void target.offsetWidth;target.classList.add('key-pulse');setTimeout(()=>target.classList.remove('key-pulse'),200)}
  target?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
  if(open)openDrawer(cell);
}
function ensureCurrentVisible(scroll=true){
  const target=current?matrix.querySelector(`[data-atlas-key="${CSS.escape(current)}"]`):null;
  if(target){target.classList.add('current');if(scroll)target.scrollIntoView({block:'nearest',inline:'nearest'})}
}

async function loadPaper(year,{force=false}={}){
  const key=String(year);if(force)paperCache.delete(key);if(paperCache.has(key))return paperCache.get(key);
  const promise=fetch(`/data/zhenti/${key}.json`,{cache:force?'no-store':'default'}).then(response=>response.ok?response.json():null).catch(()=>null);
  paperCache.set(key,promise);return promise;
}
function figureHtml(src,alt){const safe=safeZhentiSrc(src);return safe?`<figure class="atlas-figure"><img src="${esc(safe)}" alt="${esc(alt)}" loading="lazy" decoding="async" draggable="false"></figure>`:''}
function renderZhentiQuestion(item,cell){
  if(!item)return'<div class="atlas-message">题目暂时没有载入。</div>';
  if(item.verification?.status&&item.verification.status!=='verified')return'<div class="atlas-message">该题仍在核验中。</div>';
  const figures=Array.isArray(item.figures)?item.figures:[],general=figures.filter(fig=>!fig?.option).map(fig=>figureHtml(fig.src,fig.alt||`${cell.year}年第${cell.q}题图`)).join(''),optionFigures=new Map();
  figures.filter(fig=>fig?.option).forEach(fig=>{const key=String(fig.option);optionFigures.set(key,(optionFigures.get(key)||'')+figureHtml(fig.src,fig.alt||`选项${key}`))});
  const options=item.options?`<div class="atlas-options">${Object.entries(item.options).map(([key,value])=>`<div class="atlas-option ${answerVisible&&String(key)===String(item.answer)?'answer':''}"><b>${esc(key)}.</b><div>${esc(value)}${optionFigures.get(String(key))||''}</div></div>`).join('')}</div>`:'';
  const answer=answerVisible?`<div class="atlas-answer-box"><strong>参考答案：${esc(item.answer||'')}</strong><p>${esc(item.analysis||'暂无解析')}</p></div>`:'';
  return `<p class="atlas-stem">${esc(item.stem||'')}</p>${general?`<div class="atlas-figures">${general}</div>`:''}${options}${answer}`;
}
function relaxFigure(src,index,label){const url=assetUrl(src);return url?`<figure class="atlas-figure"><img src="${esc(url)}" alt="${esc(label)} ${index+1}" loading="lazy" decoding="async" draggable="false"></figure>`:''}
function renderRelaxQuestion(question){
  const images=questionImages(question),analysisImages=explanationImages(question),entries=optionEntries(question);
  const figures=images.length?`<div class="atlas-figures">${images.map((src,i)=>relaxFigure(src,i,'原题截图')).join('')}</div>`:'';
  const options=entries.length?`<div class="atlas-options">${entries.map(item=>`<div class="atlas-option ${answerVisible&&String(item.key)===String(question.answer)?'answer':''}"><b>${esc(item.key)}.</b><div>${esc(item.text)}</div></div>`).join('')}</div>`:(images.length?`<div class="atlas-options">${'ABCD'.split('').map(key=>`<div class="atlas-option ${answerVisible&&key===String(question.answer)?'answer':''}"><b>${key}.</b><div>以原题截图中的选项为准</div></div>`).join('')}</div>`:'');
  const answer=answerVisible?`<div class="atlas-answer-box"><strong>参考答案：${esc(question.answer||'')}</strong>${analysisImages.length?`<div class="atlas-figures">${analysisImages.map((src,i)=>relaxFigure(src,i,'解析截图')).join('')}</div>`:`<p>${esc(question.explanation||'暂无文字解析')}</p>`}</div>`:'';
  return `<p class="atlas-stem">${esc(question.stem||'题干以原题截图为准')}</p>${figures}${options}${answer}`;
}
function syncStatus(){
  if(!selected)return;
  const state=selected.source==='zhenti'?zhentiState(selected.year,selected.q):relaxState(selected.question);
  statusButtons.forEach(button=>button.classList.toggle('active',button.dataset.atlasStatus===(state.rec.status||'')));
  drawerAnswer.textContent=answerVisible?'收起答案':'查看答案';
}
async function openDrawer(cell){
  selected=cell;answerVisible=false;drawer.hidden=false;drawerAnswer.hidden=false;
  if(cell.source==='zhenti'){
    drawerTitle.textContent=`${cell.year} · 第 ${cell.q} 题`;
    drawerMeta.textContent=`${SUBJECT_LABEL[cell.subject]||'408'} · ${cell.q<=40?'选择题':'综合应用题'}`;
    drawerBody.innerHTML='<div class="atlas-message">正在读取题目…</div>';syncStatus();
    let paper=await loadPaper(cell.year),item=paper?.questions?.[String(cell.q)]||null;
    if(selected!==cell)return;
    cell.item=item;drawerBody.innerHTML=renderZhentiQuestion(item,cell);syncStatus();
  }else{
    const question=cell.question,row=rows[cell.row];
    drawerTitle.textContent=`${row?.code||SUBJECT_SHORT[question.subjectId]||'408'} · 第 ${questionNumber(question,cell.col)} 题`;
    drawerMeta.textContent=`${subjectName(question.subjectId,question.subject)} · ${question.chapter||row?.title?.split(' · ').slice(1).join(' · ')||''}`;
    drawerBody.innerHTML=renderRelaxQuestion(question);syncStatus();
  }
}
function refreshDrawer(){if(!selected)return;if(selected.source==='zhenti')drawerBody.innerHTML=renderZhentiQuestion(selected.item,selected);else drawerBody.innerHTML=renderRelaxQuestion(selected.question);syncStatus()}
function closeDrawer(){drawer.hidden=true}

sourceButtons.forEach(button=>button.addEventListener('click',()=>switchSource(button.dataset.atlasSource)));
fitButtons.forEach(button=>button.addEventListener('click',()=>setFitMode(button.dataset.atlasFit)));
drawerClose?.addEventListener('click',closeDrawer);
drawerAnswer?.addEventListener('click',()=>{
  if(!selected)return;answerVisible=!answerVisible;
  if(answerVisible){if(selected.source==='zhenti')patchZhentiRecord(selected.year,selected.q,{reviewed:true});else patchRelaxRecord(selected.question.id,{reviewed:true})}
  refreshDrawer();renderMatrix({preserveScroll:true});
});
statusButtons.forEach(button=>button.addEventListener('click',()=>{
  if(!selected)return;const status=button.dataset.atlasStatus||undefined;
  if(selected.source==='zhenti')patchZhentiRecord(selected.year,selected.q,{status});else patchRelaxRecord(selected.question.id,{status});
  renderMatrix({preserveScroll:true});refreshDrawer();
}));

document.addEventListener('keydown',event=>{
  if(event.defaultPrevented)return;
  if(event.key==='Escape'&&!drawer.hidden){event.preventDefault();closeDrawer();return}
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;
  let cell=findCellByKey(current)||rows.flatMap(row=>row.cells)[0];if(!cell)return;
  if(event.key==='Enter'){event.preventDefault();openDrawer(cell);return}
  let next=null;
  if(event.key==='ArrowLeft')next=findSpatial(cell.row,cell.col-1);
  else if(event.key==='ArrowRight')next=findSpatial(cell.row,cell.col+1);
  else if(event.key==='ArrowUp')next=findSpatial(cell.row-1,cell.col);
  else if(event.key==='ArrowDown')next=findSpatial(cell.row+1,cell.col);
  else return;
  if(next){event.preventDefault();event.stopImmediatePropagation();activateCell(next,{pulse:true})}
},{capture:true});

window.addEventListener('resize',()=>requestAnimationFrame(applyFit));
if('ResizeObserver'in window)new ResizeObserver(()=>applyFit()).observe(canvas);
window.addEventListener('storage',event=>{
  const watched=source==='zhenti'?[ZHENTI_RECORD_KEY,CURRENT_KEY.zhenti]:['everflow-408-relax1000-records-v1','relax-seen','relax-mistakes','relax-bookmarks',CURRENT_KEY.relax1000];
  if(watched.includes(event.key))renderMatrix({preserveScroll:true});
});
document.addEventListener('everflow:zhenti-records-change',event=>{if(source==='zhenti'&&event.detail?.source!=='graph-next')renderMatrix({preserveScroll:true})});
document.addEventListener('everflow:relax-records-change',()=>{if(source==='relax1000')renderMatrix({preserveScroll:true})});

const querySource=new URL(location.href).searchParams.get('source');
if(['zhenti','relax1000'].includes(querySource))source=querySource;
setFitMode(fitMode);
switchSource(source,{initial:true});
window.EverflowGraphNext={version:VERSION,source:()=>source,fit:()=>fitMode};
