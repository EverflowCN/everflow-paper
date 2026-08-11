(()=>{
  const $=s=>document.querySelector(s);
  const fmtDuration=sec=>{const m=Math.round(Math.max(0,sec)/60);return m>=60?`${Math.floor(m/60)}h ${m%60}m`:`${m}m`};
  const labels={ds:'数据结构',co:'组成原理',os:'操作系统',cn:'计算机网络',general:'其他'};
  const colors={ds:'var(--red)',co:'var(--orange)',os:'var(--purple)',cn:'var(--cyan)',general:'var(--muted)'};

  function level(sec){const m=sec/60;if(m<=0)return 0;if(m<=120)return 1;if(m<=300)return 2;if(m<=480)return 3;return 4}

  function renderHeatmap(summary){
    const el=$('[data-heatmap]');if(!el)return;
    const today=new Date();today.setHours(0,0,0,0);
    const end=new Date(today);end.setDate(end.getDate()+(6-end.getDay()));
    const start=new Date(end);start.setDate(start.getDate()-52*7-6);
    const cells=[];
    for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
      const key=EveraStore.dayKey(d),sec=summary.daily[key]||0,lv=level(sec);
      const outside=d>today;
      cells.push(`<span class="heatmap-cell ${outside?'':`lv${lv}`}" title="${key} · ${outside?'未来':fmtDuration(sec)}" aria-label="${key} ${outside?'未来':fmtDuration(sec)}"></span>`);
    }
    el.innerHTML=cells.join('');
  }

  function renderDonut(summary){
    const subjects=['ds','co','os','cn','general'];
    const total=subjects.reduce((a,k)=>a+(summary.subjects[k]||0),0);
    const donut=$('[data-donut]');
    const legend=$('[data-donut-legend]');
    if(!donut||!legend)return;
    let acc=0;const parts=[];
    subjects.forEach(k=>{
      const v=summary.subjects[k]||0;
      if(!v)return;
      const from=acc/Math.max(1,total)*100;acc+=v;const to=acc/Math.max(1,total)*100;
      parts.push(`${colors[k]} ${from}% ${to}%`);
    });
    donut.style.background=parts.length?`conic-gradient(${parts.join(',')})`:'var(--soft)';
    $('[data-donut-total]').textContent=fmtDuration(total);
    legend.innerHTML=subjects.filter(k=>(summary.subjects[k]||0)>0).map(k=>{
      const v=summary.subjects[k]||0,p=total?Math.round(v/total*100):0;
      return `<div class="legend-row" style="--legend:${colors[k]}"><span>${labels[k]}</span><strong>${fmtDuration(v)} · ${p}%</strong></div>`;
    }).join('')||'<div class="muted">开始记录专注后，这里会显示四科时间占比。</div>';
  }

  function renderDurationDonut(summary){
    const donut=$('[data-duration-donut]'),legend=$('[data-duration-legend]');
    if(!donut||!legend)return;
    const buckets=[
      {label:'≤ 25 分钟',color:'var(--red)',count:0},
      {label:'26–50 分钟',color:'var(--orange)',count:0},
      {label:'51–90 分钟',color:'var(--purple)',count:0},
      {label:'> 90 分钟',color:'var(--cyan)',count:0}
    ];
    summary.focus.forEach(s=>{
      const m=(Number(s.durationSeconds)||0)/60;
      if(m<=25)buckets[0].count++;
      else if(m<=50)buckets[1].count++;
      else if(m<=90)buckets[2].count++;
      else buckets[3].count++;
    });
    const total=buckets.reduce((a,b)=>a+b.count,0);
    let acc=0;const parts=[];
    buckets.forEach(b=>{
      if(!b.count)return;
      const from=acc/Math.max(1,total)*100;acc+=b.count;const to=acc/Math.max(1,total)*100;
      parts.push(`${b.color} ${from}% ${to}%`);
    });
    donut.style.background=parts.length?`conic-gradient(${parts.join(',')})`:'var(--soft)';
    $('[data-duration-total]').textContent=String(total);
    legend.innerHTML=buckets.filter(b=>b.count>0).map(b=>{
      const p=total?Math.round(b.count/total*100):0;
      return `<div class="legend-row" style="--legend:${b.color}"><span>${b.label}</span><strong>${b.count} 次 · ${p}%</strong></div>`;
    }).join('')||'<div class="muted">还没有专注记录。</div>';
  }

  function renderTrend(summary){
    const el=$('[data-trend]');if(!el)return;
    const days=[];let max=0;
    for(let i=13;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const k=EveraStore.dayKey(d),sec=summary.daily[k]||0;max=Math.max(max,sec);days.push({d,k,sec})}
    el.innerHTML=days.map(x=>{
      const h=max?Math.max(3,x.sec/max*150):3;
      return `<div class="trend-bar" title="${x.k} · ${fmtDuration(x.sec)}"><i style="--h:${h}px"></i><span>${x.d.getDate()}</span></div>`;
    }).join('');
  }

  function renderMetrics(s){
    const avg=s.focus.length?s.totalSeconds/s.focus.length:0;
    const map={
      '[data-stat-today]':fmtDuration(s.todaySeconds),
      '[data-stat-week]':fmtDuration(s.weekSeconds),
      '[data-stat-streak]':`${s.streak} 天`,
      '[data-stat-longest]':fmtDuration(s.longestSeconds),
      '[data-stat-total]':fmtDuration(s.totalSeconds),
      '[data-stat-sessions]':String(s.focus.length),
      '[data-stat-average]':fmtDuration(avg),
      '[data-stat-courses]':String(s.completedCourses)
    };
    Object.entries(map).forEach(([sel,val])=>{const el=$(sel);if(el)el.textContent=val});
  }

  async function render(){
    await EveraStore.init();
    const s=await EveraStore.getSummary();
    renderMetrics(s);renderHeatmap(s);renderDonut(s);renderDurationDonut(s);renderTrend(s);
    const updated=$('[data-stats-updated]');if(updated)updated.textContent='本地统计 · '+new Date().toLocaleString('zh-CN',{hour12:false});
  }

  document.addEventListener('everflow:study-change',()=>render().catch(console.error));
  render().catch(console.error);
})();
