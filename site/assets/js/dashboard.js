(()=>{
  const $=s=>document.querySelector(s);
  const pad=n=>String(Math.max(0,n)).padStart(2,'0');
  const progressKey='oxygen408-progress-v2';

  async function loadJson(path){
    const r=await fetch(path);
    if(!r.ok) throw new Error(path+' load failed');
    return r.json();
  }

  function renderCountdown(cfg){
    const note=$('[data-countdown-note]');
    if(note) note.textContent=(cfg.official?'官方日期 · ':'暂定日期 · ')+new Date(cfg.target).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
    const tick=()=>{
      const diff=Math.max(0,new Date(cfg.target).getTime()-Date.now());
      const total=Math.floor(diff/1000);
      const d=Math.floor(total/86400);
      const h=Math.floor((total%86400)/3600);
      const m=Math.floor((total%3600)/60);
      const s=total%60;
      const vals={days:d,hours:h,minutes:m,seconds:s};
      Object.entries(vals).forEach(([k,v])=>{const el=$(`[data-countdown-${k}]`);if(el)el.textContent=k==='days'?String(v):pad(v)});
      const label=$('[data-countdown-label]');
      if(label) label.textContent=diff>0?'距离 '+cfg.label:'今天上考场';
    };
    tick();setInterval(tick,1000);
  }

  function readProgress(){
    try{return JSON.parse(localStorage.getItem(progressKey)||'{}')||{}}catch{return{}}
  }

  function renderCourse(data){
    const progress=readProgress();
    const subjects=data.subjects||{};
    let total=0,done=0;
    ['ds','co','os','cn'].forEach(key=>{
      const info=subjects[key]||{items:[]};
      const items=info.items||[];
      const d=items.filter(i=>progress[i.id]?.done).length;
      total+=items.length;done+=d;
      const card=$(`[data-subject="${key}"]`);
      if(!card)return;
      const num=card.querySelector('[data-subject-number]');
      const meta=card.querySelector('[data-subject-meta]');
      const bar=card.querySelector('.mini-progress>span');
      if(num)num.textContent=`${d}/${items.length}`;
      if(meta)meta.textContent=items.length?`${Math.round(d/items.length*100)}% · ${items.length} 课时`:'暂无课程';
      if(bar)bar.style.width=(items.length?d/items.length*100:0)+'%';
    });
    const all=$('[data-overall-study]');
    if(all)all.textContent=total?`${done}/${total} 课时 · ${Math.round(done/total*100)}%`:'暂无课程数据';
  }

  loadJson('data/exam.json').then(renderCountdown).catch(console.error);
  loadJson('data/oxygen.json').then(renderCourse).catch(console.error);
})();
