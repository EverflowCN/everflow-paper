(()=>{
  const STATE_KEY='oxygen408-progress-v2';
  const SUBJECTS=['ds','co','os','cn'];
  const DATA_VERSION='20260825-course2';
  let state={},paperData=null,reinforcementData=null,mode='paper',subject='ds',booting=false;
  const noteTimers=new Map();
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nowIso=()=>new Date().toISOString();

  function loadState(){try{state=JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}catch{state={}}}
  function saveState(){localStorage.setItem(STATE_KEY,JSON.stringify(state))}
  function ensure(id){return state[id]||(state[id]={done:false,note:'',updatedAt:''})}
  async function loadJson(url,{force=false}={}){let lastError;for(let attempt=0;attempt<2;attempt++){try{const join=url.includes('?')?'&':'?',r=await fetch(`${url}${join}v=${DATA_VERSION}`,{cache:force||attempt?'reload':'default'});if(!r.ok)throw new Error(`${url} HTTP ${r.status}`);return await r.json()}catch(error){lastError=error}}throw lastError}

  async function hydrateFromStore(){
    if(!window.EveraStore)return;
    try{await EveraStore.init();const rows=await EveraStore.listCourseStates();let changed=false;for(const r of rows){const old=state[r.id];if(!old||String(r.updatedAt||'')>String(old.updatedAt||'')){state[r.id]={done:Boolean(r.done),note:String(r.note||''),updatedAt:r.updatedAt||''};changed=true}}if(changed)saveState()}catch(e){console.warn('course hydrate failed',e)}
  }
  function mirror(id,kind){const st=ensure(id);window.EveraStore?.putCourseState({id,subject:kind,done:st.done,note:st.note}).catch?.(()=>{})}

  function currentItems(){
    if(mode==='paper')return paperData?.course?.items||[];
    return reinforcementData?.subjects?.[subject]?.items||[];
  }
  function currentKind(){return mode==='paper'?'pastpaper':subject}
  function titleForCurrent(){return mode==='paper'?(paperData?.course?.label||'历年408真题讲解'):(reinforcementData?.subjects?.[subject]?.label||'408强化课程')+'强化'}
  function stats(){const items=currentItems(),done=items.filter(x=>ensure(x.id).done).length,pct=items.length?Math.round(done/items.length*100):0;$('[data-total-text]').textContent=`${done}/${items.length} 课时`;$('[data-total-percent]').textContent=pct+'%';$('[data-total-bar]').style.width=pct+'%'}

  function row(item,i){
    const st=ensure(item.id),when=item.publishedAt?new Date(item.publishedAt*1000).toLocaleDateString('zh-CN'):'';
    const order=mode==='paper'?(item.year||String(item.title||'').match(/(20\d{2}|19\d{2})年/)?.[1]||i+1):i+1;
    return `<tr class="${st.done?'done':''}" data-row="${esc(item.id)}"><td><input class="check" type="checkbox" data-check="${esc(item.id)}" ${st.done?'checked':''}></td><td class="num">${esc(order)}</td><td><span class="course-title">${esc(item.title)}</span>${when?`<span class="course-meta">${esc(when)}</span>`:''}</td><td class="mono">${esc(item.duration||'--')}</td><td>${item.url?`<a class="course-link" href="${esc(item.url)}" target="_blank" rel="noopener">B站 ↗</a>`:'<span class="muted">暂无链接</span>'}</td><td><input class="note-input" data-note="${esc(item.id)}" value="${esc(st.note||'')}" placeholder="备注"></td></tr>`;
  }

  function renderTabs(){
    $$('[data-course-mode]').forEach(b=>b.classList.toggle('active',b.dataset.courseMode===mode));
    const subjectNav=$('[data-subject-tabs]');subjectNav.hidden=mode!=='reinforcement';
    SUBJECTS.forEach(k=>{const b=subjectNav.querySelector(`[data-subject="${k}"]`),items=reinforcementData?.subjects?.[k]?.items||[],done=items.filter(x=>ensure(x.id).done).length;if(b){b.classList.toggle('active',k===subject);b.textContent=`${reinforcementData?.subjects?.[k]?.short||k.toUpperCase()} ${done}/${items.length}`}});
  }
  function render(){
    renderTabs();const items=currentItems(),panel=$('[data-course-panel]');
    panel.innerHTML=items.length?`<div class="checkin-toolbar"><div><strong>${esc(titleForCurrent())}</strong> <span class="muted">· ${items.length} 课时</span></div><div class="toolbar-actions"><button class="small-btn" data-all="1">全部完成</button><button class="small-btn" data-all="0">全部取消</button></div></div><div class="course-table-wrap"><table class="course-table"><thead><tr><th>✓</th><th>${mode==='paper'?'年份':'#'}</th><th>课程名称</th><th>时长</th><th>视频</th><th>备注</th></tr></thead><tbody>${items.map(row).join('')}</tbody></table></div>`:'<div class="empty-state"><strong>暂无课程数据</strong></div>';
    stats();
  }

  document.addEventListener('click',e=>{
    const retry=e.target.closest('[data-course-retry]');if(retry){boot({force:true});return}
    const m=e.target.closest('[data-course-mode]');if(m){mode=m.dataset.courseMode;render();return}
    const s=e.target.closest('[data-subject]');if(s){subject=s.dataset.subject;render();return}
    const all=e.target.closest('[data-all]');if(all){const val=all.dataset.all==='1',stamp=nowIso();for(const item of currentItems()){const st=ensure(item.id);st.done=val;st.updatedAt=stamp;mirror(item.id,currentKind())}saveState();render()}
  });
  document.addEventListener('change',e=>{if(!e.target.matches('[data-check]'))return;const id=e.target.dataset.check,st=ensure(id);st.done=e.target.checked;st.updatedAt=nowIso();saveState();mirror(id,currentKind());e.target.closest('tr')?.classList.toggle('done',e.target.checked);stats()});
  document.addEventListener('input',e=>{if(!e.target.matches('[data-note]'))return;const id=e.target.dataset.note,st=ensure(id);st.note=e.target.value;st.updatedAt=nowIso();saveState();clearTimeout(noteTimers.get(id));noteTimers.set(id,setTimeout(()=>mirror(id,currentKind()),450))});

  async function boot({force=false}={}){if(booting)return;booting=true;const panel=$('[data-course-panel]');$('[data-total-text]').textContent='正在加载课程…';$('[data-total-percent]').textContent='--';$('[data-total-bar]').style.width='0';panel.innerHTML='<div class="empty-state">正在读取两套课程，请稍候…</div>';try{loadState();const hydration=hydrateFromStore();[paperData,reinforcementData]=await Promise.all([loadJson('../data/oxygen.json',{force}),loadJson('../data/oxygen-reinforcement.json',{force})]);render();await hydration;render()}catch(err){console.error('course catalog load failed',err);$('[data-total-text]').textContent='课程暂未载入';$('[data-total-percent]').textContent='--';panel.innerHTML='<div class="empty-state"><strong>课程表加载失败</strong><p>网络恢复后可以直接重试，不会清空已保存的打卡记录。</p><button class="small-btn" type="button" data-course-retry>重新载入课程</button></div>'}finally{booting=false}}
  boot();
})();
