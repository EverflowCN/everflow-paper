(()=>{
  if(document.body?.dataset?.view!=='zhenti')return;

  const VERSION='20260824-score1';
  const WALL_KEY='everflow-408-zhenti-wall-v1';
  const SRS_KEY='everflow-408-srs-v1';
  const ERROR_KEY='everflow-408-srs-error-v1';
  const SRS_BASELINE_KEY='everflow-408-srs-reset-baseline-v1';
  const RESET_KEY='everflow-408-zhenti-reset-at-v1';
  const GRAPH_CURRENT_KEY='everflow-408-graph-current-v2';
  const YEARS=Array.from({length:18},(_,i)=>2009+i);
  const ALL_Q=Array.from({length:47},(_,i)=>i+1);
  const BIG_Q=[41,42,43,44,45,46,47];
  const GROUPS={
    ds:{label:'数据结构',short:'DS',qs:[1,2,3,4,5,6,7,8,9,10,41,42]},
    co:{label:'计算机组成原理',short:'CO',qs:[11,12,13,14,15,16,17,18,19,20,21,22,43,44]},
    os:{label:'操作系统',short:'OS',qs:[23,24,25,26,27,28,29,30,31,32,45,46]},
    cn:{label:'计算机网络',short:'CN',qs:[33,34,35,36,37,38,39,40,47]}
  };

  const ICON={
    score:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
    reset:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    close:'<path d="M18 6 6 18M6 6l12 12"/>',
    save:'<path d="M5 4h12l2 2v14H5Z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
    bookmark:'<path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4Z"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z"/>',
    keyboard:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h.01M11 9h.01M15 9h.01M18 9h.01M7 13h.01M11 13h.01M15 13h.01M8 16h8"/>'
  };
  const svg=name=>`<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]||''}</svg>`;
  const ensureCss=href=>{if(document.querySelector(`link[href^="${href.split('?')[0]}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link)};
  ensureCss(`/assets/css/zhenti-status.css?v=${VERSION}`);
  ensureCss(`/assets/css/zhenti-ui-polish.css?v=${VERSION}`);

  const wholeHome=document.querySelector('[data-full-paper-home]');
  const wholeGrid=document.querySelector('[data-whole-year-grid]');
  const wholeToolbar=wholeHome?.querySelector('.whole-toolbar');
  const wallToolbar=document.querySelector('.wall-toolbar');
  if(!wholeHome||!wholeGrid||!wholeToolbar)return;

  const readJSON=(key,fallback={})=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?v:fallback}catch{return fallback}};
  const writeJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
  const read=()=>readJSON(WALL_KEY,{});
  const rec=(records,year,q)=>records[`${year}-${q}`]||{};
  const done=r=>Boolean((r.answer&&typeof r.correct==='boolean')||r.reviewed||r.status||Number.isFinite(Number(r.selfScore)));
  const qSubject=q=>Object.entries(GROUPS).find(([,g])=>g.qs.includes(q))?.[0]||'cn';
  const meaningful=r=>Boolean(r.status||r.note||r.answer||r.draftAnswer||r.reviewed||r.favorite||r.attempts||r.correctCount||r.timeSpent||Number.isFinite(Number(r.selfScore)));

  function statFor(records,year,qs){
    let n=0,correct=0,wrong=0,fav=0,weak=0;
    qs.forEach(q=>{const r=rec(records,year,q);if(done(r))n++;if(r.correct===true)correct++;if(r.correct===false)wrong++;if(r.favorite)fav++;if(r.status==='weak'||r.status==='fuzzy')weak++});
    return{done:n,total:qs.length,correct,wrong,fav,weak,rate:qs.length?Math.round(n/qs.length*100):0};
  }

  function scoreFor(records,year){
    let objective=0,objectiveGraded=0,subjective=0,subjectiveGraded=0;
    for(let q=1;q<=40;q++){
      const r=rec(records,year,q);
      if(typeof r.correct==='boolean'){objectiveGraded++;if(r.correct)objective+=2}
    }
    BIG_Q.forEach(q=>{
      const raw=rec(records,year,q).selfScore;
      if(raw===undefined||raw===null||raw==='')return;
      const n=Number(raw);if(!Number.isFinite(n))return;
      subjectiveGraded++;subjective+=Math.max(0,Math.min(10,n));
    });
    const total=Math.round((objective+subjective)*10)/10;
    return{objective,objectiveGraded,subjective:Math.round(subjective*10)/10,subjectiveGraded,total,graded:objectiveGraded+subjectiveGraded,final:objectiveGraded===40&&subjectiveGraded===7};
  }

  function patchSelfScore(records,year,q,value){
    const key=`${year}-${q}`,next={...(records[key]||{})};
    if(value==='')delete next.selfScore;
    else{next.selfScore=Math.max(0,Math.min(10,Number(value)));next.reviewed=true}
    next.updatedAt=new Date().toISOString();
    if(meaningful(next))records[key]=next;else delete records[key];
  }

  const overview=document.createElement('section');
  overview.className='zhenti-overview';overview.dataset.zhentiOverview='';wholeToolbar.after(overview);

  function yearsPresent(records){const years=new Set();Object.keys(records).forEach(id=>{const m=id.match(/^(\d{4})-/);if(m)years.add(Number(m[1]))});return years}
  function renderOverview(){
    const records=read(),yearSet=yearsPresent(records);let totalDone=0,totalCorrect=0,totalWrong=0,totalFav=0;
    YEARS.forEach(y=>{const s=statFor(records,y,ALL_Q);totalDone+=s.done;totalCorrect+=s.correct;totalWrong+=s.wrong;totalFav+=s.fav});
    const answered=totalCorrect+totalWrong,errorRate=answered?Math.round(totalWrong/answered*100):0;
    const subjectHtml=Object.entries(GROUPS).map(([key,g])=>{let d=0,t=YEARS.length*g.qs.length;YEARS.forEach(y=>d+=statFor(records,y,g.qs).done);const rate=Math.round(d/t*100);return `<article class="zt-subject-card" data-subject="${key}"><header><strong>${g.short} ${g.label}</strong><b>${rate}%</b></header><small>${d}/${t} 题已完成</small><div class="zt-subject-progress"><i style="width:${rate}%"></i></div></article>`}).join('');
    overview.innerHTML=`<section class="zt-overview-main"><div class="zt-overview-title"><div><h2>408 真题大观</h2><span>2009—2026 · 四科进度</span></div><span>${yearSet.size} 个年份已有学习记录</span></div><div class="zt-overview-subjects">${subjectHtml}</div></section><aside class="zt-overview-side"><div class="zt-metric"><strong>${totalDone}</strong><span>累计完成题</span></div><div class="zt-metric good"><strong>${totalCorrect}</strong><span>累计答对</span></div><div class="zt-metric danger"><strong>${errorRate}%</strong><span>累计错误率</span></div><div class="zt-metric"><strong>${totalFav}</strong><span>收藏题目</span></div></aside>`;
  }

  function scoreLine(records,year){
    const s=scoreFor(records,year),label=s.final?'最终得分':'当前得分';
    return `<div class="zt-year-score"><span><small>${label}</small><strong>${s.total}<em>/150</em></strong><b>${s.graded}/47 已评分</b></span><button class="zt-icon-action" type="button" data-zt-score-year="${year}" aria-label="查看 ${year} 年得分">${svg('score')}</button></div>`;
  }

  function decorateCard(card){
    const year=Number(card.querySelector('.whole-year-head strong')?.textContent||0);if(!year)return;
    card.querySelectorAll('.whole-year-insight,.whole-grid-label,.zt-year-score').forEach(el=>el.remove());
    const records=read(),all=statFor(records,year,ALL_Q);
    const rows=Object.entries(GROUPS).map(([key,g])=>{const s=statFor(records,year,g.qs);return `<div class="whole-subject-row" data-subject="${key}"><strong>${g.short}</strong><span><i style="width:${s.rate}%"></i></span><em>${s.done}/${s.total}</em></div>`}).join('');
    const insight=document.createElement('div');insight.className='whole-year-insight';insight.innerHTML=`<div class="whole-year-ring" style="--p:${all.rate}"><b>${all.rate}%</b></div><div class="whole-subject-mini">${rows}</div>`;
    const grid=card.querySelector('.whole-mini-grid');
    if(grid){
      const label=document.createElement('div');label.className='whole-grid-label';label.innerHTML=`<strong>47 题状态图谱</strong><span>答错 ${all.wrong} · 薄弱 ${all.weak} · 收藏 ${all.fav}</span>`;
      grid.before(insight);
      insight.insertAdjacentHTML('afterend',scoreLine(records,year));
      grid.before(label);grid.classList.add('is-enhanced');
      [...grid.children].forEach((node,i)=>{const q=i+1;node.dataset.q=String(q);node.dataset.subject=qSubject(q);node.title=`${year} 年第 ${q} 题`});
    }else{card.appendChild(insight);insight.insertAdjacentHTML('afterend',scoreLine(records,year))}
    card.dataset.uiPolished='1';
  }

  function decorateAll(){[...wholeGrid.querySelectorAll('.whole-year-card')].forEach(decorateCard);renderOverview()}
  function refreshCards(){[...wholeGrid.querySelectorAll('.whole-year-card')].forEach(c=>delete c.dataset.uiPolished);decorateAll()}

  const scoreOverlay=document.createElement('div');
  scoreOverlay.className='zt-dialog-overlay';scoreOverlay.hidden=true;scoreOverlay.dataset.ztScoreOverlay='';
  scoreOverlay.innerHTML=`<div class="zt-dialog-backdrop" data-zt-score-close></div><section class="zt-dialog zt-score-dialog" role="dialog" aria-modal="true" aria-label="年度评分"><header class="zt-dialog-head"><div class="zt-dialog-heading">${svg('score')}<div><strong>年度评分</strong><span>选择题自动计分，大题按 0—10 分自评</span></div></div><button class="zt-icon-action" type="button" data-zt-score-close aria-label="关闭">${svg('close')}</button></header><div class="zt-score-controls"><label>年份<select data-zt-score-year>${YEARS.slice().reverse().map(y=>`<option value="${y}">${y}</option>`).join('')}</select></label><div class="zt-score-total"><span data-zt-score-label>当前得分</span><strong><b data-zt-score-total>0</b><em>/150</em></strong><small data-zt-score-progress>0/47 已评分</small></div></div><div class="zt-score-breakdown"><div><span>选择题</span><strong><b data-zt-score-objective>0</b>/80</strong><small data-zt-score-objective-count>0/40 已作答</small></div><div><span>综合题</span><strong><b data-zt-score-subjective>0</b>/70</strong><small data-zt-score-subjective-count>0/7 已评分</small></div></div><div class="zt-big-score-list" data-zt-big-score-list></div><footer class="zt-dialog-actions"><button class="zt-secondary-action" type="button" data-zt-clear-big>${svg('trash')}<span>清除本年大题评分</span></button><button class="zt-primary-action" type="button" data-zt-score-save>${svg('save')}<span>保存评分</span></button></footer></section>`;
  document.body.appendChild(scoreOverlay);

  const scoreYear=scoreOverlay.querySelector('[data-zt-score-year]');
  const bigList=scoreOverlay.querySelector('[data-zt-big-score-list]');
  let scoreDraftYear=2026;
  function renderScoreDialog(year=scoreDraftYear){
    scoreDraftYear=Number(year)||2026;scoreYear.value=String(scoreDraftYear);
    const records=read(),s=scoreFor(records,scoreDraftYear);
    scoreOverlay.querySelector('[data-zt-score-label]').textContent=s.final?'最终得分':'当前得分';
    scoreOverlay.querySelector('[data-zt-score-total]').textContent=String(s.total);
    scoreOverlay.querySelector('[data-zt-score-progress]').textContent=`${s.graded}/47 已评分`;
    scoreOverlay.querySelector('[data-zt-score-objective]').textContent=String(s.objective);
    scoreOverlay.querySelector('[data-zt-score-objective-count]').textContent=`${s.objectiveGraded}/40 已作答`;
    scoreOverlay.querySelector('[data-zt-score-subjective]').textContent=String(s.subjective);
    scoreOverlay.querySelector('[data-zt-score-subjective-count]').textContent=`${s.subjectiveGraded}/7 已评分`;
    bigList.innerHTML=BIG_Q.map(q=>{const r=rec(records,scoreDraftYear,q),subject=GROUPS[qSubject(q)],value=r.selfScore===undefined?'':r.selfScore;return `<label class="zt-big-score-row"><span><b>第 ${q} 题</b><small>${subject.short} · ${subject.label}</small></span><input type="number" min="0" max="10" step="0.5" inputmode="decimal" value="${value}" data-zt-big-score="${q}" aria-label="第 ${q} 题得分"><em>/10</em></label>`}).join('');
  }
  function openScore(year=2026){renderScoreDialog(year);scoreOverlay.hidden=false;document.body.classList.add('zt-dialog-open')}
  function closeScore(){scoreOverlay.hidden=true;document.body.classList.remove('zt-dialog-open')}
  function saveScores(){
    const records=read(),year=Number(scoreYear.value);
    bigList.querySelectorAll('[data-zt-big-score]').forEach(input=>{const raw=input.value.trim();patchSelfScore(records,year,Number.isFinite(Number(raw))&&raw!==''?Number(raw):'')});
    writeJSON(WALL_KEY,records);document.dispatchEvent(new CustomEvent('everflow:zhenti-records-change',{detail:{source:'score',year}}));refreshCards();renderScoreDialog(year);window.EveraUI?.toast?.(`${year} 年评分已保存。`,{type:'success',title:'年度评分'});
  }
  function clearBigScores(){
    const records=read(),year=Number(scoreYear.value);BIG_Q.forEach(q=>patchSelfScore(records,year,q,''));writeJSON(WALL_KEY,records);refreshCards();renderScoreDialog(year);window.EveraUI?.toast?.(`${year} 年大题自评分已清除。`,{type:'success',title:'已清除'});
  }

  const resetOverlay=document.createElement('div');
  resetOverlay.className='zt-dialog-overlay';resetOverlay.hidden=true;resetOverlay.dataset.ztResetOverlay='';
  resetOverlay.innerHTML=`<div class="zt-dialog-backdrop" data-zt-reset-close></div><section class="zt-dialog zt-reset-dialog" role="dialog" aria-modal="true" aria-label="重置所有真题"><header class="zt-dialog-head"><div class="zt-dialog-heading danger">${svg('reset')}<div><strong>重置所有真题记录</strong><span>只清学习记录，不删除题库与账号</span></div></div><button class="zt-icon-action" type="button" data-zt-reset-close aria-label="关闭">${svg('close')}</button></header><div class="zt-reset-content"><p>将清空 2009—2026 全部真题的作答、熟练度、笔记、收藏、大题自评分，以及速刷卡片的 SRS 与错误统计。登录状态、题库文件和页面设置不会删除。</p><div class="zt-reset-list"><span>846 道真题学习记录</span><span>18 年整套试卷评分</span><span>SRS 记忆曲线与错误统计</span></div></div><footer class="zt-dialog-actions"><button class="zt-secondary-action" type="button" data-zt-reset-close><span>取消</span></button><button class="zt-danger-action" type="button" data-zt-reset-confirm>${svg('trash')}<span>确认全部重置</span></button></footer></section>`;
  document.body.appendChild(resetOverlay);
  function openReset(){resetOverlay.hidden=false;document.body.classList.add('zt-dialog-open')}
  function closeReset(){resetOverlay.hidden=true;document.body.classList.remove('zt-dialog-open')}
  function resetAll(){
    const at=new Date().toISOString();
    try{
      localStorage.setItem(RESET_KEY,at);
      localStorage.setItem(WALL_KEY,'{}');
      localStorage.setItem(SRS_KEY,JSON.stringify({version:1,settings:{dailyNew:20,targetRetention:.9},cards:{},daily:{}}));
      localStorage.setItem(ERROR_KEY,JSON.stringify({version:1,cards:{},daily:{}}));
      localStorage.removeItem(SRS_BASELINE_KEY);
      localStorage.removeItem(GRAPH_CURRENT_KEY);
    }catch{}
    sessionStorage.setItem('everflow-408-reset-toast','全部真题学习记录已重置。');
    document.dispatchEvent(new CustomEvent('everflow:zhenti-reset-all',{detail:{at}}));
    setTimeout(()=>location.reload(),180);
  }

  function toolButton(kind,label,attr){const btn=document.createElement('button');btn.type='button';btn.className=`zt-toolbar-button ${kind==='reset'?'danger':''}`;btn.setAttribute(attr,'');btn.innerHTML=`${svg(kind)}<span>${label}</span>`;return btn}
  const wholeActions=document.createElement('div');wholeActions.className='zt-toolbar-actions';wholeActions.append(toolButton('score','年度评分','data-zt-score-open'),toolButton('reset','重置全部','data-zt-reset-open'));wholeToolbar.appendChild(wholeActions);
  if(wallToolbar&&!wallToolbar.querySelector('[data-zt-reset-open]')){const btn=toolButton('reset','重置全部','data-zt-reset-open');btn.classList.add('zt-wall-reset');wallToolbar.appendChild(btn)}

  function iconizeQuestionControls(root=document){
    root.querySelectorAll?.('[data-answer-favorite]').forEach(btn=>{const active=btn.classList.contains('active');btn.classList.add('ui-iconized');btn.innerHTML=`${svg('bookmark')}<span>${active?'已收藏':'收藏'}</span>`});
    root.querySelectorAll?.('[data-answer-submit]').forEach(btn=>{const text=btn.textContent||'';const next=/下一题/.test(text);const label=next?'下一题':/参考答案/.test(text)?text.replace(/\s*[→›]+\s*/g,'').trim():'提交答案';btn.classList.add('ui-iconized');btn.innerHTML=`${svg(next?'arrow':'check')}<span>${label}</span>${next?'': '<kbd>Enter</kbd>'}`});
    root.querySelectorAll?.('[data-answer-reveal]').forEach(btn=>{const label=(btn.textContent||'查看解析').replace(/\s*R\s*$/,'').trim();btn.classList.add('ui-iconized');btn.innerHTML=`${svg('book')}<span>${label}</span><kbd>R</kbd>`});
  }
  function iconizeLegacyChrome(root=document){
    root.querySelectorAll?.('.shortcut-fab').forEach(btn=>{btn.classList.add('ui-iconized');btn.innerHTML=`${svg('keyboard')}<span>快捷键</span><kbd>?</kbd>`});
    root.querySelectorAll?.('.shortcut-help button[data-shortcut-close],.srs-reset-close').forEach(btn=>{btn.classList.add('ui-icon-only');btn.innerHTML=svg('close')});
    root.querySelectorAll?.('.srs-reset-btn').forEach(btn=>{btn.classList.add('ui-iconized');btn.innerHTML=`${svg('reset')}<span>重置</span>`});
  }

  const gridObserver=new MutationObserver(mutations=>{if(mutations.some(m=>m.addedNodes.length))requestAnimationFrame(decorateAll)});gridObserver.observe(wholeGrid,{childList:true});
  [document.querySelector('[data-question-content]'),document.querySelector('.paper-question-content')].filter(Boolean).forEach(root=>{new MutationObserver(()=>iconizeQuestionControls(root)).observe(root,{childList:true,subtree:false});iconizeQuestionControls(root)});
  new MutationObserver(mutations=>{if(mutations.some(m=>m.addedNodes.length))iconizeLegacyChrome(document)}).observe(document.body,{childList:true,subtree:false});

  wholeGrid.addEventListener('click',e=>{const btn=e.target.closest('[data-zt-score-year]');if(btn){e.preventDefault();e.stopPropagation();openScore(Number(btn.dataset.ztScoreYear))}});
  document.addEventListener('click',e=>{if(e.target.closest('[data-zt-score-open]'))openScore(Number(scoreYear?.value)||2026);if(e.target.closest('[data-zt-reset-open]'))openReset()});
  scoreOverlay.querySelectorAll('[data-zt-score-close]').forEach(el=>el.addEventListener('click',closeScore));
  scoreYear.addEventListener('change',()=>renderScoreDialog(Number(scoreYear.value)));
  scoreOverlay.querySelector('[data-zt-score-save]').addEventListener('click',saveScores);
  scoreOverlay.querySelector('[data-zt-clear-big]').addEventListener('click',clearBigScores);
  resetOverlay.querySelectorAll('[data-zt-reset-close]').forEach(el=>el.addEventListener('click',closeReset));
  resetOverlay.querySelector('[data-zt-reset-confirm]').addEventListener('click',resetAll);
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!scoreOverlay.hidden){closeScore();e.preventDefault()}else if(!resetOverlay.hidden){closeReset();e.preventDefault()}},true);

  window.addEventListener('storage',e=>{if(e.key===WALL_KEY)refreshCards()});
  document.addEventListener('everflow:zhenti-records-change',refreshCards);
  document.addEventListener('click',e=>{if(e.target.closest('[data-answer-submit],[data-modal-status],[data-paper-status],[data-answer-favorite],.favorite-remove'))setTimeout(refreshCards,60)});

  const resetMessage=sessionStorage.getItem('everflow-408-reset-toast');if(resetMessage){sessionStorage.removeItem('everflow-408-reset-toast');setTimeout(()=>window.EveraUI?.toast?.(resetMessage,{type:'success',title:'重置完成',duration:3800}),350)}
  decorateAll();iconizeQuestionControls(document);iconizeLegacyChrome(document);
})();
