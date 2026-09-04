(()=>{
  const matrix=document.querySelector('[data-overview-matrix]');
  const shell=document.querySelector('[data-graph-shell]');
  const drawer=document.querySelector('[data-question-drawer]');
  const drawerBody=document.querySelector('[data-drawer-body]');
  const drawerTitle=document.querySelector('[data-drawer-title]');
  const drawerMeta=document.querySelector('[data-drawer-meta]');
  const drawerClose=document.querySelector('[data-drawer-close]');
  const drawerReopen=document.querySelector('[data-drawer-reopen]');
  const drawerAnswer=document.querySelector('[data-drawer-answer]');
  const drawerStatuses=[...document.querySelectorAll('[data-drawer-status]')];
  if(!matrix||!shell||!drawer||!drawerBody)return;

  const YEARS=Array.from({length:18},(_,i)=>2026-i);
  const QUESTIONS=Array.from({length:47},(_,i)=>i+1);
  const STORAGE_KEY='everflow-408-zhenti-wall-v1';
  const CURRENT_KEY='everflow-408-graph-current-v2';
  const PAPER_CACHE=new Map();
  const SUBJECT_INDEX=new Map();
  const SUBJECT_LABEL={ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络'};
  const DATA_VERSION='20260902-accuracy1';

  function parseKey(key){
    const match=String(key||'').match(/^(\d{4})-(\d{1,2})$/);
    if(!match)return null;
    const year=Number(match[1]),q=Number(match[2]);
    return year>=2009&&year<=2026&&q>=1&&q<=47?{year,q}:null;
  }
  function fallbackSubject(q){
    if((q>=1&&q<=10)||q===41||q===42)return'ds';
    if((q>=11&&q<=22)||q===43||q===44)return'co';
    if((q>=23&&q<=32)||q===45||q===46)return'os';
    return'cn';
  }
  function subjectFor(year,q){return SUBJECT_INDEX.get(`${year}-${q}`)||fallbackSubject(q)}
  function loadRecords(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return value&&typeof value==='object'?value:{}}catch{return{}}}
  function meaningful(r){return Boolean(r.status||r.note||r.answer||r.draftAnswer||r.reviewed||r.favorite||r.attempts||r.correctCount||r.timeSpent||Number.isFinite(Number(r.selfScore)))}
  function saveRecords(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(records))}catch{}}
  function patchRecord(year,q,patch){
    const key=`${year}-${q}`,next={...(records[key]||{}),...patch,updatedAt:new Date().toISOString()};
    Object.keys(next).forEach(k=>next[k]===undefined&&delete next[k]);
    if(meaningful(next))records[key]=next;else delete records[key];
    saveRecords();
    document.dispatchEvent(new CustomEvent('everflow:zhenti-records-change',{detail:{year,q,source:'graph'}}));
    return records[key]||{};
  }
  function latestKey(data){let found='',time=-1;for(const [key,record] of Object.entries(data)){if(!parseKey(key))continue;const next=Date.parse(record?.updatedAt||'')||0;if(next>time){time=next;found=key}}return found}
  function answerClass(record){if(record?.correct===true)return'correct';if(record?.correct===false)return'wrong';if(record?.reviewed)return'reviewed';if(record?.draftAnswer)return'draft';return'unmarked'}
  function statusClass(record){return ['mastered','fuzzy','weak'].includes(record?.status)?`status-${record.status}`:''}
  function answerText(record){if(record?.correct===true)return'答对';if(record?.correct===false)return'答错';if(record?.reviewed)return'已查看';if(record?.draftAnswer)return'作答中';return'未作答'}
  function statusText(record){if(record?.status==='mastered')return'熟悉';if(record?.status==='fuzzy')return'模糊';if(record?.status==='weak')return'不会';return'未标记'}
  function safeSrc(src){const value=String(src||'').trim();if(!value)return'';if(value.startsWith('/data/zhenti/assets/'))return value;if(/^data:image\/(?:png|jpeg|webp|svg\+xml);/i.test(value))return value;const cloudBase=String(window.EVERFLOW_CLOUD?.url||'').replace(/\/$/,'');if(cloudBase&&value.startsWith(`${cloudBase}/storage/v1/object/public/question-assets/`))return value;return''}
  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}

  async function loadPaper(year,{force=false}={}){
    const key=String(year);
    if(force){PAPER_CACHE.delete(key);window.EverflowZhentiData?.clear(key)}
    if(PAPER_CACHE.has(key))return PAPER_CACHE.get(key);
    const source=window.EverflowZhentiData?.loadPaper
      ?window.EverflowZhentiData.loadPaper(key,{force})
      :fetch(`/data/zhenti/${key}.json?v=${DATA_VERSION}`,{cache:force?'no-store':'default'}).then(response=>response.ok?response.json():null);
    const promise=Promise.resolve(source).then(paper=>{if(!paper)PAPER_CACHE.delete(key);return paper}).catch(()=>{PAPER_CACHE.delete(key);return null});
    PAPER_CACHE.set(key,promise);
    return promise;
  }
  async function primeSubjects(){
    const response=await fetch(`/data/zhenti/subject-index.json?v=${DATA_VERSION}`,{cache:'default'});
    if(!response.ok)throw new Error(`subject index HTTP ${response.status}`);
    const index=await response.json();
    for(const [year,subjects]of Object.entries(index?.years||{}))for(const [subject,questions]of Object.entries(subjects||{}))if(SUBJECT_LABEL[subject])for(const q of questions||[])SUBJECT_INDEX.set(`${year}-${q}`,subject);
    render();
    if(selected)updateCell(`${selected.year}-${selected.q}`);
  }

  let records=loadRecords(),current='',selected=null,answerVisible=false,loadToken=0,initialFocusDone=false;
  try{current=localStorage.getItem(CURRENT_KEY)||''}catch{}
  if(!parseKey(current))current=latestKey(records)||'2026-1';

  function indexCell(text,className){const cell=document.createElement('div');cell.className=`overview-index ${className}`;cell.textContent=text;cell.setAttribute('aria-hidden','true');return cell}
  function cellClasses(year,q){const key=`${year}-${q}`,record=records[key]||{},classes=['overview-cell',subjectFor(year,q),answerClass(record),statusClass(record)];if(key===current)classes.push('current');return classes.filter(Boolean).join(' ')}
  function updateCell(key){const parsed=parseKey(key);if(!parsed)return;const cell=matrix.querySelector(`.overview-cell[data-key="${key}"]`);if(!cell)return;const record=records[key]||{};cell.className=cellClasses(parsed.year,parsed.q);cell.setAttribute('aria-label',`${parsed.year}年第${parsed.q}题，${SUBJECT_LABEL[subjectFor(parsed.year,parsed.q)]}，${statusText(record)}，${answerText(record)}`);cell.title=`${parsed.year} · 第${parsed.q}题 · ${SUBJECT_LABEL[subjectFor(parsed.year,parsed.q)]} · ${statusText(record)} · ${answerText(record)}`}
  function selectCurrent(key){if(current&&current!==key)matrix.querySelector(`.overview-cell[data-key="${current}"]`)?.classList.remove('current');current=key;matrix.querySelector(`.overview-cell[data-key="${current}"]`)?.classList.add('current');try{localStorage.setItem(CURRENT_KEY,current)}catch{}}
  function questionCell(year,q){const key=`${year}-${q}`,record=records[key]||{},button=document.createElement('button');button.type='button';button.className=cellClasses(year,q);button.dataset.key=key;button.setAttribute('role','gridcell');button.setAttribute('aria-label',`${year}年第${q}题，${SUBJECT_LABEL[subjectFor(year,q)]}，${statusText(record)}，${answerText(record)}`);button.title=`${year} · 第${q}题 · ${SUBJECT_LABEL[subjectFor(year,q)]} · ${statusText(record)} · ${answerText(record)}`;button.addEventListener('click',()=>openQuestion(year,q));return button}
  function focusCurrentOnce(){if(initialFocusDone||!current||!matchMedia('(max-width:1199px)').matches)return;initialFocusDone=true;requestAnimationFrame(()=>matrix.querySelector(`.overview-cell[data-key="${current}"]`)?.scrollIntoView({block:'nearest',inline:'center',behavior:'auto'}))}
  function render({focusCurrent=false}={}){const fragment=document.createDocumentFragment();fragment.appendChild(indexCell('','overview-corner'));QUESTIONS.forEach(q=>fragment.appendChild(indexCell(String(q),'overview-q')));YEARS.forEach(year=>{fragment.appendChild(indexCell(String(year),'overview-year'));QUESTIONS.forEach(q=>fragment.appendChild(questionCell(year,q)))});matrix.replaceChildren(fragment);if(focusCurrent)focusCurrentOnce();document.dispatchEvent(new CustomEvent('everflow:graph-matrix-ready',{detail:{source:'zhenti',cols:47,rows:19}}))}

  function figureHtml(fig,year,q){const src=safeSrc(fig?.src);if(!src)return'';return `<figure class="drawer-figure"><a class="relax-image-link" href="${esc(src)}" target="_blank" rel="noopener" data-graph-image-frame><img src="${esc(src)}" data-graph-image data-graph-image-src="${esc(src)}" alt="${esc(fig?.alt||`${year}年第${q}题图`)}" loading="eager" decoding="async" fetchpriority="high" draggable="false"><span class="relax-image-error" role="button" tabindex="0" data-graph-image-retry hidden>图片载入失败 · 点击重试</span></a></figure>`}
  function questionHtml(item,year,q){
    if(!item)return`<div class="drawer-unverified"><strong>题目加载失败</strong><p>题库数据暂时没有完整载入。</p><button type="button" class="small-btn" data-graph-question-retry="${year}-${q}">重新载入本题</button></div>`;
    if(item.verification?.status!=='verified')return'<div class="drawer-unverified">该题尚未完成核验，暂不展示题干。</div>';
    const content=window.EveraQuestionContent,trust=content.verification(item.verification);
    const figures=Array.isArray(item.figures)?item.figures:[],general=figures.filter(fig=>!fig?.option).map(fig=>figureHtml(fig,year,q)).join(''),optionFigures=new Map();
    figures.filter(fig=>fig?.option).forEach(fig=>{const key=String(fig.option);optionFigures.set(key,(optionFigures.get(key)||'')+figureHtml(fig,year,q))});
    const options=item.options?`<div class="drawer-options">${Object.entries(item.options).map(([key,value])=>`<div class="drawer-option"><b>${esc(key)}.</b><div class="question-rich-text">${content.inlineText(value)}${optionFigures.get(String(key))||''}</div></div>`).join('')}</div>`:'';
    const answer=answerVisible?`<div class="drawer-answer-box"><strong>参考答案：${esc(item.answer)}</strong><div class="question-rich-text">${content.richText(item.analysis,{fallback:'暂无解析'})}</div></div>`:'';
    return `<div class="question-verify-row"><span class="verify-badge ${trust.tier}">${esc(trust.label)}</span><span class="verify-note">${esc(trust.note)}</span></div><div class="drawer-stem question-rich-text">${content.richText(item.stem)}</div>${trust.tier==='paraphrase'?`<p class="verification-hint">${esc(trust.note)}。</p>`:''}${general?`<div class="drawer-figures">${general}</div>`:''}${options}${answer}`;
  }
  function syncDrawerControls(){if(!selected)return;const record=records[`${selected.year}-${selected.q}`]||{};drawerStatuses.forEach(btn=>btn.classList.toggle('active',btn.dataset.drawerStatus===(record.status||'')));drawerAnswer.textContent=answerVisible?'收起答案':'查看答案'}
  function showDrawer(){drawer.hidden=false;drawerReopen.hidden=true}
  function hideDrawer(){drawer.hidden=true;drawerReopen.hidden=!selected}
  async function openQuestion(year,q){
    const key=`${year}-${q}`;
    selectCurrent(key);selected={year,q,item:null};answerVisible=false;drawer.dataset.feedbackEntity=key;showDrawer();
    drawerTitle.textContent=`${year} · 第 ${q} 题`;
    drawerMeta.textContent=`${SUBJECT_LABEL[subjectFor(year,q)]} · ${q<=40?'选择题':'综合应用题'}`;
    drawerBody.innerHTML='<div class="drawer-loading">正在读取题目…</div>';
    drawerAnswer.hidden=true;syncDrawerControls();
    const token=++loadToken;
    let paper=await loadPaper(year),item=paper?.questions?.[String(q)]||null;
    if(!item||item.verification?.status!=='verified'){paper=await loadPaper(year,{force:true});item=paper?.questions?.[String(q)]||null}
    if(token!==loadToken||!selected||selected.year!==year||selected.q!==q)return;
    selected.item=item;
    if(item?.subject&&SUBJECT_LABEL[item.subject])SUBJECT_INDEX.set(key,item.subject);
    const subject=item?.subject||subjectFor(year,q);
    updateCell(key);
    drawerMeta.textContent=`${SUBJECT_LABEL[subject]||SUBJECT_LABEL[subjectFor(year,q)]} · ${item?.type==='comprehensive'||q>40?'综合应用题':'选择题'}`;
    drawerBody.innerHTML=questionHtml(item,year,q);
    drawerAnswer.hidden=!(item&&item.verification?.status==='verified');
    syncDrawerControls();
  }
  function refreshSelected(){if(!selected)return;drawerBody.innerHTML=questionHtml(selected.item,selected.year,selected.q);syncDrawerControls()}

  drawerClose.addEventListener('click',hideDrawer);
  drawerReopen?.addEventListener('click',()=>{if(selected){showDrawer();refreshSelected()}});
  drawerAnswer?.addEventListener('click',()=>{if(!selected?.item||selected.item.verification?.status!=='verified')return;answerVisible=!answerVisible;if(answerVisible){patchRecord(selected.year,selected.q,{reviewed:true});updateCell(`${selected.year}-${selected.q}`)}refreshSelected()});
  drawerStatuses.forEach(btn=>btn.addEventListener('click',()=>{if(!selected)return;patchRecord(selected.year,selected.q,{status:btn.dataset.drawerStatus||undefined});updateCell(`${selected.year}-${selected.q}`);syncDrawerControls()}));
  drawerBody.addEventListener('error',event=>{const img=event.target;if(!(img instanceof HTMLImageElement)||!img.matches('[data-graph-image]'))return;const frame=img.closest('[data-graph-image-frame]'),retry=frame?.querySelector('[data-graph-image-retry]');img.hidden=true;frame?.classList.add('is-error');frame?.removeAttribute('href');if(retry)retry.hidden=false},true);
  drawerBody.addEventListener('load',event=>{const img=event.target;if(!(img instanceof HTMLImageElement)||!img.matches('[data-graph-image]'))return;const frame=img.closest('[data-graph-image-frame]'),retry=frame?.querySelector('[data-graph-image-retry]'),src=img.dataset.graphImageSrc||img.src;img.hidden=false;frame?.classList.remove('is-error');if(frame)frame.href=src;if(retry)retry.hidden=true},true);
  drawerBody.addEventListener('click',event=>{const questionRetry=event.target.closest('[data-graph-question-retry]');if(questionRetry){const parsed=parseKey(questionRetry.dataset.graphQuestionRetry);if(parsed)openQuestion(parsed.year,parsed.q);return}const retry=event.target.closest('[data-graph-image-retry]');if(!retry)return;event.preventDefault();event.stopPropagation();const frame=retry.closest('[data-graph-image-frame]'),img=frame?.querySelector('[data-graph-image]'),src=img?.dataset.graphImageSrc;if(!img||!src)return;retry.hidden=true;img.hidden=false;img.src=`${src}${src.includes('?')?'&':'?'}retry=${Date.now()}`});
  drawerBody.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-graph-image-retry]'))event.target.click()});

  function refresh(){records=loadRecords();try{current=localStorage.getItem(CURRENT_KEY)||current}catch{}if(!parseKey(current))current=latestKey(records)||'2026-1';render();if(selected)syncDrawerControls()}
  window.addEventListener('pageshow',event=>{if(event.persisted)refresh()});
  window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===CURRENT_KEY)refresh()});
  document.addEventListener('everflow:zhenti-records-change',refresh);

  render({focusCurrent:true});
  primeSubjects().catch(err=>console.error('Everflow graph subject index failed',err));
})();
