(()=>{
  const root=document.querySelector('[data-wall-root]');
  if(!root)return;

  const YEARS=Array.from({length:18},(_,i)=>2009+i);
  const ALL_QUESTIONS=Array.from({length:47},(_,i)=>i+1);
  const STORAGE_KEY='everflow-408-zhenti-wall-v1';
  const SHORTCUT_TIP_KEY='everflow-408-shortcut-tip-seen';
  const DATA_BASE='/data/zhenti';
  const DATA_VERSION='20260902-accuracy1';
  const STATUS_LABEL={mastered:'熟练',fuzzy:'模糊',weak:'不会'};
  const SOURCE_LABEL={tommy408:'TommyTay0712/408',neville408:'408-exam-paper',csgraduates:'计算机考研杂货铺',foreverlink:'408 ForeverLink',hermes408:'Hermes 408',noobdream:'N诺',csyanku:'CSYanKu',xit:'厦门工学院原卷'};
  const SUBJECTS={
    ds:{name:'数据结构',short:'DS',questions:[1,2,3,4,5,6,7,8,9,10,41,42],chapters:['绪论与复杂度','线性表','栈、队列和数组','串','树与二叉树','图','查找','排序']},
    co:{name:'计算机组成原理',short:'CO',questions:[11,12,13,14,15,16,17,18,19,20,21,22,43,44],chapters:['计算机系统概述','数据的表示和运算','存储系统','指令系统','中央处理器','总线','输入/输出系统']},
    os:{name:'操作系统',short:'OS',questions:[23,24,25,26,27,28,29,30,31,32,45,46],chapters:['操作系统概述','进程与线程','处理机调度','同步与互斥','死锁','内存管理','文件管理','I/O 管理']},
    cn:{name:'计算机网络',short:'CN',questions:[33,34,35,36,37,38,39,40,47],chapters:['计算机网络体系结构','物理层','数据链路层','网络层','传输层','应用层']}
  };

  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const els={
    modeTabs:$$('[data-main-subject]'),subjectWorkspace:$('[data-subject-workspace]'),wholeHome:$('[data-full-paper-home]'),
    subjectTabs:$$('[data-main-subject]:not([data-main-subject="all"])'),sideModes:$$('[data-side-mode]'),sideTitle:$('[data-side-title]'),sideList:$('[data-side-list]'),
    summarySubject:$('[data-summary-subject]'),summaryDone:$('[data-summary-done]'),summaryWeak:$('[data-summary-weak]'),summaryRate:$('[data-summary-rate]'),
    rangeButtons:$$('[data-range]'),customRange:$('[data-custom-range]'),rangeFrom:$('[data-range-from]'),rangeTo:$('[data-range-to]'),
    displayButtons:$$('[data-display]'),displayPanels:$$('[data-display-panel]'),scope:$('[data-current-scope]'),matrixHead:$('[data-matrix-head]'),matrixBody:$('[data-matrix-body]'),yearList:$('[data-year-list]'),
    modal:$('[data-question-modal]'),modalClose:$$('[data-modal-close]'),modalYear:$('[data-modal-year]'),modalQuestion:$('[data-modal-question]'),modalPoint:$('[data-modal-point]'),modalType:$('[data-modal-type]'),modalQuestionBox:$('[data-question-content]'),
    modalStatuses:$$('[data-modal-status]'),analysis:$('[data-analysis-box]'),noteBox:$('[data-note-box]'),note:$('[data-question-note]'),noteState:$('[data-note-state]'),tools:$$('[data-tool]'),timerText:$('[data-timer-text]'),prev:$('[data-prev-question]'),next:$('[data-next-question]'),
    wholeFinished:$('[data-whole-finished]'),wholeDone:$('[data-whole-done]'),wholeRate:$('[data-whole-rate]'),wholeYearGrid:$('[data-whole-year-grid]'),
    paperSession:$('[data-paper-session]'),paperExit:$('[data-paper-exit]'),paperYear:$('[data-paper-year]'),paperProgress:$('[data-paper-progress]'),paperPercent:$('[data-paper-percent]'),paperProgressBar:$('[data-paper-progress-bar]'),paperTimer:$('[data-paper-timer]'),paperAnswerGrid:$('[data-paper-answer-grid]'),paperSubject:$('[data-paper-subject]'),paperType:$('[data-paper-type]'),paperCurrent:$('[data-paper-current]'),paperQuestionBox:$('.paper-question-content'),paperNote:$('[data-paper-note]'),paperNoteState:$('[data-paper-note-state]'),paperStatuses:$$('[data-paper-status]'),paperPrev:$('[data-paper-prev]'),paperNext:$('[data-paper-next]'),paperSubjectLegend:$('.paper-subject-legend')
  };

  const storage={
    get:key=>{try{return localStorage.getItem(key)}catch{return null}},
    set:(key,value)=>{try{localStorage.setItem(key,value)}catch{}},
    json:(key,fallback={})=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?v:fallback}catch{return fallback}}
  };

  const paperCache=new Map();
  const subjectIndex=new Map();
  const indexedYears=new Set();
  let subjectIndexReady=false;
  function indexPaper(year,paper){
    if(!paper?.questions)return;
    for(const q of ALL_QUESTIONS){
      const item=paper.questions[String(q)];
      if(item?.subject&&SUBJECTS[item.subject])subjectIndex.set(`${year}-${q}`,item.subject);
    }
    indexedYears.add(String(year));
  }
  async function loadPaper(year){
    if(paperCache.has(year))return paperCache.get(year);
    const promise=fetch(`${DATA_BASE}/${year}.json?v=${DATA_VERSION}`,{cache:'no-store'})
      .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()})
      .then(paper=>{indexPaper(year,paper);return paper})
      .catch(error=>{paperCache.delete(year);console.warn(`[Everflow] ${year} 真题读取失败`,error);return null});
    paperCache.set(year,promise);
    return promise;
  }
  async function getQuestionData(year,q){
    const paper=await loadPaper(year);
    return paper?.questions?.[String(q)]||null;
  }
  function fallbackSubject(q){
    if(SUBJECTS.ds.questions.includes(q))return'ds';
    if(SUBJECTS.co.questions.includes(q))return'co';
    if(SUBJECTS.os.questions.includes(q))return'os';
    return'cn';
  }
  function subjectForQuestion(q,year=null){
    if(year!=null){const actual=subjectIndex.get(`${year}-${q}`);if(actual&&SUBJECTS[actual])return actual}
    return fallbackSubject(q);
  }
  function questionsForSubject(year,key=subject){
    if(!subjectIndexReady&&!indexedYears.has(String(year)))return SUBJECTS[key]?.questions||[];
    return ALL_QUESTIONS.filter(q=>subjectForQuestion(q,year)===key);
  }
  function unionQuestions(years,key=subject){
    if(!subjectIndexReady&&!years.some(year=>indexedYears.has(String(year))))return SUBJECTS[key]?.questions||[];
    const set=new Set();years.forEach(year=>questionsForSubject(year,key).forEach(q=>set.add(q)));
    return [...set].sort((a,b)=>a-b);
  }
  async function buildSubjectIndex(){
    const response=await fetch(`${DATA_BASE}/subject-index.json?v=${DATA_VERSION}`,{cache:'default'});
    if(!response.ok)throw new Error(`subject index HTTP ${response.status}`);
    const payload=await response.json();
    for(const [year,groups] of Object.entries(payload?.years||{})){
      for(const [key,numbers] of Object.entries(groups||{})){
        if(!SUBJECTS[key]||!Array.isArray(numbers))continue;
        numbers.forEach(q=>subjectIndex.set(`${year}-${q}`,key));
      }
      indexedYears.add(String(year));
    }
    subjectIndexReady=true;
    renderMode();
    document.dispatchEvent(new CustomEvent('everflow:zhenti-subject-index-ready'));
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function sourceText(item){return (item?.verification?.sources||[]).map(id=>SOURCE_LABEL[id]||id).join(' / ')}
  function isChoice(item,q){return item?.type==='single'||(q<=40&&item?.options)}
  function hasSubmitted(r){return Boolean(r.answer)&&typeof r.correct==='boolean'}
  function isDone(r){return hasSubmitted(r)||Boolean(r.reviewed)||Boolean(r.status)||Number.isFinite(Number(r.selfScore))}
  function answerState(r){
    if(r.correct===true)return'correct';
    if(r.correct===false)return'wrong';
    if(r.reviewed)return'reviewed';
    if(r.draftAnswer)return'draft';
    return'unmarked';
  }
  function masteryClass(r){return r.status?` status-${r.status}`:''}

  function load(){return storage.json(STORAGE_KEY,{})}
  let records=load();
  const recKey=(year,q)=>`${year}-${q}`;
  const record=(year,q)=>records[recKey(year,q)]||{};
  function meaningful(r){
    return Boolean(r.status||r.note||r.answer||r.draftAnswer||r.reviewed||r.favorite||r.attempts||r.correctCount||r.timeSpent||Number.isFinite(Number(r.selfScore)));
  }
  function save(){storage.set(STORAGE_KEY,JSON.stringify(records))}
  function patchRecord(year,q,patch){
    const key=recKey(year,q),next={...record(year,q),...patch,updatedAt:new Date().toISOString()};
    Object.keys(next).forEach(k=>next[k]===undefined&&delete next[k]);
    if(!meaningful(next))delete records[key];else records[key]=next;
    save();
    document.dispatchEvent(new CustomEvent('everflow:zhenti-records-change',{detail:{year,q}}));
    return records[key]||{};
  }

  let mode=storage.get('everflow-408-wall-mode')||'subject';
  let subject=storage.get('everflow-408-wall-subject')||'ds';
  if(!SUBJECTS[subject])subject='ds';
  let sideMode='point',selectedPoint='全部考点',range='all',display='matrix',selectedYear=null,selectedQuestion=null;
  let noteTimer=null,fullNoteTimer=null;
  let modalQuestionStartedAt=0,paperQuestionStartedAt=0;

  let timerInterval=null,timerStartedAt=0,timerAccumulated=0;
  let fullYear=null,fullQuestion=1,fullTimerInterval=null,fullStartedAt=0,fullTimerAccumulated=0;

  function formatShort(ms){const sec=Math.floor(ms/1000),m=String(Math.floor(sec/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return`${m}:${s}`}
  function formatLong(ms){const sec=Math.floor(ms/1000),h=String(Math.floor(sec/3600)).padStart(2,'0'),m=String(Math.floor(sec%3600/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return`${h}:${m}:${s}`}
  function modalElapsed(){return timerAccumulated+(timerStartedAt?Date.now()-timerStartedAt:0)}
  function fullElapsed(){return fullTimerAccumulated+(fullStartedAt?Date.now()-fullStartedAt:0)}
  function resetTimer(){clearInterval(timerInterval);timerInterval=null;timerStartedAt=0;timerAccumulated=0;els.timerText.textContent='计时'}
  function toggleTimer(){
    if(timerStartedAt){timerAccumulated+=Date.now()-timerStartedAt;timerStartedAt=0;clearInterval(timerInterval);timerInterval=null;els.timerText.textContent=formatShort(timerAccumulated);return}
    timerStartedAt=Date.now();els.timerText.textContent=formatShort(timerAccumulated);timerInterval=setInterval(()=>{els.timerText.textContent=formatShort(modalElapsed())},1000);
  }
  function startWholeTimer(){clearInterval(fullTimerInterval);fullTimerAccumulated=0;fullStartedAt=Date.now();els.paperTimer.textContent='00:00:00';fullTimerInterval=setInterval(()=>{els.paperTimer.textContent=formatLong(fullElapsed())},1000)}
  function toggleWholeTimer(){
    if(fullStartedAt){fullTimerAccumulated+=Date.now()-fullStartedAt;fullStartedAt=0;clearInterval(fullTimerInterval);fullTimerInterval=null;els.paperTimer.textContent=formatLong(fullTimerAccumulated);return}
    fullStartedAt=Date.now();fullTimerInterval=setInterval(()=>{els.paperTimer.textContent=formatLong(fullElapsed())},1000);
  }
  function stopWholeTimer(){clearInterval(fullTimerInterval);fullTimerInterval=null;fullStartedAt=0;fullTimerAccumulated=0}

  function renderQuestionHtml(item,q,r,{context='modal'}={}){
    if(!item||item.verification?.status!=='verified'){
      return `<div class="question-live question-unverified"><div class="question-verify-row"><span class="verify-badge pending">待核验</span></div><div class="question-stem"><span class="question-number">（${q}）</span><p>该题尚未完成年份与题号的来源核验，暂不展示题干。核验通过后才会进入正式题库。</p></div><div class="shortcut-inline">快捷键：←/J 上一题 · →/K 下一题 · 1/2/3 掌握状态 · ? 帮助</div></div>`;
    }

    const choice=isChoice(item,q),submitted=hasSubmitted(r),showAnswer=submitted||Boolean(r.reviewed);
    const fav=`<button class="question-favorite${r.favorite?' active':''}" type="button" data-answer-favorite title="收藏 / 取消收藏（F）">${r.favorite?'★ 已收藏':'☆ 收藏'}</button>`;
    const verificationNote=item.verification?.mode==='cross-checked-paraphrase'
      ?'题干转述版'
      :item.verification?.mode==='original-paper-corrected-transcription'
        ?'原卷校正版'
        :'已核验题干';
    const verify=`<div class="question-verify-row"><span class="verify-badge">已核验</span><span class="verify-note">${esc(verificationNote)}</span>${fav}</div>`;
    const stem=`<div class="question-stem"><span class="question-number">（${q}）</span><p>${esc(item.stem)}</p></div>`;

    let options='';
    if(item.options){
      options=`<div class="live-options answer-options">${Object.entries(item.options).map(([k,v])=>{
        let cls='live-option answer-option';
        const selected=(r.draftAnswer||r.answer)===k;
        if(selected)cls+=' selected';
        if(showAnswer&&k===String(item.answer))cls+=' is-correct';
        if(submitted&&r.answer===k&&r.correct===false)cls+=' is-wrong';
        return `<button type="button" class="${cls}" data-answer-option="${esc(k)}" ${submitted?'disabled':''}><b>${esc(k)}.</b><span>${esc(v)}</span><kbd>${esc(k)}</kbd></button>`;
      }).join('')}</div>`;
    }

    let result='';
    if(choice){
      if(submitted)result=`<div class="answer-result ${r.correct?'correct':'wrong'}"><strong>${r.correct?'✓ 回答正确':'✕ 回答错误'}</strong><span>你的答案：${esc(r.answer)} · 正确答案：${esc(item.answer)}</span></div>`;
      const primaryLabel=submitted?'下一题 →':'提交答案',disabled=!submitted&&!r.draftAnswer;
      const reviewButton=submitted?'':`<button type="button" class="answer-review" data-answer-reveal>${showAnswer?'收起解析':'查看解析'}<kbd>R</kbd></button>`;
      result+=`<div class="answer-actions"><button type="button" class="answer-submit" data-answer-submit ${disabled?'disabled':''}>${primaryLabel}<kbd>Enter</kbd></button>${reviewButton}</div>`;
    }else result=`<div class="answer-actions comprehensive-actions"><button type="button" class="answer-submit" data-answer-reveal>${showAnswer?'收起参考答案':'查看参考答案'}<kbd>Enter</kbd></button></div>`;

    const answer=showAnswer?`<div class="live-answer"><strong>参考答案：${esc(item.answer)}</strong><p>${esc(item.analysis||'暂无解析')}</p></div>`:'';
    const shortcut=choice?`<div class="shortcut-inline">A/B/C/D 选项 · Enter 提交/下一题 · ←/→ 或 J/K 切题 · 1/2/3 熟练度 · R 解析 · N 笔记 · T 计时 · F 收藏</div>`:`<div class="shortcut-inline">Enter 查看答案 · ←/→ 或 J/K 切题 · 1/2/3 自评 · N 笔记 · F 收藏</div>`;
    return `<div class="question-live" data-answer-context="${context}">${verify}${stem}${options}${result}${answer}<div class="question-source-note">交叉核验：${esc(sourceText(item))}</div>${shortcut}</div>`;
  }

  async function renderInto(box,year,q,context){
    const token=`${year}-${q}-${Date.now()}`;box.dataset.loadToken=token;box.innerHTML='<div class="question-loading">正在读取并核验题库…</div>';
    const item=await getQuestionData(year,q);if(box.dataset.loadToken!==token)return;
    if(!item){
      box.innerHTML=`<div class="question-load-error"><strong>${year} 年第 ${q} 题暂时没有载入</strong><p>网络波动或缓存更新可能导致本次读取失败，重试不会影响答题记录。</p><button type="button" data-question-retry>重新读取</button></div>`;
      box.querySelector('[data-question-retry]')?.addEventListener('click',()=>renderInto(box,year,q,context));
      return;
    }
    if(item?.subject&&SUBJECTS[item.subject]){
      subjectIndex.set(`${year}-${q}`,item.subject);
      if(context==='modal')els.modalPoint.textContent=SUBJECTS[item.subject].name;
      if(context==='paper')els.paperSubject.textContent=`${SUBJECTS[item.subject].short} ${SUBJECTS[item.subject].name}`;
    }
    box.innerHTML=renderQuestionHtml(item,q,record(year,q),{context});attachQuestionInteractions(box,year,q,context,item);
    if(context==='modal'){
      if(item?.verification?.status==='verified')els.analysis.innerHTML=`<strong>参考答案：${esc(item.answer)}</strong><p>${esc(item.analysis||'暂无解析')}</p><div class="question-source-note">来源核验：${esc(sourceText(item))}</div>`;
      else els.analysis.innerHTML='<strong>解析</strong><p>该题尚未核验，因此不展示答案和解析。</p>';
    }
  }

  function refreshAfterRecordChange(context){
    renderSummary();renderMatrix();renderList();if(sideMode==='year')renderSide();if(mode==='whole')renderWholeHome();if(context==='paper')renderPaperSession(false);else renderModal(false);
  }

  async function submitChoice(year,q,context,item){
    const r=record(year,q),answer=r.draftAnswer;if(!answer||!item)return;
    const correct=String(answer)===String(item.answer),spent=Math.max(0,Date.now()-(context==='paper'?paperQuestionStartedAt:modalQuestionStartedAt));
    patchRecord(year,q,{answer,draftAnswer:undefined,correct,attempts:Number(r.attempts||0)+1,correctCount:Number(r.correctCount||0)+(correct?1:0),timeSpent:Number(r.timeSpent||0)+Math.round(spent/1000),lastAnsweredAt:new Date().toISOString()});
    if(context==='modal')els.analysis.hidden=false;refreshAfterRecordChange(context);
  }
  function toggleReveal(year,q,context){const r=record(year,q);patchRecord(year,q,{reviewed:!r.reviewed});refreshAfterRecordChange(context)}
  function stepByContext(context,delta){if(context==='paper')stepWhole(delta);else stepQuestion(delta)}

  function attachQuestionInteractions(box,year,q,context,item){
    box.querySelectorAll('[data-answer-option]').forEach(btn=>btn.addEventListener('click',()=>{const r=record(year,q);if(hasSubmitted(r))return;patchRecord(year,q,{draftAnswer:btn.dataset.answerOption});if(context==='paper')renderPaperSession(false);else renderModal(false)}));
    const submit=box.querySelector('[data-answer-submit]');if(submit)submit.addEventListener('click',()=>{const r=record(year,q);if(hasSubmitted(r)){stepByContext(context,1);return}submitChoice(year,q,context,item)});
    const reveal=box.querySelector('[data-answer-reveal]');if(reveal)reveal.addEventListener('click',()=>toggleReveal(year,q,context));
    const favorite=box.querySelector('[data-answer-favorite]');if(favorite)favorite.addEventListener('click',()=>{patchRecord(year,q,{favorite:!record(year,q).favorite});if(context==='paper')renderPaperSession(false);else renderModal(false)});
  }

  function setupRangeSelects(){const options=YEARS.map(y=>`<option value="${y}">${y}</option>`).join('');els.rangeFrom.innerHTML=options;els.rangeTo.innerHTML=options;els.rangeFrom.value='2009';els.rangeTo.value='2026'}
  function visibleYears(){if(range==='recent')return YEARS.filter(y=>y>=2017);if(range==='custom'){let a=Number(els.rangeFrom.value)||2009,b=Number(els.rangeTo.value)||2026;if(a>b)[a,b]=[b,a];return YEARS.filter(y=>y>=a&&y<=b)}return YEARS}
  function statsForQuestions(year,qs){
    let mastered=0,fuzzy=0,weak=0,done=0,correct=0,wrong=0;
    qs.forEach(q=>{const r=record(year,q),s=r.status;if(s==='mastered')mastered++;else if(s==='fuzzy')fuzzy++;else if(s==='weak')weak++;if(isDone(r))done++;if(r.correct===true)correct++;if(r.correct===false)wrong++});
    const total=qs.length;return{mastered,fuzzy,weak,done,correct,wrong,total,rate:total?Math.round(done/total*100):0};
  }
  function subjectStats(years=visibleYears()){
    let done=0,weak=0,total=0;
    years.forEach(year=>{const qs=questionsForSubject(year,subject);total+=qs.length;qs.forEach(q=>{const r=record(year,q);if(isDone(r))done++;if(r.status==='fuzzy'||r.status==='weak')weak++})});
    return{done,weak,total,rate:total?Math.round(done/total*100):0};
  }
  const yearStats=year=>statsForQuestions(year,questionsForSubject(year,subject));
  const wholeYearStats=year=>statsForQuestions(year,ALL_QUESTIONS);

  function renderModeTabs(){els.modeTabs.forEach(btn=>{const active=btn.dataset.mainSubject==='all'?mode==='whole':mode==='subject'&&btn.dataset.mainSubject===subject;btn.classList.toggle('active',active)})}
  function setMode(next,subjectKey){mode=next;storage.set('everflow-408-wall-mode',mode);if(subjectKey&&SUBJECTS[subjectKey]){subject=subjectKey;storage.set('everflow-408-wall-subject',subject)}renderMode()}
  function renderMode(){renderModeTabs();els.subjectWorkspace.hidden=mode==='whole';els.wholeHome.hidden=mode!=='whole';if(mode==='whole')renderWholeHome();else renderAll()}
  function renderSubjectTabs(){els.subjectTabs.forEach(btn=>btn.classList.toggle('active',btn.dataset.mainSubject===subject))}
  function renderSide(){
    els.sideModes.forEach(btn=>btn.classList.toggle('active',btn.dataset.sideMode===sideMode));els.sideTitle.textContent=sideMode==='point'?'考点目录':'年份目录';els.sideList.innerHTML='';
    if(sideMode==='point'){
      const group=document.createElement('div');group.className='side-group';const title=document.createElement('button');title.type='button';title.className='side-group-title';title.textContent=SUBJECTS[subject].name;title.addEventListener('click',()=>{selectedPoint='全部考点';renderSide();renderScope()});group.appendChild(title);
      SUBJECTS[subject].chapters.forEach((chapter,i)=>{const btn=document.createElement('button');btn.type='button';btn.className='side-item'+(selectedPoint===chapter?' active':'');btn.textContent=`${i+1}. ${chapter}`;btn.addEventListener('click',()=>{selectedPoint=chapter;renderSide();renderScope()});group.appendChild(btn)});els.sideList.appendChild(group);
    }else YEARS.slice().reverse().forEach(year=>{const s=yearStats(year),btn=document.createElement('button');btn.type='button';btn.className='side-item side-year';btn.innerHTML=`<b>${year}</b><span>${s.done}/${s.total}</span>`;btn.addEventListener('click',()=>{range='custom';els.rangeFrom.value=String(year);els.rangeTo.value=String(year);renderAll()});els.sideList.appendChild(btn)});
  }
  function renderScope(){els.scope.textContent=`${SUBJECTS[subject].name} · ${selectedPoint}`}
  function renderSummary(){const s=subjectStats();els.summarySubject.textContent=SUBJECTS[subject].name;els.summaryDone.textContent=String(s.done);els.summaryWeak.textContent=String(s.weak);els.summaryRate.textContent=`${s.rate}%`}
  function renderToolbar(){els.rangeButtons.forEach(btn=>btn.classList.toggle('active',btn.dataset.range===range));els.customRange.hidden=range!=='custom';els.displayButtons.forEach(btn=>btn.classList.toggle('active',btn.dataset.display===display));els.displayPanels.forEach(panel=>panel.hidden=panel.dataset.displayPanel!==display)}
  function renderMatrix(){
    const years=visibleYears(),qs=unionQuestions(years,subject);els.matrixHead.innerHTML=`<tr><th class="freq-head">题</th><th class="year-head">年份</th>${qs.map(q=>`<th class="q-head">${q}</th>`).join('')}</tr>`;els.matrixBody.innerHTML='';
    years.forEach(year=>{
      const own=new Set(questionsForSubject(year,subject)),tr=document.createElement('tr');
      const qCells=qs.map(q=>{
        if(!own.has(q))return'<td class="question-cell question-cell-na" aria-hidden="true"></td>';
        const r=record(year,q),state=answerState(r);return`<td class="question-cell"><button class="matrix-q ${state}${masteryClass(r)}" type="button" data-year="${year}" data-q="${q}" aria-label="${year} 年第 ${q} 题">${q}</button></td>`;
      }).join('');
      tr.innerHTML=`<td class="freq-cell"><span class="freq-badge">${own.size}</span></td><td class="year-cell">${year}</td>${qCells}`;els.matrixBody.appendChild(tr);
    });
    els.matrixBody.querySelectorAll('.matrix-q').forEach(btn=>btn.addEventListener('click',()=>openQuestion(Number(btn.dataset.year),Number(btn.dataset.q))));
  }
  function renderList(){
    els.yearList.innerHTML='';visibleYears().forEach(year=>{const qs=questionsForSubject(year,subject),s=statsForQuestions(year,qs),card=document.createElement('article');card.className='year-list-card';card.innerHTML=`<div class="year-list-head"><strong>${year}</strong><span>${s.done}/${s.total} · ${s.rate}%</span></div><div class="year-list-progress"><i style="width:${s.rate}%"></i></div><div class="year-list-meta"><span>答对 ${s.correct}</span><span>答错 ${s.wrong}</span><span>模糊 ${s.fuzzy}</span><span>不会 ${s.weak}</span></div><button type="button" ${qs.length?'':'disabled'}>进入 ${year} 真题</button>`;card.querySelector('button').addEventListener('click',()=>{if(qs.length)openQuestion(year,qs[0])});els.yearList.appendChild(card)});
  }
  function renderAll(){renderModeTabs();renderSubjectTabs();renderSide();renderScope();renderSummary();renderToolbar();renderMatrix();renderList()}

  function renderWholeHome(){
    let totalDone=0,finished=0;YEARS.forEach(y=>{const s=wholeYearStats(y);totalDone+=s.done;if(s.done===47)finished++});const total=YEARS.length*47;
    els.wholeFinished.textContent=String(finished);els.wholeDone.textContent=String(totalDone);els.wholeRate.textContent=`${Math.round(totalDone/total*100)}%`;els.wholeYearGrid.innerHTML='';
    YEARS.slice().reverse().forEach(year=>{const s=wholeYearStats(year),card=document.createElement('article');card.className='whole-year-card';const mini=ALL_QUESTIONS.map(q=>{const r=record(year,q);return`<i class="${answerState(r)}${masteryClass(r)}"></i>`}).join('');card.innerHTML=`<div class="whole-year-head"><div><span>408 · FULL PAPER</span><strong>${year}</strong></div><b>${s.rate}%</b></div><div class="whole-year-progress"><i style="width:${s.rate}%"></i></div><div class="whole-year-meta"><span>已做 <b>${s.done}/47</b></span><span>答对 <b>${s.correct}</b></span><span>答错 <b>${s.wrong}</b></span><span>不会 <b>${s.weak}</b></span></div><div class="whole-mini-grid">${mini}</div><button class="whole-start" type="button">${s.done?'继续整套':'开始整套'} →</button>`;card.querySelector('.whole-start').addEventListener('click',()=>openWholePaper(year));els.wholeYearGrid.appendChild(card)});
  }

  function renderModal(){
    if(selectedYear==null||selectedQuestion==null)return;
    const r=record(selectedYear,selectedQuestion),subKey=subjectForQuestion(selectedQuestion,selectedYear),sub=SUBJECTS[subKey];
    els.modalYear.textContent=String(selectedYear);els.modalQuestion.textContent=String(selectedQuestion);els.modalPoint.textContent=sub.name;els.modalType.textContent=selectedQuestion<=40?'选择题':'综合应用题';
    els.modalStatuses.forEach(btn=>btn.classList.toggle('active',Boolean(btn.dataset.modalStatus)&&btn.dataset.modalStatus===r.status));els.note.value=r.note||'';els.noteState.textContent=r.updatedAt?`已保存 · ${new Date(r.updatedAt).toLocaleString('zh-CN',{hour12:false})}`:'本机自动保存';
    const qs=questionsForSubject(selectedYear,subKey),i=qs.indexOf(selectedQuestion);els.prev.disabled=i<=0;els.next.disabled=i<0||i>=qs.length-1;renderInto(els.modalQuestionBox,selectedYear,selectedQuestion,'modal');
  }
  function openQuestion(year,q){
    const actual=subjectForQuestion(q,year);if(subjectIndexReady&&SUBJECTS[actual]&&mode==='subject'&&subject!==actual){subject=actual;storage.set('everflow-408-wall-subject',subject);renderAll()}
    selectedYear=year;selectedQuestion=q;modalQuestionStartedAt=Date.now();els.modal.hidden=false;document.body.style.overflow='hidden';els.analysis.hidden=true;els.noteBox.hidden=true;resetTimer();renderModal();
  }
  function closeQuestion(){els.modal.hidden=true;document.body.style.overflow='';resetTimer()}
  function stepQuestion(delta){
    const subKey=subjectForQuestion(selectedQuestion,selectedYear),qs=questionsForSubject(selectedYear,subKey),i=qs.indexOf(selectedQuestion),next=qs[i+delta];
    if(next!=null){selectedQuestion=next;modalQuestionStartedAt=Date.now();els.analysis.hidden=true;els.noteBox.hidden=true;resetTimer();renderModal()}
  }

  function compactRanges(qs){
    if(!qs.length)return'—';const parts=[];let start=qs[0],prev=qs[0];for(let i=1;i<=qs.length;i++){const cur=qs[i];if(cur===prev+1){prev=cur;continue}parts.push(start===prev?String(start):`${start}—${prev}`);start=prev=cur}return parts.join(' / ');
  }
  function renderPaperLegend(year){if(!els.paperSubjectLegend)return;els.paperSubjectLegend.innerHTML=Object.entries(SUBJECTS).map(([key,v])=>`<span>${compactRanges(questionsForSubject(year,key))} ${v.name}</span>`).join('')}
  function openWholePaper(year){fullYear=year;const firstUnanswered=ALL_QUESTIONS.find(q=>!isDone(record(year,q)));fullQuestion=firstUnanswered||1;paperQuestionStartedAt=Date.now();els.paperSession.hidden=false;document.body.style.overflow='hidden';startWholeTimer();renderPaperSession()}
  function closeWholePaper(){els.paperSession.hidden=true;document.body.style.overflow='';stopWholeTimer();renderWholeHome()}
  function renderPaperSession(){
    if(fullYear==null)return;
    const s=wholeYearStats(fullYear),r=record(fullYear,fullQuestion),subKey=subjectForQuestion(fullQuestion,fullYear),sub=SUBJECTS[subKey];
    els.paperYear.textContent=String(fullYear);els.paperProgress.textContent=`${s.done}/47`;els.paperPercent.textContent=`${s.rate}%`;els.paperProgressBar.style.width=`${s.rate}%`;els.paperSubject.textContent=`${sub.short} ${sub.name}`;els.paperType.textContent=fullQuestion<=40?'选择题':'综合应用题';els.paperCurrent.textContent=String(fullQuestion);renderPaperLegend(fullYear);
    els.paperNote.value=r.note||'';els.paperNoteState.textContent=r.updatedAt?`已保存 · ${new Date(r.updatedAt).toLocaleString('zh-CN',{hour12:false})}`:'本机自动保存';els.paperStatuses.forEach(btn=>btn.classList.toggle('active',Boolean(btn.dataset.paperStatus)&&btn.dataset.paperStatus===r.status));els.paperPrev.disabled=fullQuestion<=1;els.paperNext.disabled=fullQuestion>=47;
    els.paperAnswerGrid.innerHTML=ALL_QUESTIONS.map(q=>{const rr=record(fullYear,q);return`<button type="button" class="paper-answer ${answerState(rr)}${masteryClass(rr)}${q===fullQuestion?' current':''}" data-paper-jump="${q}" title="第 ${q} 题 · ${SUBJECTS[subjectForQuestion(q,fullYear)].name}">${q}</button>`}).join('');
    els.paperAnswerGrid.querySelectorAll('[data-paper-jump]').forEach(btn=>btn.addEventListener('click',()=>{fullQuestion=Number(btn.dataset.paperJump);paperQuestionStartedAt=Date.now();renderPaperSession()}));renderInto(els.paperQuestionBox,fullYear,fullQuestion,'paper');
  }
  function stepWhole(delta){const next=fullQuestion+delta;if(next>=1&&next<=47){fullQuestion=next;paperQuestionStartedAt=Date.now();renderPaperSession()}}

  function setMastery(context,status){const year=context==='paper'?fullYear:selectedYear,q=context==='paper'?fullQuestion:selectedQuestion;if(year==null||q==null)return;patchRecord(year,q,{status});refreshAfterRecordChange(context)}
  function activeContext(){if(els.paperSession&&!els.paperSession.hidden)return'paper';if(els.modal&&!els.modal.hidden)return'modal';return null}
  function isTyping(){const el=document.activeElement;if(!el)return false;return ['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||Boolean(el.isContentEditable)}
  function currentBox(context){return context==='paper'?els.paperQuestionBox:els.modalQuestionBox}
  function shortcutOption(context,key){const btn=currentBox(context)?.querySelector(`[data-answer-option="${key}"]`);if(btn&&!btn.disabled)btn.click()}
  function shortcutEnter(context){const box=currentBox(context),submit=box?.querySelector('[data-answer-submit]'),reveal=box?.querySelector('[data-answer-reveal]');if(submit){submit.click();return}if(reveal){reveal.click();return}stepByContext(context,1)}
  function shortcutReveal(context){if(context==='modal'){els.analysis.hidden=!els.analysis.hidden;return}const box=currentBox(context),reveal=box?.querySelector('[data-answer-reveal]');if(reveal)reveal.click()}
  function shortcutNote(context){if(context==='modal'){els.noteBox.hidden=false;els.note.focus()}else els.paperNote.focus()}
  function shortcutFavorite(context){const btn=currentBox(context)?.querySelector('[data-answer-favorite]');if(btn)btn.click()}

  function installShortcutHelp(){
    const fab=document.createElement('button');fab.type='button';fab.className='shortcut-fab';fab.dataset.shortcutHelp='';fab.innerHTML='⌨ <span>快捷键</span><kbd>?</kbd>';document.body.appendChild(fab);
    const overlay=document.createElement('div');overlay.className='shortcut-help';overlay.hidden=true;overlay.innerHTML=`<div class="shortcut-help-backdrop" data-shortcut-close></div><section class="shortcut-help-card" role="dialog" aria-modal="true" aria-label="408 真题墙键盘快捷键"><header><div><span>DESKTOP SHORTCUTS</span><strong>键盘快捷键</strong></div><button type="button" data-shortcut-close>×</button></header><div class="shortcut-grid"><div><kbd>A–D</kbd><span>选择答案</span></div><div><kbd>Enter</kbd><span>提交 / 下一题</span></div><div><kbd>← →</kbd><span>上一题 / 下一题</span></div><div><kbd>J K</kbd><span>上一题 / 下一题</span></div><div><kbd>1 2 3</kbd><span>熟练 / 模糊 / 不会</span></div><div><kbd>R</kbd><span>查看解析</span></div><div><kbd>N</kbd><span>复盘笔记</span></div><div><kbd>T</kbd><span>开始 / 暂停计时</span></div><div><kbd>F</kbd><span>收藏 / 取消收藏</span></div><div><kbd>Esc</kbd><span>关闭 / 退出整套</span></div></div><p>在输入框、笔记框或下拉框中输入时，字母快捷键自动暂停。</p></section>`;document.body.appendChild(overlay);
    const open=()=>{overlay.hidden=false},close=()=>{overlay.hidden=true};fab.addEventListener('click',open);overlay.querySelectorAll('[data-shortcut-close]').forEach(el=>el.addEventListener('click',close));overlay._open=open;overlay._close=close;window.__everflowShortcutHelp=overlay;
    if(!storage.get(SHORTCUT_TIP_KEY)&&matchMedia('(min-width:900px)').matches){const tip=document.createElement('div');tip.className='shortcut-tip';tip.innerHTML='电脑刷题：<b>A–D</b> 选项，<b>Enter</b> 提交，<b>← →</b> 切题，按 <b>?</b> 查看全部快捷键。';document.body.appendChild(tip);storage.set(SHORTCUT_TIP_KEY,'1');setTimeout(()=>tip.classList.add('show'),100);setTimeout(()=>{tip.classList.remove('show');setTimeout(()=>tip.remove(),250)},6500)}
  }

  els.modeTabs.forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.mainSubject;if(key==='all')setMode('whole');else{selectedPoint='全部考点';setMode('subject',key)}}));
  els.sideModes.forEach(btn=>btn.addEventListener('click',()=>{sideMode=btn.dataset.sideMode;renderSide()}));els.rangeButtons.forEach(btn=>btn.addEventListener('click',()=>{range=btn.dataset.range;renderAll()}));els.rangeFrom.addEventListener('change',renderAll);els.rangeTo.addEventListener('change',renderAll);els.displayButtons.forEach(btn=>btn.addEventListener('click',()=>{display=btn.dataset.display;renderToolbar()}));els.modalClose.forEach(el=>el.addEventListener('click',closeQuestion));els.modalStatuses.forEach(btn=>btn.addEventListener('click',()=>setMastery('modal',btn.dataset.modalStatus||'')));
  els.note.addEventListener('input',()=>{if(selectedYear==null)return;els.noteState.textContent='正在保存…';clearTimeout(noteTimer);noteTimer=setTimeout(()=>{patchRecord(selectedYear,selectedQuestion,{note:els.note.value});els.noteState.textContent='已保存'},300)});
  els.tools.forEach(btn=>btn.addEventListener('click',()=>{const tool=btn.dataset.tool;if(tool==='analysis')els.analysis.hidden=!els.analysis.hidden;if(tool==='note'){els.noteBox.hidden=!els.noteBox.hidden;if(!els.noteBox.hidden)els.note.focus()}if(tool==='timer')toggleTimer()}));els.prev.addEventListener('click',()=>stepQuestion(-1));els.next.addEventListener('click',()=>stepQuestion(1));els.paperExit.addEventListener('click',closeWholePaper);els.paperPrev.addEventListener('click',()=>stepWhole(-1));els.paperNext.addEventListener('click',()=>stepWhole(1));els.paperStatuses.forEach(btn=>btn.addEventListener('click',()=>setMastery('paper',btn.dataset.paperStatus||'')));
  els.paperNote.addEventListener('input',()=>{if(fullYear==null)return;els.paperNoteState.textContent='正在保存…';clearTimeout(fullNoteTimer);fullNoteTimer=setTimeout(()=>{patchRecord(fullYear,fullQuestion,{note:els.paperNote.value});els.paperNoteState.textContent='已保存'},300)});if(els.paperTimer?.parentElement){els.paperTimer.parentElement.title='点击开始 / 暂停计时（T）';els.paperTimer.parentElement.style.cursor='pointer';els.paperTimer.parentElement.addEventListener('click',toggleWholeTimer)}

  document.addEventListener('keydown',e=>{
    const key=e.key;if(isTyping()){if(key==='Escape'){document.activeElement.blur();e.preventDefault()}return}
    if(key==='?'||e.code==='Slash'&&e.shiftKey){e.preventDefault();const help=window.__everflowShortcutHelp;if(help){help.hidden?help._open():help._close()}return}
    const help=window.__everflowShortcutHelp;if(key==='Escape'&&help&&!help.hidden){e.preventDefault();help._close();return}
    const context=activeContext();if(!context)return;if(key==='Escape'){e.preventDefault();if(context==='paper')closeWholePaper();else closeQuestion();return}
    const upper=key.toUpperCase();if(['A','B','C','D'].includes(upper)){e.preventDefault();shortcutOption(context,upper);return}if(key==='Enter'){e.preventDefault();shortcutEnter(context);return}if(key==='ArrowLeft'||upper==='J'){e.preventDefault();stepByContext(context,-1);return}if(key==='ArrowRight'||upper==='K'){e.preventDefault();stepByContext(context,1);return}if(key==='1'||key==='2'||key==='3'){e.preventDefault();setMastery(context,key==='1'?'mastered':key==='2'?'fuzzy':'weak');return}if(upper==='R'){e.preventDefault();shortcutReveal(context);return}if(upper==='N'){e.preventDefault();shortcutNote(context);return}if(upper==='T'){e.preventDefault();context==='paper'?toggleWholeTimer():toggleTimer();return}if(upper==='F'){e.preventDefault();shortcutFavorite(context)}
  });

  window.addEventListener('storage',e=>{if(e.key!==STORAGE_KEY)return;records=load();renderMode();if(!els.modal.hidden)renderModal();if(!els.paperSession.hidden)renderPaperSession()});
  window.EveraZhentiWall={openQuestion,subjectForQuestion,questionsForSubject,loadPaper};

  setupRangeSelects();installShortcutHelp();renderMode();buildSubjectIndex().catch(err=>console.warn('Everflow subject index fallback enabled',err));
})();
