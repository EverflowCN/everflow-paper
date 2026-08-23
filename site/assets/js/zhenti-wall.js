(()=>{
  const root=document.querySelector('[data-wall-root]');
  if(!root)return;

  const YEARS=Array.from({length:18},(_,i)=>2009+i);
  const STORAGE_KEY='everflow-408-zhenti-wall-v1';
  const STATUS_LABEL={mastered:'熟练',fuzzy:'模糊',weak:'不会'};
  const SUBJECTS={
    ds:{name:'数据结构',short:'DS',questions:[1,2,3,4,5,6,7,8,9,10,11,41,42],chapters:['绪论与复杂度','线性表','栈、队列和数组','串','树与二叉树','图','查找','排序']},
    co:{name:'计算机组成原理',short:'CO',questions:[12,13,14,15,16,17,18,19,20,21,22,23,43,44],chapters:['计算机系统概述','数据的表示和运算','存储系统','指令系统','中央处理器','总线','输入/输出系统']},
    os:{name:'操作系统',short:'OS',questions:[24,25,26,27,28,29,30,31,32,33,45,46],chapters:['操作系统概述','进程与线程','处理机调度','同步与互斥','死锁','内存管理','文件管理','I/O 管理']},
    cn:{name:'计算机网络',short:'CN',questions:[34,35,36,37,38,39,40,47],chapters:['计算机网络体系结构','物理层','数据链路层','网络层','传输层','应用层']}
  };

  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const els={
    subjectTabs:$$('[data-main-subject]'),sideModes:$$('[data-side-mode]'),sideTitle:$('[data-side-title]'),sideList:$('[data-side-list]'),
    summarySubject:$('[data-summary-subject]'),summaryDone:$('[data-summary-done]'),summaryWeak:$('[data-summary-weak]'),summaryRate:$('[data-summary-rate]'),
    rangeButtons:$$('[data-range]'),customRange:$('[data-custom-range]'),rangeFrom:$('[data-range-from]'),rangeTo:$('[data-range-to]'),
    displayButtons:$$('[data-display]'),displayPanels:$$('[data-display-panel]'),scope:$('[data-current-scope]'),matrixHead:$('[data-matrix-head]'),matrixBody:$('[data-matrix-body]'),yearList:$('[data-year-list]'),
    modal:$('[data-question-modal]'),modalClose:$$('[data-modal-close]'),modalYear:$('[data-modal-year]'),modalQuestion:$('[data-modal-question]'),modalPoint:$('[data-modal-point]'),modalType:$('[data-modal-type]'),paperQuestion:$('[data-paper-question]'),
    modalStatuses:$$('[data-modal-status]'),analysis:$('[data-analysis-box]'),noteBox:$('[data-note-box]'),note:$('[data-question-note]'),noteState:$('[data-note-state]'),tools:$$('[data-tool]'),timerText:$('[data-timer-text]'),prev:$('[data-prev-question]'),next:$('[data-next-question]')
  };

  function load(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return v&&typeof v==='object'?v:{}}catch{return {}}}
  let records=load();
  let subject=localStorage.getItem('everflow-408-wall-subject')||'ds'; if(!SUBJECTS[subject])subject='ds';
  let sideMode='point',selectedPoint='全部考点',range='all',display='matrix',selectedYear=null,selectedQuestion=null;
  let timerInterval=null,timerStartedAt=0,noteTimer=null;

  const recKey=(year,q)=>`${year}-${q}`;
  const record=(year,q)=>records[recKey(year,q)]||{};
  function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(records))}
  function patchRecord(year,q,patch){const key=recKey(year,q),next={...record(year,q),...patch,updatedAt:new Date().toISOString()};if(!next.status&&!String(next.note||'').trim())delete records[key];else records[key]=next;save()}
  const escapeHtml=v=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function setupRangeSelects(){
    const options=YEARS.map(y=>`<option value="${y}">${y}</option>`).join('');
    els.rangeFrom.innerHTML=options;els.rangeTo.innerHTML=options;els.rangeFrom.value='2009';els.rangeTo.value='2026';
  }
  function visibleYears(){
    if(range==='recent')return YEARS.filter(y=>y>=2017);
    if(range==='custom'){
      let a=Number(els.rangeFrom.value)||2009,b=Number(els.rangeTo.value)||2026;if(a>b)[a,b]=[b,a];return YEARS.filter(y=>y>=a&&y<=b);
    }
    return YEARS;
  }
  function subjectStats(years=visibleYears()){
    const qs=SUBJECTS[subject].questions;let done=0,weak=0,total=years.length*qs.length;
    years.forEach(y=>qs.forEach(q=>{const s=record(y,q).status;if(s){done++;if(s==='fuzzy'||s==='weak')weak++}}));
    return {done,weak,total,rate:total?Math.round(done/total*100):0};
  }
  function yearStats(year){
    const qs=SUBJECTS[subject].questions;let mastered=0,fuzzy=0,weak=0;qs.forEach(q=>{const s=record(year,q).status;if(s==='mastered')mastered++;else if(s==='fuzzy')fuzzy++;else if(s==='weak')weak++});const done=mastered+fuzzy+weak;return {mastered,fuzzy,weak,done,total:qs.length,rate:Math.round(done/qs.length*100)};
  }

  function renderSubjectTabs(){els.subjectTabs.forEach(btn=>btn.classList.toggle('active',btn.dataset.mainSubject===subject))}
  function renderSide(){
    els.sideModes.forEach(btn=>btn.classList.toggle('active',btn.dataset.sideMode===sideMode));
    els.sideTitle.textContent=sideMode==='point'?'考点目录':'年份目录';els.sideList.innerHTML='';
    if(sideMode==='point'){
      const group=document.createElement('div');group.className='side-group';
      const title=document.createElement('button');title.type='button';title.className='side-group-title';title.textContent=SUBJECTS[subject].name;title.addEventListener('click',()=>{selectedPoint='全部考点';renderSide();renderScope()});group.appendChild(title);
      SUBJECTS[subject].chapters.forEach((chapter,i)=>{const btn=document.createElement('button');btn.type='button';btn.className='side-item'+(selectedPoint===chapter?' active':'');btn.textContent=`${i+1}. ${chapter}`;btn.addEventListener('click',()=>{selectedPoint=chapter;renderSide();renderScope()});group.appendChild(btn)});els.sideList.appendChild(group);
    }else{
      YEARS.slice().reverse().forEach(year=>{const s=yearStats(year);const btn=document.createElement('button');btn.type='button';btn.className='side-item side-year';btn.innerHTML=`<b>${year}</b><span>${s.done}/${s.total}</span>`;btn.addEventListener('click',()=>{range='custom';els.rangeFrom.value=String(year);els.rangeTo.value=String(year);renderAll()});els.sideList.appendChild(btn)});
    }
  }
  function renderScope(){els.scope.textContent=`${SUBJECTS[subject].name} · ${selectedPoint}`}
  function renderSummary(){const s=subjectStats();els.summarySubject.textContent=SUBJECTS[subject].name;els.summaryDone.textContent=String(s.done);els.summaryWeak.textContent=String(s.weak);els.summaryRate.textContent=`${s.rate}%`}

  function renderToolbar(){
    els.rangeButtons.forEach(btn=>btn.classList.toggle('active',btn.dataset.range===range));els.customRange.hidden=range!=='custom';
    els.displayButtons.forEach(btn=>btn.classList.toggle('active',btn.dataset.display===display));els.displayPanels.forEach(panel=>panel.hidden=panel.dataset.displayPanel!==display);
  }
  function renderMatrix(){
    const qs=SUBJECTS[subject].questions,years=visibleYears();
    els.matrixHead.innerHTML=`<tr><th class="freq-head">题</th><th class="year-head">年份</th>${qs.map(q=>`<th class="q-head">${q}</th>`).join('')}</tr>`;
    els.matrixBody.innerHTML='';
    years.forEach(year=>{
      const tr=document.createElement('tr');const qCells=qs.map(q=>{const status=record(year,q).status||'unmarked';return `<td class="question-cell"><button class="matrix-q ${status}" type="button" data-year="${year}" data-q="${q}" aria-label="${year} 年第 ${q} 题，${status==='unmarked'?'未做':STATUS_LABEL[status]}">${q}</button></td>`}).join('');
      tr.innerHTML=`<td class="freq-cell"><span class="freq-badge">${qs.length}</span></td><td class="year-cell">${year}</td>${qCells}`;els.matrixBody.appendChild(tr);
    });
    els.matrixBody.querySelectorAll('.matrix-q').forEach(btn=>btn.addEventListener('click',()=>openQuestion(Number(btn.dataset.year),Number(btn.dataset.q))));
  }
  function renderList(){
    els.yearList.innerHTML='';visibleYears().forEach(year=>{const s=yearStats(year),card=document.createElement('article');card.className='year-list-card';card.innerHTML=`<div class="year-list-head"><strong>${year}</strong><span>${s.done}/${s.total} · ${s.rate}%</span></div><div class="year-list-progress"><i style="width:${s.rate}%"></i></div><div class="year-list-meta"><span>熟练 ${s.mastered}</span><span>模糊 ${s.fuzzy}</span><span>不会 ${s.weak}</span><span>未做 ${s.total-s.done}</span></div><button type="button">进入 ${year} 真题</button>`;card.querySelector('button').addEventListener('click',()=>openQuestion(year,SUBJECTS[subject].questions[0]));els.yearList.appendChild(card)});
  }
  function renderAll(){renderSubjectTabs();renderSide();renderScope();renderSummary();renderToolbar();renderMatrix();renderList()}

  function resetTimer(){clearInterval(timerInterval);timerInterval=null;timerStartedAt=0;els.timerText.textContent='计时'}
  function formatTime(ms){const sec=Math.floor(ms/1000),m=String(Math.floor(sec/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return `${m}:${s}`}
  function toggleTimer(){if(timerInterval){resetTimer();return}timerStartedAt=Date.now();els.timerText.textContent='00:00';timerInterval=setInterval(()=>{els.timerText.textContent=formatTime(Date.now()-timerStartedAt)},1000)}
  function renderModal(){
    if(selectedYear==null||selectedQuestion==null)return;const r=record(selectedYear,selectedQuestion);
    els.modalYear.textContent=String(selectedYear);els.modalQuestion.textContent=String(selectedQuestion);els.paperQuestion.textContent=String(selectedQuestion);els.modalPoint.textContent=SUBJECTS[subject].name;els.modalType.textContent=selectedQuestion<=40?'选择题':'综合应用题';
    els.modalStatuses.forEach(btn=>btn.classList.toggle('active',Boolean(btn.dataset.modalStatus)&&btn.dataset.modalStatus===r.status));els.note.value=r.note||'';els.noteState.textContent=r.updatedAt?`已保存 · ${new Date(r.updatedAt).toLocaleString('zh-CN',{hour12:false})}`:'本机自动保存';
    const qs=SUBJECTS[subject].questions,i=qs.indexOf(selectedQuestion);els.prev.disabled=i<=0;els.next.disabled=i<0||i>=qs.length-1;
  }
  function openQuestion(year,q){selectedYear=year;selectedQuestion=q;els.modal.hidden=false;document.body.style.overflow='hidden';els.analysis.hidden=true;els.noteBox.hidden=true;resetTimer();renderModal()}
  function closeQuestion(){els.modal.hidden=true;document.body.style.overflow='';resetTimer()}
  function stepQuestion(delta){const qs=SUBJECTS[subject].questions,i=qs.indexOf(selectedQuestion),next=qs[i+delta];if(next!=null){selectedQuestion=next;els.analysis.hidden=true;els.noteBox.hidden=true;resetTimer();renderModal()}}

  els.subjectTabs.forEach(btn=>btn.addEventListener('click',()=>{subject=btn.dataset.mainSubject;localStorage.setItem('everflow-408-wall-subject',subject);selectedPoint='全部考点';renderAll()}));
  els.sideModes.forEach(btn=>btn.addEventListener('click',()=>{sideMode=btn.dataset.sideMode;renderSide()}));
  els.rangeButtons.forEach(btn=>btn.addEventListener('click',()=>{range=btn.dataset.range;renderAll()}));
  els.rangeFrom.addEventListener('change',renderAll);els.rangeTo.addEventListener('change',renderAll);
  els.displayButtons.forEach(btn=>btn.addEventListener('click',()=>{display=btn.dataset.display;renderToolbar()}));
  els.modalClose.forEach(el=>el.addEventListener('click',closeQuestion));
  els.modalStatuses.forEach(btn=>btn.addEventListener('click',()=>{if(selectedYear==null)return;patchRecord(selectedYear,selectedQuestion,{status:btn.dataset.modalStatus||''});renderModal();renderSummary();renderMatrix();renderList();if(sideMode==='year')renderSide()}));
  els.note.addEventListener('input',()=>{if(selectedYear==null)return;els.noteState.textContent='正在保存…';clearTimeout(noteTimer);noteTimer=setTimeout(()=>{patchRecord(selectedYear,selectedQuestion,{note:els.note.value});els.noteState.textContent='已保存'},300)});
  els.tools.forEach(btn=>btn.addEventListener('click',()=>{const tool=btn.dataset.tool;if(tool==='analysis')els.analysis.hidden=!els.analysis.hidden;if(tool==='note'){els.noteBox.hidden=!els.noteBox.hidden;if(!els.noteBox.hidden)els.note.focus()}if(tool==='timer')toggleTimer()}));
  els.prev.addEventListener('click',()=>stepQuestion(-1));els.next.addEventListener('click',()=>stepQuestion(1));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!els.modal.hidden)closeQuestion()});
  window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){records=load();renderAll();if(!els.modal.hidden)renderModal()}});

  setupRangeSelects();renderAll();
})();