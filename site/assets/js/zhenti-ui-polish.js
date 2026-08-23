(()=>{
  if(document.body?.dataset?.view!=='zhenti')return;
  const WALL_KEY='everflow-408-zhenti-wall-v1';
  const GROUPS={ds:{label:'数据结构',short:'DS',qs:[1,2,3,4,5,6,7,8,9,10,41,42]},co:{label:'计算机组成原理',short:'CO',qs:[11,12,13,14,15,16,17,18,19,20,21,22,43,44]},os:{label:'操作系统',short:'OS',qs:[23,24,25,26,27,28,29,30,31,32,45,46]},cn:{label:'计算机网络',short:'CN',qs:[33,34,35,36,37,38,39,40,47]}};
  const allQs=Array.from({length:47},(_,i)=>i+1);
  const wholeHome=document.querySelector('[data-full-paper-home]');
  const wholeGrid=document.querySelector('[data-whole-year-grid]');
  const toolbar=wholeHome?.querySelector('.whole-toolbar');
  if(!wholeHome||!wholeGrid||!toolbar)return;

  const read=()=>{try{const v=JSON.parse(localStorage.getItem(WALL_KEY)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
  const rec=(records,year,q)=>records[`${year}-${q}`]||{};
  const done=r=>Boolean((r.answer&&typeof r.correct==='boolean')||r.reviewed||r.status);
  const qSubject=q=>{for(const [k,v] of Object.entries(GROUPS))if(v.qs.includes(q))return k;return'cn'};
  const statFor=(records,year,qs)=>{let n=0,correct=0,wrong=0,fav=0,weak=0;qs.forEach(q=>{const r=rec(records,year,q);if(done(r))n++;if(r.correct===true)correct++;if(r.correct===false)wrong++;if(r.favorite)fav++;if(r.status==='weak'||r.status==='fuzzy')weak++});return{done:n,total:qs.length,correct,wrong,fav,weak,rate:Math.round(n/qs.length*100)}};

  const overview=document.createElement('section');
  overview.className='zhenti-overview';overview.dataset.zhentiOverview='';toolbar.after(overview);

  function yearsPresent(records){const years=new Set();Object.keys(records).forEach(id=>{const m=id.match(/^(\d{4})-/);if(m)years.add(Number(m[1]))});return years}
  function renderOverview(){
    const records=read(),years=Array.from({length:18},(_,i)=>2009+i),yearSet=yearsPresent(records);
    let totalDone=0,totalCorrect=0,totalWrong=0,totalFav=0,totalWeak=0;
    years.forEach(y=>{const s=statFor(records,y,allQs);totalDone+=s.done;totalCorrect+=s.correct;totalWrong+=s.wrong;totalFav+=s.fav;totalWeak+=s.weak});
    const answered=totalCorrect+totalWrong,errorRate=answered?Math.round(totalWrong/answered*100):0;
    const subjectHtml=Object.values(GROUPS).map(g=>{let d=0,t=years.length*g.qs.length;years.forEach(y=>d+=statFor(records,y,g.qs).done);const rate=Math.round(d/t*100);return `<article class="zt-subject-card"><header><strong>${g.short} ${g.label}</strong><b>${rate}%</b></header><small>${d}/${t} 题已完成</small><div class="zt-subject-progress"><i style="width:${rate}%"></i></div></article>`}).join('');
    overview.innerHTML=`<section class="zt-overview-main"><div class="zt-overview-title"><div><h2>408 真题大观</h2><span>2009—2026 · 四科进度一眼看清</span></div><span>${yearSet.size} 个年份已有学习记录</span></div><div class="zt-overview-subjects">${subjectHtml}</div></section><aside class="zt-overview-side"><div class="zt-metric"><strong>${totalDone}</strong><span>累计完成题</span></div><div class="zt-metric good"><strong>${totalCorrect}</strong><span>累计答对</span></div><div class="zt-metric danger"><strong>${errorRate}%</strong><span>累计错误率</span></div><div class="zt-metric"><strong>${totalFav}</strong><span>收藏题目</span></div></aside>`;
  }

  function decorateCard(card){
    if(card.dataset.uiPolished==='1')return;
    const year=Number(card.querySelector('.whole-year-head strong')?.textContent||0);if(!year)return;
    card.dataset.uiPolished='1';
    const records=read(),all=statFor(records,year,allQs),rows=Object.values(GROUPS).map(g=>{const s=statFor(records,year,g.qs);return `<div class="whole-subject-row"><strong>${g.short}</strong><span><i style="width:${s.rate}%"></i></span><em>${s.done}/${s.total}</em></div>`}).join('');
    const insight=document.createElement('div');insight.className='whole-year-insight';insight.innerHTML=`<div class="whole-year-ring" style="--p:${all.rate}"><b>${all.rate}%</b></div><div class="whole-subject-mini">${rows}</div>`;
    const grid=card.querySelector('.whole-mini-grid');if(grid){
      const label=document.createElement('div');label.className='whole-grid-label';label.innerHTML=`<strong>47 题状态图谱</strong><span>答错 ${all.wrong} · 薄弱 ${all.weak} · 收藏 ${all.fav}</span>`;
      grid.before(insight,label);grid.classList.add('is-enhanced');
      [...grid.children].forEach((node,i)=>{const q=i+1;node.dataset.q=String(q);node.dataset.subject=qSubject(q);node.title=`${year} 年第 ${q} 题`});
    }else card.appendChild(insight);
  }
  function decorateAll(){[...wholeGrid.querySelectorAll('.whole-year-card')].forEach(decorateCard);renderOverview()}

  const observer=new MutationObserver(mutations=>{if(mutations.some(m=>m.addedNodes.length))requestAnimationFrame(decorateAll)});
  observer.observe(wholeGrid,{childList:true});
  window.addEventListener('storage',e=>{if(e.key===WALL_KEY){[...wholeGrid.querySelectorAll('.whole-year-card')].forEach(c=>delete c.dataset.uiPolished);decorateAll()}});
  document.addEventListener('click',e=>{if(e.target.closest('[data-answer-submit],[data-modal-status],[data-paper-status],[data-answer-favorite],.favorite-remove'))setTimeout(()=>{[...wholeGrid.querySelectorAll('.whole-year-card')].forEach(c=>delete c.dataset.uiPolished);decorateAll()},60)});
  decorateAll();
})();
