(()=>{
  const $=s=>document.querySelector(s);
  const pad=n=>String(Math.max(0,n)).padStart(2,'0');
  const progressKey='oxygen408-progress-v2';

  async function loadJson(path){
    const r=await fetch(path,{cache:'no-store'});
    if(!r.ok)throw new Error(path+' load failed');
    return r.json();
  }

  function renderCountdown(cfg){
    const note=$('[data-countdown-note]');
    if(note)note.textContent=(cfg.official?'官方日期 · ':'暂定日期 · ')+new Date(cfg.target).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
    const tick=()=>{
      const diff=Math.max(0,new Date(cfg.target).getTime()-Date.now());
      const total=Math.floor(diff/1000);
      const d=Math.floor(total/86400),h=Math.floor((total%86400)/3600),m=Math.floor((total%3600)/60),s=total%60;
      const vals={days:d,hours:h,minutes:m,seconds:s};
      Object.entries(vals).forEach(([k,v])=>{const el=$(`[data-countdown-${k}]`);if(el)el.textContent=k==='days'?String(v):pad(v)});
      const label=$('[data-countdown-label]');if(label)label.textContent=diff>0?'距离 '+cfg.label:'今天上考场';
    };
    tick();setInterval(tick,1000);
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

  loadJson('data/exam.json').then(renderCountdown).catch(console.error);
  loadJson('data/oxygen.json').then(renderCourse).catch(console.error);
})();
