(()=>{
  const $=s=>document.querySelector(s);
  const pad=n=>String(Math.max(0,n)).padStart(2,'0');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const progressKey='oxygen408-progress-v2';

  async function loadJson(path){
    const r=await fetch(path+'?t='+Date.now(),{cache:'no-store'});
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

  function syncLabel(source={}){
    const status=source.syncStatus||'seed';
    const states=source.subjectStatus||{};
    const okCount=['ds','co','os','cn'].filter(k=>states[k]?.ok).length;
    if(status==='ok')return '自动同步正常 · 4/4';
    if(status==='partial')return `部分同步 · ${okCount}/4（将自动重试）`;
    if(status==='error')return '本轮同步失败 · 将自动重试';
    return '自动同步已启用';
  }

  function renderOxygen(data){
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
      if(meta)meta.textContent=items.length?`${Math.round(d/items.length*100)}% · ${items.length} 课时`:'等待课程更新';
      if(bar)bar.style.width=(items.length?d/items.length*100:0)+'%';
    });
    const all=$('[data-overall-study]');
    if(all)all.textContent=total?`${done}/${total} 课时 · ${Math.round(done/total*100)}%`:'等待同步';
    const sync=$('[data-oxygen-sync]');
    if(sync){
      const dt=data.updatedAt?new Date(data.updatedAt):null;
      sync.innerHTML=`<span class="status-dot"></span>${esc(syncLabel(data.source))} · ${dt&&!Number.isNaN(dt.getTime())?dt.toLocaleString('zh-CN',{hour12:false}):'等待首次同步'}`;
      sync.title=String(data.source?.message||'');
    }
  }

  Promise.all([loadJson('data/exam.json'),loadJson('data/oxygen.json')])
    .then(([exam,oxygen])=>{renderCountdown(exam);renderOxygen(oxygen)})
    .catch(err=>{console.error(err);const s=$('[data-oxygen-sync]');if(s)s.textContent='数据暂时加载失败，请刷新重试。'});
})();
