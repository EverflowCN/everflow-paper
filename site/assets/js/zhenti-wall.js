(()=>{
  const root=document.querySelector('[data-wall-root]');
  if(!root)return;

  const YEARS=Array.from({length:18},(_,i)=>2026-i);
  const TOTAL=47;
  const STORAGE_KEY='everflow-408-zhenti-wall-v1';
  const STATUS_LABELS={mastered:'熟练',fuzzy:'模糊',weak:'不会'};
  const SUBJECTS={
    ds:{code:'DS',name:'数据结构'},
    co:{code:'CO',name:'计算机组成原理'},
    os:{code:'OS',name:'操作系统'},
    cn:{code:'CN',name:'计算机网络'}
  };

  const els={
    tabs:[...root.querySelectorAll('[data-wall-view]')],
    panels:[...root.querySelectorAll('[data-view-panel]')],
    yearStrip:root.querySelector('[data-year-strip]'),
    currentYear:root.querySelector('[data-current-year]'),
    progressYear:root.querySelector('[data-progress-year]'),
    progressPercent:root.querySelector('[data-progress-percent]'),
    progressBar:root.querySelector('[data-progress-bar]'),
    statDone:root.querySelector('[data-stat-done]'),
    statMastered:root.querySelector('[data-stat-mastered]'),
    statFuzzy:root.querySelector('[data-stat-fuzzy]'),
    statWeak:root.querySelector('[data-stat-weak]'),
    statUnmarked:root.querySelector('[data-stat-unmarked]'),
    subjectFilters:[...root.querySelectorAll('[data-subject]')],
    questionGrid:root.querySelector('[data-question-grid]'),
    inspectorEmpty:root.querySelector('[data-inspector-empty]'),
    inspectorContent:root.querySelector('[data-inspector-content]'),
    selectedSubject:root.querySelector('[data-selected-subject]'),
    selectedType:root.querySelector('[data-selected-type]'),
    selectedYear:root.querySelector('[data-selected-year]'),
    selectedQuestion:root.querySelector('[data-selected-question]'),
    statusButtons:[...root.querySelectorAll('[data-set-status]')],
    note:root.querySelector('[data-question-note]'),
    noteState:root.querySelector('[data-note-state]'),
    prev:root.querySelector('[data-prev-question]'),
    next:root.querySelector('[data-next-question]'),
    yearOverview:root.querySelector('[data-year-overview]'),
    reviewList:root.querySelector('[data-review-list]'),
    reviewWeakOnly:root.querySelector('[data-review-weak-only]')
  };

  function subjectForQuestion(q){
    if((q>=1&&q<=11)||(q>=41&&q<=42))return 'ds';
    if((q>=12&&q<=23)||(q>=43&&q<=44))return 'co';
    if((q>=24&&q<=33)||(q>=45&&q<=46))return 'os';
    return 'cn';
  }

  function safeLoad(){
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      return parsed&&typeof parsed==='object'?parsed:{};
    }catch{return {}}
  }

  let records=safeLoad();
  let currentYear=Number(localStorage.getItem('everflow-408-zhenti-year'))||2026;
  if(!YEARS.includes(currentYear))currentYear=2026;
  let currentSubject='all';
  let currentView='bank';
  let selectedQuestion=null;
  let weakOnly=false;
  let noteTimer=null;

  const keyFor=(year,q)=>`${year}-${q}`;
  const getRecord=(year,q)=>records[keyFor(year,q)]||{};

  function persist(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(records));
  }

  function setRecord(year,q,patch={}){
    const key=keyFor(year,q);
    const next={...getRecord(year,q),...patch,updatedAt:new Date().toISOString()};
    if(!next.status&&!String(next.note||'').trim())delete records[key];
    else records[key]=next;
    persist();
  }

  function statsForYear(year){
    let mastered=0,fuzzy=0,weak=0;
    for(let q=1;q<=TOTAL;q++){
      const status=getRecord(year,q).status;
      if(status==='mastered')mastered++;
      if(status==='fuzzy')fuzzy++;
      if(status==='weak')weak++;
    }
    const done=mastered+fuzzy+weak;
    return {mastered,fuzzy,weak,done,unmarked:TOTAL-done,percent:Math.round(done/TOTAL*100)};
  }

  function renderYears(){
    els.yearStrip.innerHTML='';
    YEARS.forEach(year=>{
      const btn=document.createElement('button');
      btn.type='button';btn.className='year-btn'+(year===currentYear?' active':'');btn.textContent=String(year);
      btn.addEventListener('click',()=>selectYear(year));
      els.yearStrip.appendChild(btn);
    });
    els.currentYear.textContent=String(currentYear);
  }

  function renderProgress(){
    const s=statsForYear(currentYear);
    els.progressYear.textContent=String(currentYear);
    els.progressPercent.textContent=`${s.percent}%`;
    els.progressBar.style.width=`${s.percent}%`;
    els.statDone.textContent=`${s.done}/${TOTAL}`;
    els.statMastered.textContent=String(s.mastered);
    els.statFuzzy.textContent=String(s.fuzzy);
    els.statWeak.textContent=String(s.weak);
    els.statUnmarked.textContent=String(s.unmarked);
  }

  function visibleQuestions(){
    const out=[];
    for(let q=1;q<=TOTAL;q++){
      if(currentSubject!=='all'&&subjectForQuestion(q)!==currentSubject)continue;
      out.push(q);
    }
    return out;
  }

  function renderQuestions(){
    els.questionGrid.innerHTML='';
    const visible=visibleQuestions();
    visible.forEach(q=>{
      const subject=subjectForQuestion(q);
      const status=getRecord(currentYear,q).status||'';
      const btn=document.createElement('button');
      btn.type='button';
      btn.className=`question-tile${status?` ${status}`:''}${selectedQuestion===q?' selected':''}`;
      btn.dataset.question=String(q);
      btn.setAttribute('aria-label',`${currentYear} 年第 ${q} 题，${SUBJECTS[subject].name}${status?`，${STATUS_LABELS[status]}`:'，未标记'}`);
      btn.innerHTML=`<strong>${q}</strong><span>${SUBJECTS[subject].code} · ${q<=40?'选择':'综合'}</span>`;
      btn.addEventListener('click',()=>selectQuestion(q));
      els.questionGrid.appendChild(btn);
    });
    if(selectedQuestion&&!visible.includes(selectedQuestion)){
      selectedQuestion=null;
      renderInspector();
    }
  }

  function renderInspector(){
    if(!selectedQuestion){
      els.inspectorEmpty.hidden=false;
      els.inspectorContent.hidden=true;
      return;
    }
    const q=selectedQuestion;
    const subject=subjectForQuestion(q);
    const record=getRecord(currentYear,q);
    els.inspectorEmpty.hidden=true;
    els.inspectorContent.hidden=false;
    els.selectedSubject.textContent=SUBJECTS[subject].code;
    els.selectedType.textContent=q<=40?'选择题':'综合应用题';
    els.selectedYear.textContent=String(currentYear);
    els.selectedQuestion.textContent=String(q);
    els.statusButtons.forEach(btn=>btn.classList.toggle('active',Boolean(btn.dataset.setStatus)&&btn.dataset.setStatus===record.status));
    els.note.value=record.note||'';
    els.noteState.textContent=record.updatedAt?`已保存 · ${new Date(record.updatedAt).toLocaleString('zh-CN',{hour12:false})}`:'本机自动保存';

    const visible=visibleQuestions();
    const index=visible.indexOf(q);
    els.prev.disabled=index<=0;
    els.next.disabled=index<0||index>=visible.length-1;
  }

  function selectQuestion(q){
    selectedQuestion=q;
    renderQuestions();
    renderInspector();
    if(window.innerWidth<=980)root.querySelector('[data-question-inspector]')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function selectYear(year){
    currentYear=year;
    selectedQuestion=null;
    localStorage.setItem('everflow-408-zhenti-year',String(year));
    renderBank();
  }

  function renderBank(){
    renderYears();renderProgress();renderQuestions();renderInspector();
  }

  function renderYearOverview(){
    els.yearOverview.innerHTML='';
    YEARS.forEach(year=>{
      const s=statsForYear(year);
      const card=document.createElement('article');
      card.className='year-overview-card';
      card.tabIndex=0;
      card.setAttribute('role','button');
      card.setAttribute('aria-label',`打开 ${year} 年真题`);
      card.innerHTML=`<div class="overview-year-row"><strong>${year}</strong><span>${s.done}/${TOTAL} · ${s.percent}%</span></div><div class="overview-progress"><span style="width:${s.percent}%"></span></div><div class="overview-counts"><span>熟练 <b>${s.mastered}</b></span><span>模糊 <b>${s.fuzzy}</b></span><span>不会 <b>${s.weak}</b></span><span>未标记 <b>${s.unmarked}</b></span></div>`;
      const open=()=>{currentYear=year;localStorage.setItem('everflow-408-zhenti-year',String(year));switchView('bank')};
      card.addEventListener('click',open);
      card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
      els.yearOverview.appendChild(card);
    });
  }

  function reviewEntries(){
    const entries=[];
    YEARS.forEach(year=>{
      for(let q=1;q<=TOTAL;q++){
        const record=getRecord(year,q);
        if(record.status!=='fuzzy'&&record.status!=='weak')continue;
        if(weakOnly&&record.status!=='weak')continue;
        entries.push({year,q,subject:subjectForQuestion(q),...record});
      }
    });
    return entries.sort((a,b)=>b.year-a.year||a.q-b.q);
  }

  function renderReview(){
    const entries=reviewEntries();
    els.reviewWeakOnly.classList.toggle('active',weakOnly);
    els.reviewWeakOnly.textContent=weakOnly?'显示全部薄弱题':'仅看不会';
    els.reviewList.innerHTML='';
    if(!entries.length){
      els.reviewList.innerHTML='<div class="wall-empty"><strong>暂时没有需要多刷的题</strong>把题目标记为“模糊”或“不会”后，会自动出现在这里。</div>';
      return;
    }
    entries.forEach(item=>{
      const row=document.createElement('article');
      row.className='review-row';
      row.tabIndex=0;row.setAttribute('role','button');
      row.innerHTML=`<div class="review-year">${item.year}</div><div class="review-main"><strong>第 ${item.q} 题 · ${SUBJECTS[item.subject].code}</strong><span>${SUBJECTS[item.subject].name}${item.note?` · ${escapeHtml(item.note.slice(0,38))}${item.note.length>38?'…':''}`:''}</span></div><span class="review-status ${item.status}">${STATUS_LABELS[item.status]}</span>`;
      const open=()=>{currentYear=item.year;selectedQuestion=item.q;localStorage.setItem('everflow-408-zhenti-year',String(item.year));switchView('bank');setTimeout(()=>selectQuestion(item.q),0)};
      row.addEventListener('click',open);
      row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
      els.reviewList.appendChild(row);
    });
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function switchView(view){
    currentView=view;
    els.tabs.forEach(btn=>btn.classList.toggle('active',btn.dataset.wallView===view));
    els.panels.forEach(panel=>panel.classList.toggle('active',panel.dataset.viewPanel===view));
    if(view==='bank')renderBank();
    if(view==='years')renderYearOverview();
    if(view==='review')renderReview();
  }

  els.tabs.forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.wallView)));
  els.subjectFilters.forEach(btn=>btn.addEventListener('click',()=>{
    currentSubject=btn.dataset.subject||'all';
    els.subjectFilters.forEach(x=>x.classList.toggle('active',x===btn));
    renderQuestions();renderInspector();
  }));

  els.statusButtons.forEach(btn=>btn.addEventListener('click',()=>{
    if(!selectedQuestion)return;
    setRecord(currentYear,selectedQuestion,{status:btn.dataset.setStatus||''});
    renderProgress();renderQuestions();renderInspector();
    if(currentView==='review')renderReview();
  }));

  els.note.addEventListener('input',()=>{
    if(!selectedQuestion)return;
    els.noteState.textContent='正在保存…';
    clearTimeout(noteTimer);
    noteTimer=setTimeout(()=>{
      setRecord(currentYear,selectedQuestion,{note:els.note.value});
      els.noteState.textContent='已保存';
      if(currentView==='review')renderReview();
    },350);
  });

  els.prev.addEventListener('click',()=>{
    const visible=visibleQuestions(),i=visible.indexOf(selectedQuestion);
    if(i>0)selectQuestion(visible[i-1]);
  });
  els.next.addEventListener('click',()=>{
    const visible=visibleQuestions(),i=visible.indexOf(selectedQuestion);
    if(i>=0&&i<visible.length-1)selectQuestion(visible[i+1]);
  });
  els.reviewWeakOnly.addEventListener('click',()=>{weakOnly=!weakOnly;renderReview()});

  window.addEventListener('storage',e=>{
    if(e.key!==STORAGE_KEY)return;
    records=safeLoad();
    if(currentView==='bank')renderBank();
    if(currentView==='years')renderYearOverview();
    if(currentView==='review')renderReview();
  });

  switchView('bank');
})();