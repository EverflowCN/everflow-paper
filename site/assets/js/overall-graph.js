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
  const SUBJECT_LABEL={ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络'};

  function parseKey(key){
    const match=String(key||'').match(/^(\d{4})-(\d{1,2})$/);
    if(!match)return null;
    const year=Number(match[1]),q=Number(match[2]);
    return year>=2009&&year<=2026&&q>=1&&q<=47?{year,q}:null;
  }

  function subjectFor(q){
    if((q>=1&&q<=10)||q===41||q===42)return'ds';
    if((q>=11&&q<=22)||q===43||q===44)return'co';
    if((q>=23&&q<=32)||q===45||q===46)return'os';
    return'cn';
  }

  function loadRecords(){
    try{
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      return value&&typeof value==='object'?value:{};
    }catch{return{}}
  }

  function meaningful(r){
    return Boolean(r.status||r.note||r.answer||r.draftAnswer||r.reviewed||r.favorite||r.attempts||r.correctCount||r.timeSpent);
  }

  function saveRecords(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(records))}catch{}
  }

  function patchRecord(year,q,patch){
    const key=`${year}-${q}`;
    const next={...(records[key]||{}),...patch,updatedAt:new Date().toISOString()};
    Object.keys(next).forEach(k=>next[k]===undefined&&delete next[k]);
    if(meaningful(next))records[key]=next;else delete records[key];
    saveRecords();
    return records[key]||{};
  }

  function latestKey(data){
    let found='',time=-1;
    for(const [key,record] of Object.entries(data)){
      if(!parseKey(key))continue;
      const next=Date.parse(record?.updatedAt||'')||0;
      if(next>time){time=next;found=key}
    }
    return found;
  }

  function answerClass(record){
    if(record?.correct===true)return'correct';
    if(record?.correct===false)return'wrong';
    if(record?.reviewed)return'reviewed';
    if(record?.draftAnswer)return'draft';
    return'unmarked';
  }

  function statusClass(record){
    return ['mastered','fuzzy','weak'].includes(record?.status)?`status-${record.status}`:'';
  }

  function answerText(record){
    if(record?.correct===true)return'答对';
    if(record?.correct===false)return'答错';
    if(record?.reviewed)return'已查看';
    if(record?.draftAnswer)return'作答中';
    return'未作答';
  }

  function statusText(record){
    if(record?.status==='mastered')return'熟悉';
    if(record?.status==='fuzzy')return'模糊';
    if(record?.status==='weak')return'不会';
    return'未标记';
  }

  function safeSrc(src){
    const value=String(src||'').trim();
    if(!value)return'';
    if(value.startsWith('/data/zhenti/assets/'))return value;
    if(/^https:\/\/raw\.githubusercontent\.com\//i.test(value))return value;
    if(/^data:image\/(?:png|jpeg|webp|svg\+xml);/i.test(value))return value;
    return'';
  }

  function esc(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  async function loadPaper(year){
    if(PAPER_CACHE.has(year))return PAPER_CACHE.get(year);
    const promise=fetch(`/data/zhenti/${year}.json`,{cache:'no-store'})
      .then(response=>response.ok?response.json():null)
      .catch(()=>null);
    PAPER_CACHE.set(year,promise);
    return promise;
  }

  let records=loadRecords();
  let current='';
  let selected=null;
  let answerVisible=false;
  let loadToken=0;
  let initialFocusDone=false;
  try{current=localStorage.getItem(CURRENT_KEY)||''}catch{}
  if(!parseKey(current))current=latestKey(records);

  function indexCell(text,className){
    const cell=document.createElement('div');
    cell.className=`overview-index ${className}`;
    cell.textContent=text;
    cell.setAttribute('aria-hidden','true');
    return cell;
  }

  function cellClasses(year,q){
    const key=`${year}-${q}`,record=records[key]||{};
    const classes=['overview-cell',subjectFor(q),answerClass(record),statusClass(record)];
    if(key===current)classes.push('current');
    return classes.filter(Boolean).join(' ');
  }

  function updateCell(key){
    const parsed=parseKey(key);if(!parsed)return;
    const cell=matrix.querySelector(`.overview-cell[data-key="${key}"]`);if(!cell)return;
    const record=records[key]||{};
    cell.className=cellClasses(parsed.year,parsed.q);
    cell.setAttribute('aria-label',`${parsed.year}年第${parsed.q}题，${statusText(record)}，${answerText(record)}`);
    cell.title=`${parsed.year} · 第${parsed.q}题 · ${statusText(record)} · ${answerText(record)}`;
  }

  function selectCurrent(key){
    if(current&&current!==key)matrix.querySelector(`.overview-cell[data-key="${current}"]`)?.classList.remove('current');
    current=key;
    matrix.querySelector(`.overview-cell[data-key="${current}"]`)?.classList.add('current');
    try{localStorage.setItem(CURRENT_KEY,current)}catch{}
  }

  function questionCell(year,q){
    const key=`${year}-${q}`;
    const record=records[key]||{};
    const button=document.createElement('button');
    button.type='button';
    button.className=cellClasses(year,q);
    button.dataset.key=key;
    button.setAttribute('role','gridcell');
    button.setAttribute('aria-label',`${year}年第${q}题，${statusText(record)}，${answerText(record)}`);
    button.title=`${year} · 第${q}题 · ${statusText(record)} · ${answerText(record)}`;
    button.addEventListener('click',()=>openQuestion(year,q));
    return button;
  }

  function focusCurrentOnce(){
    if(initialFocusDone||!current||!matchMedia('(max-width:1199px)').matches)return;
    initialFocusDone=true;
    requestAnimationFrame(()=>{
      matrix.querySelector(`.overview-cell[data-key="${current}"]`)?.scrollIntoView({block:'nearest',inline:'center',behavior:'auto'});
    });
  }

  function render({focusCurrent=false}={}){
    const fragment=document.createDocumentFragment();
    fragment.appendChild(indexCell('','overview-corner'));
    QUESTIONS.forEach(q=>fragment.appendChild(indexCell(String(q),'overview-q')));
    YEARS.forEach(year=>{
      fragment.appendChild(indexCell(String(year),'overview-year'));
      QUESTIONS.forEach(q=>fragment.appendChild(questionCell(year,q)));
    });
    matrix.replaceChildren(fragment);
    if(focusCurrent)focusCurrentOnce();
  }

  function figureHtml(fig,year,q){
    const src=safeSrc(fig?.src);if(!src)return'';
    return `<figure class="drawer-figure"><img src="${esc(src)}" alt="${esc(fig?.alt||`${year}年第${q}题图`)}" loading="lazy" decoding="async" draggable="false"></figure>`;
  }

  function questionHtml(item,year,q){
    if(!item||item.verification?.status!=='verified')return'<div class="drawer-unverified">该题尚未完成核验，暂不展示题干。</div>';
    const figures=Array.isArray(item.figures)?item.figures:[];
    const general=figures.filter(fig=>!fig?.option).map(fig=>figureHtml(fig,year,q)).join('');
    const optionFigures=new Map();
    figures.filter(fig=>fig?.option).forEach(fig=>{
      const key=String(fig.option);optionFigures.set(key,(optionFigures.get(key)||'')+figureHtml(fig,year,q));
    });
    const options=item.options?`<div class="drawer-options">${Object.entries(item.options).map(([key,value])=>`<div class="drawer-option"><b>${esc(key)}.</b><div>${esc(value)}${optionFigures.get(String(key))||''}</div></div>`).join('')}</div>`:'';
    const answer=answerVisible?`<div class="drawer-answer-box"><strong>参考答案：${esc(item.answer)}</strong><p>${esc(item.analysis||'暂无解析')}</p></div>`:'';
    return `<p class="drawer-stem">${esc(item.stem||'')}</p>${general?`<div class="drawer-figures">${general}</div>`:''}${options}${answer}`;
  }

  function syncDrawerControls(){
    if(!selected)return;
    const record=records[`${selected.year}-${selected.q}`]||{};
    drawerStatuses.forEach(btn=>btn.classList.toggle('active',btn.dataset.drawerStatus===(record.status||'')));
    drawerAnswer.textContent=answerVisible?'收起答案':'查看答案';
  }

  function showDrawer(){
    drawer.hidden=false;
    drawerReopen.hidden=true;
    shell.classList.add('drawer-open');
  }

  function hideDrawer(){
    drawer.hidden=true;
    shell.classList.remove('drawer-open');
    drawerReopen.hidden=!selected;
  }

  async function openQuestion(year,q){
    const key=`${year}-${q}`;
    selectCurrent(key);
    selected={year,q,item:null};
    answerVisible=false;
    showDrawer();
    drawerTitle.textContent=`${year} · 第 ${q} 题`;
    drawerMeta.textContent=`${SUBJECT_LABEL[subjectFor(q)]} · ${q<=40?'选择题':'综合应用题'}`;
    drawerBody.innerHTML='<div class="drawer-loading">正在读取题目…</div>';
    drawerAnswer.hidden=true;
    syncDrawerControls();

    const token=++loadToken;
    const paper=await loadPaper(year);
    if(token!==loadToken||!selected||selected.year!==year||selected.q!==q)return;
    const item=paper?.questions?.[String(q)]||null;
    selected.item=item;
    const subject=item?.subject||subjectFor(q);
    drawerMeta.textContent=`${SUBJECT_LABEL[subject]||SUBJECT_LABEL[subjectFor(q)]} · ${item?.type==='comprehensive'||q>40?'综合应用题':'选择题'}`;
    drawerBody.innerHTML=questionHtml(item,year,q);
    drawerAnswer.hidden=!(item&&item.verification?.status==='verified');
    syncDrawerControls();
  }

  function refreshSelected(){
    if(!selected)return;
    drawerBody.innerHTML=questionHtml(selected.item,selected.year,selected.q);
    syncDrawerControls();
  }

  drawerClose.addEventListener('click',hideDrawer);
  drawerReopen?.addEventListener('click',()=>{if(selected){showDrawer();refreshSelected()}});
  drawerAnswer?.addEventListener('click',()=>{
    if(!selected?.item||selected.item.verification?.status!=='verified')return;
    answerVisible=!answerVisible;
    if(answerVisible){
      patchRecord(selected.year,selected.q,{reviewed:true});
      updateCell(`${selected.year}-${selected.q}`);
    }
    refreshSelected();
  });

  drawerStatuses.forEach(btn=>btn.addEventListener('click',()=>{
    if(!selected)return;
    const status=btn.dataset.drawerStatus||undefined;
    patchRecord(selected.year,selected.q,{status});
    updateCell(`${selected.year}-${selected.q}`);
    syncDrawerControls();
  }));

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!drawer.hidden){hideDrawer();event.preventDefault()}
  });

  function refresh(){
    records=loadRecords();
    try{current=localStorage.getItem(CURRENT_KEY)||current}catch{}
    if(!parseKey(current))current=latestKey(records);
    render();
    if(selected)syncDrawerControls();
  }

  window.addEventListener('pageshow',event=>{if(event.persisted)refresh()});
  window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===CURRENT_KEY)refresh()});

  render({focusCurrent:true});
  const initial=parseKey(current)||{year:2026,q:1};
  openQuestion(initial.year,initial.q);
})();
