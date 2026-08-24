(()=>{
  const $=s=>document.querySelector(s);
  const pad=n=>String(Math.max(0,n)).padStart(2,'0');
  const progressKey='oxygen408-progress-v2';
  const DEFAULT_EXAM={label:'27考研初试',target:'2026-12-19T08:30:00+08:00',official:false,timezone:'Asia/Shanghai'};
  let countdownTimer=0;

  async function loadJson(path){
    const r=await fetch(`${path}${path.includes('?')?'&':'?'}v=20260825-countdown2`,{cache:'default'});
    if(!r.ok)throw new Error(path+' load failed');
    return r.json();
  }

  function renderCountdown(cfg){
    const target=new Date(cfg?.target),targetMs=target.getTime();
    if(!Number.isFinite(targetMs))throw new Error('invalid exam target');
    clearInterval(countdownTimer);
    const note=$('[data-countdown-note]');
    const timezone=cfg.timezone||'Asia/Shanghai',dateText=target.toLocaleString('zh-CN',{timeZone:timezone,year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
    if(note)note.textContent=`${cfg.official?'官方日期':'预计日期'} · ${dateText}（北京时间）${cfg.official?'':' · 等待教育部公告'}`;
    const tick=()=>{
      const rawDiff=targetMs-Date.now(),diff=Math.max(0,rawDiff);
      const total=Math.floor(diff/1000);
      const d=Math.floor(total/86400),h=Math.floor((total%86400)/3600),m=Math.floor((total%3600)/60),s=total%60;
      const vals={days:d,hours:h,minutes:m,seconds:s};
      Object.entries(vals).forEach(([k,v])=>{const el=$(`[data-countdown-${k}]`);if(el)el.textContent=k==='days'?String(v):pad(v)});
      const label=$('[data-countdown-label]');if(label)label.textContent=rawDiff>0?'距离 '+(cfg.label||DEFAULT_EXAM.label):rawDiff>-48*60*60*1000?'初试进行中':'本次初试已结束';
    };
    tick();countdownTimer=setInterval(tick,1000);
  }

  function readProgress(){try{return JSON.parse(localStorage.getItem(progressKey)||'{}')||{}}catch{return{}}}
  function courseItems(data){
    if(Array.isArray(data?.course?.items))return data.course.items;
    return Object.values(data?.subjects||{}).flatMap(subject=>subject?.items||[]);
  }

  function renderCourse(data){
    const progress=readProgress(),items=courseItems(data),done=items.filter(item=>progress[item.id]?.done).length,total=items.length,pct=total?Math.round(done/total*100):0;
    const num=$('[data-course-number]'),meta=$('[data-course-meta]'),bar=$('[data-course-progress]'),title=$('[data-course-title]'),latest=$('[data-course-latest]'),link=$('[data-course-link]');
    if(num)num.textContent=`${done}/${total}`;
    if(meta)meta.textContent=total?`${pct}% · ${total} 课时`:'暂无课程';
    if(bar)bar.style.width=pct+'%';
    if(title)title.textContent=data?.course?.label||data?.source?.collection||'408课程';
    const newest=items.at(-1);
    if(latest)latest.textContent=newest?`最新：${newest.title}`:'等待合集更新';
    if(link){link.href=data?.source?.url||newest?.url||'study/courses/';link.hidden=!(data?.source?.url||newest?.url)}
    const all=$('[data-overall-study]');if(all)all.textContent=total?`${done}/${total} 课时 · ${pct}%`:'暂无课程数据';
  }

  renderCountdown(DEFAULT_EXAM);
  loadJson('data/exam.json').then(renderCountdown).catch(error=>console.warn('exam date refresh failed; using bundled fallback',error));
  loadJson('data/oxygen.json').then(renderCourse).catch(console.error);
})();
