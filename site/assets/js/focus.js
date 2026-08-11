(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const ACTIVE_KEY='everflow-focus-active-v1';
  let timer=null;

  const fmt=sec=>{sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`};
  const now=()=>Date.now();
  const makeId=()=>{if(globalThis.crypto?.randomUUID)return crypto.randomUUID();return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(c)/4).toString(16))};
  const load=()=>{try{return JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null')}catch{return null}};
  const save=()=>timer?localStorage.setItem(ACTIVE_KEY,JSON.stringify(timer)):localStorage.removeItem(ACTIVE_KEY);

  function elapsed(){
    if(!timer)return 0;
    return Math.max(0,Number(timer.accumulated)||0)+(timer.running?Math.max(0,(now()-timer.startedTick)/1000):0);
  }

  function render(){
    const value=$('[data-timer-value]'),sub=$('[data-timer-sub]'),ring=$('[data-timer-ring]');
    const startBtn=$('[data-timer-start]'),stopBtn=$('[data-timer-stop]');
    const e=elapsed();
    const target=Math.max(60,Number(timer?.targetSeconds)||3000);
    if(value)value.textContent=fmt(e);
    if(sub)sub.textContent=timer?(timer.running?'专注进行中 · 点击暂停':'已暂停 · 可继续'):'选择时长后开始';
    if(ring)ring.style.setProperty('--timer-progress',Math.min(360,e/target*360)+'deg');
    if(startBtn)startBtn.textContent=timer?(timer.running?'暂停':'继续'):'开始专注';
    if(stopBtn)stopBtn.disabled=!timer;
    document.title=timer&&timer.running?`${fmt(e)} · 专注中 · Everflow`:'专注 · Everflow';
  }

  function begin(){
    if(timer){
      if(timer.running){timer.accumulated=elapsed();timer.running=false;delete timer.startedTick}
      else{timer.running=true;timer.startedTick=now()}
    }else{
      const minutes=Math.max(1,Number($('[data-focus-minutes]')?.value)||50);
      timer={
        id:makeId(),
        subject:$('[data-focus-subject]')?.value||'general',
        note:$('[data-focus-note]')?.value||'',
        targetSeconds:minutes*60,
        accumulated:0,
        startedAt:new Date().toISOString(),
        running:true,
        startedTick:now()
      };
    }
    save();render();
  }

  async function stop(saveSession=true){
    if(!timer)return;
    const sec=Math.round(elapsed());
    const old={...timer};
    timer=null;save();render();
    if(saveSession&&sec>=30&&window.EveraStore){
      await EveraStore.putFocusSession({
        id:old.id,
        subject:old.subject,
        startedAt:old.startedAt,
        endedAt:new Date().toISOString(),
        durationSeconds:sec,
        note:old.note
      });
      renderRecent();renderSummary();
      const msg=$('[data-focus-message]');if(msg)msg.textContent=`已保存 ${fmt(sec)} 专注记录。`;
    }
  }

  async function manualAdd(){
    const minutes=Math.max(1,Number($('[data-manual-minutes]')?.value)||0);
    const date=$('[data-manual-date]')?.value;
    if(!minutes||!date)return;
    const ended=new Date(date+'T23:59:00');
    await EveraStore.putFocusSession({
      subject:$('[data-manual-subject]')?.value||'general',
      startedAt:new Date(ended.getTime()-minutes*60000).toISOString(),
      endedAt:ended.toISOString(),
      durationSeconds:minutes*60,
      note:$('[data-manual-note]')?.value||''
    });
    const msg=$('[data-manual-message]');if(msg)msg.textContent=`已补录 ${minutes} 分钟。`;
    renderRecent();renderSummary();
  }

  async function renderSummary(){
    if(!window.EveraStore)return;
    const s=await EveraStore.getSummary();
    const minutes=Math.round(s.todaySeconds/60);
    const today=$('[data-focus-today]');if(today)today.textContent=minutes>=60?`${Math.floor(minutes/60)}h ${minutes%60}m`:`${minutes}m`;
    const streak=$('[data-focus-streak]');if(streak)streak.textContent=`${s.streak} 天`;
  }

  async function renderRecent(){
    const el=$('[data-focus-history]');if(!el||!window.EveraStore)return;
    const rows=(await EveraStore.listFocusSessions()).slice(0,8);
    const labels={ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络',general:'综合/其他'};
    el.innerHTML=rows.length?rows.map(r=>{
      const d=new Date(r.endedAt);const mins=Math.round((Number(r.durationSeconds)||0)/60);
      return `<div class="history-row"><span class="muted">${d.toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'})}</span><div><strong>${labels[r.subject]||r.subject}</strong>${r.note?`<div class="muted">${String(r.note).replace(/[&<>]/g,'')}</div>`:''}</div><strong>${mins} min</strong></div>`;
    }).join(''):'<div class="muted">还没有专注记录。</div>';
  }

  async function init(){
    await window.EveraStore?.init();
    timer=load();
    if(timer?.running&&!timer.startedTick){timer.startedTick=now()}
    const date=$('[data-manual-date]');if(date&&!date.value)date.value=new Date().toISOString().slice(0,10);
    render();renderRecent();renderSummary();
    setInterval(render,500);
  }

  $('[data-timer-start]')?.addEventListener('click',begin);
  $('[data-timer-stop]')?.addEventListener('click',()=>stop(true));
  $('[data-timer-discard]')?.addEventListener('click',()=>stop(false));
  $('[data-manual-add]')?.addEventListener('click',manualAdd);
  $$('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const x=$('[data-focus-minutes]');if(x)x.value=b.dataset.preset}));
  addEventListener('beforeunload',save);
  init().catch(console.error);
})();
