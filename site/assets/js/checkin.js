(()=>{
  const STATE_KEY='oxygen408-progress-v2';
  const SUBJECTS=['ds','co','os','cn'];
  let state={},paperData=null,reinforcementData=null,mode='paper',subject='ds';
  const noteTimers=new Map();
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nowIso=()=>new Date().toISOString();

  function loadState(){try{state=JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}catch{state={}}}
  function saveState(){localStorage.setItem(STATE_KEY,JSON.stringify(state))}
  function ensure(id){return state[id]||(state[id]={done:false,note:'',updatedAt:''})}
  async function loadJson(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(url);return r.json()}

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
    const m=e.target.closest('[data-course-mode]');if(m){mode=m.dataset.courseMode;render();return}
    const s=e.target.closest('[data-subject]');if(s){subject=s.dataset.subject;render();return}
    const all=e.target.closest('[data-all]');if(all){const val=all.dataset.all==='1',stamp=nowIso();for(const item of currentItems()){const st=ensure(item.id);st.done=val;st.updatedAt=stamp;mirror(item.id,currentKind())}saveState();render()}
  });
  document.addEventListener('change',e=>{if(!e.target.matches('[data-check]'))return;const id=e.target.dataset.check,st=ensure(id);st.done=e.target.checked;st.updatedAt=nowIso();saveState();mirror(id,currentKind());e.target.closest('tr')?.classList.toggle('done',e.target.checked);stats()});
  document.addEventListener('input',e=>{if(!e.target.matches('[data-note]'))return;const id=e.target.dataset.note,st=ensure(id);st.note=e.target.value;st.updatedAt=nowIso();saveState();clearTimeout(noteTimers.get(id));noteTimers.set(id,setTimeout(()=>mirror(id,currentKind()),450))});

  async function boot(){try{loadState();await hydrateFromStore();[paperData,reinforcementData]=await Promise.all([loadJson('../data/oxygen.json'),loadJson('../data/oxygen-reinforcement.json')]);render()}catch(err){console.error(err);$('[data-checkin-root]').innerHTML='<div class="empty-state">课程表加载失败，请稍后刷新。</div>'}}
  boot();
})();
