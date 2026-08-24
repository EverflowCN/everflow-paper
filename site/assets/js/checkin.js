(()=>{
  const STATE_KEY='oxygen408-progress-v2';
  const COURSE_SUBJECT='pastpaper';
  let data=null,state={},course={label:'408课程',items:[]};
  const noteTimers=new Map();

  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nowIso=()=>new Date().toISOString();

  function loadState(){try{state=JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}catch{state={}}}
  function saveState(){localStorage.setItem(STATE_KEY,JSON.stringify(state))}
  function ensure(id){return state[id]||(state[id]={done:false,note:'',updatedAt:''})}
  function normalizeCourse(payload){
    if(payload?.course&&Array.isArray(payload.course.items))return payload.course;
    const items=Object.values(payload?.subjects||{}).flatMap(subject=>subject?.items||[]);
    return{label:payload?.source?.collection||'408课程',items};
  }

  async function hydrateFromStudyStore(){
    if(!window.EveraStore)return;
    try{
      await EveraStore.init();
      const rows=await EveraStore.listCourseStates();
      let changed=false;
      rows.forEach(r=>{
        const local=state[r.id];
        if(!local){state[r.id]={done:Boolean(r.done),note:String(r.note||''),updatedAt:r.updatedAt||''};changed=true;return}
        if(local.updatedAt&&r.updatedAt&&String(r.updatedAt)>String(local.updatedAt)){
          state[r.id]={done:Boolean(r.done),note:String(r.note||''),updatedAt:r.updatedAt};changed=true;
        }
      });
      if(changed)saveState();
    }catch(e){console.warn('study-store hydrate failed',e)}
  }

  function mirrorCourse(id){
    const st=ensure(id);
    window.EveraStore?.putCourseState({id,subject:COURSE_SUBJECT,done:st.done,note:st.note}).catch?.(()=>{});
  }
  function mirrorKnownStates(){if(!window.EveraStore)return;(course.items||[]).forEach(item=>{if(state[item.id])mirrorCourse(item.id)})}

  function stats(){
    const items=course.items||[],done=items.filter(item=>ensure(item.id).done).length,total=items.length,pct=total?Math.round(done/total*100):0;
    const totalText=$('[data-total-text]'),totalPercent=$('[data-total-percent]'),totalBar=$('[data-total-bar]');
    if(totalText)totalText.textContent=`${done}/${total} 课时`;
    if(totalPercent)totalPercent.textContent=pct+'%';
    if(totalBar)totalBar.style.width=pct+'%';
  }

  function row(item,i){
    const st=ensure(item.id);
    const when=item.publishedAt?new Date(item.publishedAt*1000).toLocaleDateString('zh-CN'):'';
    const year=item.year||String(item.title||'').match(/(20\d{2}|19\d{2})年/)?.[1]||i+1;
    return `<tr class="${st.done?'done':''}" data-row="${esc(item.id)}">
      <td><input class="check" type="checkbox" data-check="${esc(item.id)}" ${st.done?'checked':''}></td>
      <td class="num">${esc(year)}</td>
      <td><span class="course-title">${esc(item.title)}</span>${when?`<span class="course-meta">${esc(when)}</span>`:''}</td>
      <td class="mono">${esc(item.duration||'--')}</td>
      <td>${item.url?`<a class="course-link" href="${esc(item.url)}" target="_blank" rel="noopener">B站 ↗</a>`:'<span class="muted">暂无链接</span>'}</td>
      <td><input class="note-input" data-note="${esc(item.id)}" value="${esc(st.note||'')}" placeholder="备注"></td>
    </tr>`;
  }

  function render(){
    const panel=$('[data-course-panel]'),items=course.items||[];
    if(!panel)return;
    panel.innerHTML=items.length?`
      <div class="checkin-toolbar">
        <div><strong>${esc(course.label||'历年408真题讲解')}</strong> <span class="muted">· ${items.length} 课时</span></div>
        <div class="toolbar-actions">
          <button class="small-btn" data-all="1">全部完成</button>
          <button class="small-btn" data-all="0">全部取消</button>
        </div>
      </div>
      <div class="course-table-wrap"><table class="course-table"><thead><tr><th>✓</th><th>年份</th><th>课程名称</th><th>时长</th><th>视频</th><th>备注</th></tr></thead><tbody>${items.map(row).join('')}</tbody></table></div>
    `:`<div class="empty-state"><strong>合集暂时还没有可显示的课时</strong></div>`;
    stats();
  }

  async function loadCourseData(){
    const r=await fetch('../data/oxygen.json',{cache:'no-store'});
    if(!r.ok)throw new Error('course data');
    return r.json();
  }

  document.addEventListener('click',e=>{
    const all=e.target.closest('[data-all]');if(!all)return;
    const val=all.dataset.all==='1',stamp=nowIso();
    (course.items||[]).forEach(item=>{const st=ensure(item.id);st.done=val;st.updatedAt=stamp;mirrorCourse(item.id)});
    saveState();render();
  });
  document.addEventListener('change',e=>{
    if(!e.target.matches('[data-check]'))return;
    const id=e.target.dataset.check,st=ensure(id);st.done=e.target.checked;st.updatedAt=nowIso();saveState();mirrorCourse(id);
    e.target.closest('tr')?.classList.toggle('done',e.target.checked);stats();
  });
  document.addEventListener('input',e=>{
    if(!e.target.matches('[data-note]'))return;
    const id=e.target.dataset.note,st=ensure(id);st.note=e.target.value;st.updatedAt=nowIso();saveState();
    clearTimeout(noteTimers.get(id));noteTimers.set(id,setTimeout(()=>mirrorCourse(id),450));
  });

  async function boot(){
    try{
      loadState();await hydrateFromStudyStore();data=await loadCourseData();course=normalizeCourse(data);render();mirrorKnownStates();
    }catch(err){console.error(err);$('[data-checkin-root]').innerHTML='<div class="empty-state">课程表加载失败，请稍后刷新。</div>'}
  }
  boot();
})();
