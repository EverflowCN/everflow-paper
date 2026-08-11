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
  const selectedSubject=kind=>{const el=$(`[data-${kind}-subject]`);if(!el)return'general';if(el.tagName==='SELECT')return el.value||'general';return el.querySelector?.('input[type="radio"]:checked')?.value||'general'};
  const feedback=(sel,text,type='success')=>{const el=$(sel);if(el){el.textContent=text;el.className=`focus-feedback ${type}`}};

  function elapsed(){if(!timer)return 0;return Math.max(0,Number(timer.accumulated)||0)+(timer.running?Math.max(0,(now()-timer.startedTick)/1000):0)}

  function render(){
    const value=$('[data-timer-value]'),sub=$('[data-timer-sub]'),ring=$('[data-timer-ring]');
    const startBtn=$('[data-timer-start]'),stopBtn=$('[data-timer-stop]');
    const e=elapsed(),target=Math.max(60,Number(timer?.targetSeconds)||3000);
    if(value)value.textContent=fmt(e);
    if(sub)sub.textContent=timer?(timer.running?'专注进行中 · 点击暂停':'已暂停 · 可继续'):'选择时长后开始';
    if(ring)ring.style.setProperty('--timer-progress',Math.min(360,e/target*360)+'deg');
    if(startBtn)startBtn.textContent=timer?(timer.running?'暂停':'继续'):'开始专注';
    if(stopBtn)stopBtn.disabled=!timer;
    document.title=timer&&timer.running?`${fmt(e)} · 专注中 · Everflow`:'专注统计 · Everflow';
  }

  function begin(){
    feedback('[data-focus-message]','');
    if(timer){
      if(timer.running){timer.accumulated=elapsed();timer.running=false;delete timer.startedTick;feedback('[data-focus-message]','已暂停，记录仍保存在本机。','success')}
      else{timer.running=true;timer.startedTick=now();feedback('[data-focus-message]','已继续计时。','success')}
    }else{
      const minutes=Math.max(1,Number($('[data-focus-minutes]')?.value)||50);
      timer={id:makeId(),subject:selectedSubject('focus'),note:$('[data-focus-note]')?.value||'',targetSeconds:minutes*60,accumulated:0,startedAt:new Date().toISOString(),running:true,startedTick:now()};
      feedback('[data-focus-message]',`已开始 ${minutes} 分钟专注，刷新页面也会继续计时。`,'success');
    }
    save();render();
  }

  async function stop(saveSession=true){
    if(!timer)return;
    const sec=Math.round(elapsed()),old={...timer};
    timer=null;save();render();
    if(saveSession&&sec>=30&&window.EveraStore){
      await EveraStore.putFocusSession({id:old.id,subject:old.subject,startedAt:old.startedAt,endedAt:new Date().toISOString(),durationSeconds:sec,note:old.note});
      renderRecent();renderSummary();feedback('[data-focus-message]',`已保存 ${fmt(sec)} 专注记录。`,'success');window.EveraUI?.toast?.(`已保存 ${fmt(sec)} 专注记录。`,{type:'success',title:'专注完成'});
    }else if(saveSession&&sec<30)feedback('[data-focus-message]','少于 30 秒，本次没有写入记录。','error');
    else feedback('[data-focus-message]','本次计时已放弃。','success');
  }

  async function manualAdd(btn){
    const minutes=Math.max(1,Number($('[data-manual-minutes]')?.value)||0),date=$('[data-manual-date]')?.value;
    if(!minutes||!date){feedback('[data-manual-message]','请填写日期和有效专注分钟数。','error');return}
    btn&&window.EveraUI?.setBusy?.(btn,true,'保存中…');
    try{
      const ended=new Date(date+'T23:59:00');
      await EveraStore.putFocusSession({subject:selectedSubject('manual'),startedAt:new Date(ended.getTime()-minutes*60000).toISOString(),endedAt:ended.toISOString(),durationSeconds:minutes*60,note:$('[data-manual-note]')?.value||''});
      feedback('[data-manual-message]',`已补录 ${minutes} 分钟，并更新下方统计。`,'success');window.EveraUI?.toast?.(`已补录 ${minutes} 分钟。`,{type:'success',title:'补录成功'});renderRecent();renderSummary();
    }catch(e){feedback('[data-manual-message]',e.message||'补录失败。','error')}finally{btn&&window.EveraUI?.setBusy?.(btn,false)}
  }

  async function renderSummary(){
    if(!window.EveraStore)return;
    const s=await EveraStore.getSummary(),minutes=Math.round(s.todaySeconds/60);
    $$('[data-focus-today]').forEach(el=>el.textContent=minutes>=60?`${Math.floor(minutes/60)}h ${minutes%60}m`:`${minutes}m`);
    $$('[data-focus-streak]').forEach(el=>el.textContent=`${s.streak} 天`);
  }

  async function renderRecent(){
    const el=$('[data-focus-history]');if(!el||!window.EveraStore)return;
    const rows=(await EveraStore.listFocusSessions()).slice(0,8),labels={ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络',general:'综合/其他'};
    el.innerHTML=rows.length?rows.map(r=>{const d=new Date(r.endedAt),mins=Math.round((Number(r.durationSeconds)||0)/60);return `<div class="history-row"><span class="muted">${d.toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'})}</span><div><strong>${labels[r.subject]||r.subject}</strong>${r.note?`<div class="muted">${String(r.note).replace(/[&<>]/g,'')}</div>`:''}</div><strong>${mins} min</strong></div>`}).join(''):'<div class="muted">还没有专注记录。</div>';
  }

  async function init(){
    await window.EveraStore?.init();timer=load();if(timer?.running&&!timer.startedTick)timer.startedTick=now();
    const date=$('[data-manual-date]');if(date&&!date.value)date.value=new Date().toISOString().slice(0,10);
    render();renderRecent();renderSummary();setInterval(render,500);
  }

  $('[data-timer-start]')?.addEventListener('click',begin);
  $('[data-timer-stop]')?.addEventListener('click',()=>stop(true));
  $('[data-timer-discard]')?.addEventListener('click',()=>stop(false));
  $('[data-manual-add]')?.addEventListener('click',e=>manualAdd(e.currentTarget));
  $$('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const x=$('[data-focus-minutes]');if(x)x.value=b.dataset.preset;window.EveraUI?.toast?.(`计划时长已设为 ${b.dataset.preset} 分钟。`,{type:'info',duration:1600})}));
  addEventListener('beforeunload',save);init().catch(console.error);
})();