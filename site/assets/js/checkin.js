(()=>{
  const SUBJECTS=['ds','co','os','cn'];
  const STATE_KEY='oxygen408-progress-v2';
  const LEGACY={ds:'408_checkin_ds',co:'408_checkin_co'};
  const REFRESH_MS=2*60*1000;
  let data=null,state={},active='ds',lastVersion='';

  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function loadState(){try{state=JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}catch{state={}}}
  function saveState(){localStorage.setItem(STATE_KEY,JSON.stringify(state))}
  function ensure(id){return state[id]||(state[id]={done:false,note:''})}

  function migrateLegacy(){
    let changed=false;
    for(const key of ['ds','co']){
      const items=data.subjects?.[key]?.items||[];
      if(!items.length||!LEGACY[key])continue;
      try{
        const old=JSON.parse(localStorage.getItem(LEGACY[key])||'null');
        const notes=JSON.parse(localStorage.getItem(key==='ds'?'408_notes_ds':'408_notes_co')||'null');
        if(Array.isArray(old)){
          old.forEach((v,i)=>{
            const item=items[i];if(!item)return;
            if(!state[item.id]){
              state[item.id]={done:Boolean(v),note:Array.isArray(notes)?String(notes[i]||''):''};changed=true;
            }
          });
        }
      }catch{}
    }
    if(changed)saveState();
  }

  function stats(){
    let total=0,done=0;
    SUBJECTS.forEach(key=>{
      const items=data.subjects?.[key]?.items||[];
      const d=items.filter(i=>ensure(i.id).done).length;
      total+=items.length;done+=d;
      const tab=$(`[data-tab="${key}"]`);
      if(tab)tab.textContent=`${data.subjects[key].short} ${d}/${items.length}`;
    });
    const pct=total?Math.round(done/total*100):0;
    $('[data-total-text]').textContent=`${done}/${total} 课时`;
    $('[data-total-percent]').textContent=pct+'%';
    $('[data-total-bar]').style.width=pct+'%';
  }

  function row(item,i){
    const st=ensure(item.id);
    const when=item.publishedAt?new Date(item.publishedAt*1000).toLocaleDateString('zh-CN'):'';
    return `<tr class="${st.done?'done':''}" data-row="${esc(item.id)}">
      <td><input class="check" type="checkbox" data-check="${esc(item.id)}" ${st.done?'checked':''}></td>
      <td class="num">${i+1}</td>
      <td><span class="course-title">${esc(item.title)}</span>${when?`<span class="course-meta">${esc(when)}</span>`:''}</td>
      <td class="mono">${esc(item.duration||'--')}</td>
      <td>${item.url?`<a class="course-link" href="${esc(item.url)}" target="_blank" rel="noopener">B站 ↗</a>`:'<span class="muted">待补链接</span>'}</td>
      <td><input class="note-input" data-note="${esc(item.id)}" value="${esc(st.note||'')}" placeholder="备注"></td>
    </tr>`;
  }

  function renderSubject(key){
    const panel=$(`[data-panel="${key}"]`);
    const info=data.subjects?.[key];
    if(!panel||!info)return;
    const items=info.items||[];
    panel.innerHTML=items.length?`
      <div class="checkin-toolbar">
        <div><strong>${esc(info.label)}强化</strong> <span class="muted">· ${items.length} 课时</span></div>
        <div class="toolbar-actions">
          <button class="small-btn" data-all="${key}" data-val="1">全部完成</button>
          <button class="small-btn" data-all="${key}" data-val="0">全部取消</button>
        </div>
      </div>
      <div class="course-table-wrap"><table class="course-table"><thead><tr><th>✓</th><th>#</th><th>课程名称</th><th>时长</th><th>视频</th><th>备注</th></tr></thead><tbody>${items.map(row).join('')}</tbody></table></div>
    `:`<div class="empty-state"><strong>${esc(info.label)}强化暂未同步到课程</strong><br><span>自动任务会持续检查「就是氧气11」的新视频。</span></div>`;
  }

  function syncLabel(source={}){
    const status=source.syncStatus||'seed';
    const states=source.subjectStatus||{};
    const okCount=SUBJECTS.filter(k=>states[k]?.ok).length;
    if(status==='ok')return '自动同步正常 · 4/4';
    if(status==='partial')return `部分同步 · ${okCount}/4，失败科目将自动重试`;
    if(status==='error')return '本轮同步失败，系统将自动重试';
    return '自动同步已启用';
  }

  function render(){
    SUBJECTS.forEach(renderSubject);stats();
    const dt=data.updatedAt?new Date(data.updatedAt):null;
    $('[data-sync-time]').textContent=dt&&!Number.isNaN(dt.getTime())?dt.toLocaleString('zh-CN',{hour12:false}):'等待首次同步';
    $('[data-sync-status]').textContent=syncLabel(data.source)+' · 页面每2分钟自动刷新';
    $('[data-sync-status]').title=String(data.source?.message||'');
    switchTab(active);
  }

  function switchTab(key){
    active=key;
    $$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===key));
    $$('[data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===key));
  }

  async function refreshData(initial=false){
    try{
      const r=await fetch('../data/oxygen.json?t='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('oxygen data');
      const next=await r.json();
      const version=String(next.updatedAt||'')+'|'+SUBJECTS.map(k=>(next.subjects?.[k]?.items||[]).length).join(',');
      if(!initial&&version===lastVersion)return;
      if(!initial&&document.activeElement?.matches?.('.note-input'))return;
      data=next;lastVersion=version;
      if(initial)migrateLegacy();
      render();
    }catch(err){
      console.error(err);
      if(initial)$('[data-checkin-root]').innerHTML='<div class="empty-state">强化表加载失败，请稍后刷新。</div>';
    }
  }

  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-tab]');if(tab){switchTab(tab.dataset.tab);return}
    const all=e.target.closest('[data-all]');if(all){
      const key=all.dataset.all,val=all.dataset.val==='1';
      (data.subjects?.[key]?.items||[]).forEach(i=>ensure(i.id).done=val);
      saveState();renderSubject(key);stats();return;
    }
  });
  document.addEventListener('change',e=>{
    if(e.target.matches('[data-check]')){
      const id=e.target.dataset.check;ensure(id).done=e.target.checked;saveState();
      e.target.closest('tr')?.classList.toggle('done',e.target.checked);stats();
    }
  });
  document.addEventListener('input',e=>{
    if(e.target.matches('[data-note]')){ensure(e.target.dataset.note).note=e.target.value;saveState()}
  });

  loadState();
  refreshData(true);
  setInterval(()=>refreshData(false),REFRESH_MS);
})();
