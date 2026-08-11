(()=>{
  'use strict';

  const PRACTICE_ID='408-1800-2027-reinforcement';
  const DATA_URL='/data/practice/408-1800-2027.json';
  const K_DONE='everflow_1800_done_v2';
  const K_NOTE='everflow_1800_note_v2';
  const K_NOTE_META='everflow_1800_note_meta_v2';
  const K_Q_META='everflow_1800_question_meta_v3';
  const LEGACY_DONE='everflow_1800_done_v1';
  const LEGACY_NOTE='everflow_1800_note_v1';
  const SCOPE_KEY=`everflow-practice-scope:${PRACTICE_ID}`;
  const SNAPSHOT_PREFIX=`everflow-practice-snapshot:${PRACTICE_ID}:`;
  const SUBJECTS=['ds','co','os','cn'];

  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  let catalog=null,current='ds',done={},notes={},noteMeta={},questionMeta={};
  let syncRunning=false,syncAgain=false,syncTimer=null;

  function load(key,fallback){try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback}catch{return fallback}}
  function dateStr(d=new Date()){const x=d instanceof Date?d:new Date(d);if(Number.isNaN(x.getTime()))return '';return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
  function timeMs(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:0}
  function qKey(rowId,q){return `${rowId}|${q}`}
  function qCloudId(subject,rowId,q){return `q:${subject}:${rowId}:${q}`}
  function noteCloudId(subject,rowId){return `note:${subject}:${rowId}`}
  function snapshotKey(userId){return SNAPSHOT_PREFIX+userId}

  function snapshotPayload(){return {done,notes,noteMeta,questionMeta,current}}
  function saveSnapshot(userId){if(!userId)return;try{localStorage.setItem(snapshotKey(userId),JSON.stringify(snapshotPayload()))}catch{}}
  function restoreSnapshot(userId){
    try{
      const raw=localStorage.getItem(snapshotKey(userId));
      if(!raw)return {done:{},notes:{},noteMeta:{},questionMeta:{},current:'ds'};
      const x=JSON.parse(raw)||{};
      return {
        done:x.done&&typeof x.done==='object'?x.done:{},
        notes:x.notes&&typeof x.notes==='object'?x.notes:{},
        noteMeta:x.noteMeta&&typeof x.noteMeta==='object'?x.noteMeta:{},
        questionMeta:x.questionMeta&&typeof x.questionMeta==='object'?x.questionMeta:{},
        current:SUBJECTS.includes(x.current)?x.current:'ds'
      };
    }catch{return {done:{},notes:{},noteMeta:{},questionMeta:{},current:'ds'}}
  }
  function saveLocal(){
    localStorage.setItem(K_DONE,JSON.stringify(done));
    localStorage.setItem(K_NOTE,JSON.stringify(notes));
    localStorage.setItem(K_NOTE_META,JSON.stringify(noteMeta));
    localStorage.setItem(K_Q_META,JSON.stringify(questionMeta));
    const scope=localStorage.getItem(SCOPE_KEY);
    if(scope)saveSnapshot(scope);
  }
  function bindScope(userId){
    if(!userId)return false;
    const bound=localStorage.getItem(SCOPE_KEY);
    if(!bound){localStorage.setItem(SCOPE_KEY,userId);saveSnapshot(userId);return false}
    if(bound===userId)return false;
    saveSnapshot(bound);
    const snap=restoreSnapshot(userId);
    done=snap.done;notes=snap.notes;noteMeta=snap.noteMeta;questionMeta=snap.questionMeta;current=snap.current;
    localStorage.setItem(SCOPE_KEY,userId);
    saveLocal();
    return true;
  }
  function migrateLocal(){
    done=load(K_DONE,null);
    notes=load(K_NOTE,null);
    noteMeta=load(K_NOTE_META,{})||{};
    questionMeta=load(K_Q_META,{})||{};

    if(!done){
      done=load(LEGACY_DONE,{})||{};
      Object.values(done).forEach(v=>{if(v&&!v.updatedAt)v.updatedAt=v.ts?new Date(v.ts).toISOString():new Date().toISOString()});
    }
    if(!notes)notes=load(LEGACY_NOTE,{})||{};

    for(const [key,v] of Object.entries(done)){
      const at=v?.updatedAt||(v?.ts?new Date(v.ts).toISOString():new Date().toISOString());
      if(v&&!v.updatedAt)v.updatedAt=at;
      if(!questionMeta[key])questionMeta[key]=at;
    }
    for(const [id,value] of Object.entries(notes)){
      if(value&&!noteMeta[id])noteMeta[id]=new Date().toISOString();
    }
    saveLocal();
  }

  function isDone(rowId,q){return Boolean(done[qKey(rowId,q)])}
  function rowDone(row){return row.qs.length>0&&row.qs.every(q=>isDone(row.id,q))}
  function allRows(subject=current){
    const info=catalog?.subjects?.[subject];
    if(!info)return [];
    return (info.chapters||[]).flatMap(chapter=>(chapter.rows||[]).map(row=>({...row,chapter:chapter.name,subject})));
  }
  function allRowsAll(){return SUBJECTS.flatMap(subject=>allRows(subject))}
  function allQEntries(){
    const out=[];
    for(const subject of SUBJECTS)for(const row of allRows(subject))for(const q of row.qs)out.push({subject,rowId:row.id,q,key:qKey(row.id,q),cloudId:qCloudId(subject,row.id,q)});
    return out;
  }
  function entryByKey(){return new Map(allQEntries().map(x=>[x.key,x]))}
  function rowById(){return new Map(allRowsAll().map(r=>[r.id,r]))}
  function subjectStats(subject){const rows=allRows(subject);const total=rows.reduce((n,r)=>n+r.qs.length,0),completed=rows.reduce((n,r)=>n+r.qs.filter(q=>isDone(r.id,q)).length,0);return [completed,total]}
  function calcStreak(){
    const dates=[...new Set(Object.values(done).map(v=>v?.date).filter(Boolean))].sort().reverse();
    if(!dates.length)return 0;
    const now=new Date();now.setHours(0,0,0,0);
    const yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);
    let cursor=dates[0]===dateStr(now)?now:(dates[0]===dateStr(yesterday)?yesterday:null);
    if(!cursor)return 0;
    const set=new Set(dates);let count=0;
    while(set.has(dateStr(cursor))){count++;cursor.setDate(cursor.getDate()-1)}
    return count;
  }
  function updateStats(){
    if(!catalog)return;
    const entries=allQEntries(),total=entries.length,completed=entries.filter(x=>isDone(x.rowId,x.q)).length,percent=total?Math.round(completed/total*100):0,today=dateStr();
    $('[data-practice-done]').textContent=completed;
    $('[data-practice-total]').textContent=total;
    $('[data-practice-remain]').textContent=total-completed;
    $('[data-practice-percent]').textContent=percent+'%';
    $('[data-practice-today]').textContent=Object.values(done).filter(v=>v?.date===today).length;
    $('[data-practice-streak]').textContent=calcStreak()+' 天';
    $('[data-practice-progress-text]').textContent=`${completed} / ${total}`;
    $('[data-practice-progress-bar]').style.width=percent+'%';
    for(const subject of SUBJECTS){
      const [d,t]=subjectStats(subject),btn=$(`[data-practice-tab="${subject}"]`);
      if(btn)btn.querySelector('span').textContent=`${d}/${t}`;
    }
  }
  function setMessage(text,type=''){const el=$('[data-practice-message]');if(!el)return;el.textContent=text;el.className=`practice-message ${type}`}
  function resetPretty(select){
    const host=select?.closest('.pretty-select-host');
    if(host){host.parentNode.insertBefore(select,host);host.remove();delete select.dataset.prettyReady;select.classList.remove('pretty-select-native')}
    queueMicrotask(()=>window.EveraPrettySelect?.refresh?.());
  }
  function fillChapters(){
    const sel=$('[data-practice-chapter]');if(!sel||!catalog)return;
    const old=sel.value;resetPretty(sel);
    sel.innerHTML='<option value="">全部章节</option>'+catalog.subjects[current].chapters.map(c=>`<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
    if([...sel.options].some(o=>o.value===old))sel.value=old;
    window.EveraPrettySelect?.refresh?.();
  }
  function visibleRows(){
    const query=String($('[data-practice-search]')?.value||'').trim().toLowerCase();
    const chapter=$('[data-practice-chapter]')?.value||'';
    const status=$('[data-practice-status]')?.value||'';
    return allRows().filter(row=>{
      if(chapter&&row.chapter!==chapter)return false;
      const complete=rowDone(row),none=!row.qs.length;
      if(status==='todo'&&(none||complete))return false;
      if(status==='done'&&!complete)return false;
      if(status==='none'&&!none)return false;
      if(query&&!`${row.chapter} ${row.point} ${row.spec} ${notes[row.id]||''}`.toLowerCase().includes(query))return false;
      return true;
    });
  }
  function render(){
    if(!catalog)return;
    updateStats();
    $$('[data-practice-tab]').forEach(b=>b.classList.toggle('active',b.dataset.practiceTab===current));
    const root=$('[data-practice-list]'),rows=visibleRows();if(!root)return;
    if(!rows.length){root.innerHTML='<div class="practice-empty"><strong>没有匹配项目</strong><p>换一个章节、状态或搜索关键词。</p></div>';return}
    const by=new Map();
    for(const row of rows){if(!by.has(row.chapter))by.set(row.chapter,[]);by.get(row.chapter).push(row)}
    root.innerHTML=[...by.entries()].map(([chapter,chapterRows])=>{
      const total=chapterRows.reduce((n,r)=>n+r.qs.length,0),completed=chapterRows.reduce((n,r)=>n+r.qs.filter(q=>isDone(r.id,q)).length,0);
      return `<section class="practice-chapter"><header><div><span>CHAPTER</span><h3>${esc(chapter)}</h3></div><strong>${completed} / ${total}</strong></header><div class="practice-source-rows">${chapterRows.map(row=>{
        const complete=rowDone(row);
        const chips=row.qs.length?row.qs.map(q=>`<button type="button" class="practice-question-chip ${isDone(row.id,q)?'checked':''}" data-question-row="${esc(row.id)}" data-question-subject="${esc(row.subject)}" data-question-number="${q}" aria-pressed="${isDone(row.id,q)?'true':'false'}">第 ${q} 题</button>`).join(''):'<span class="practice-no-question">原表标注“/”：该考点未指定强化必刷题</span>';
        return `<div class="practice-source-row ${complete?'done ':''}${row.qs.length?'':'none'}"><div class="practice-point"><strong>${esc(row.point)}</strong><span>原表题号：${esc(row.spec)}</span></div><div class="practice-question-chips">${chips}</div><div class="practice-row-side">${row.qs.length?`<label class="practice-row-check" title="整行完成"><input type="checkbox" data-row-check="${esc(row.id)}" data-row-subject="${esc(row.subject)}" ${complete?'checked':''}><i></i><span>整行</span></label>`:''}<input class="practice-row-note" data-row-note="${esc(row.id)}" data-row-subject="${esc(row.subject)}" value="${esc(notes[row.id]||'')}" placeholder="错因 / 二刷日期 / 其他选项…"></div></div>`;
      }).join('')}</div></section>`;
    }).join('');
  }

  function touchQuestion(rowId,q,nowIso){questionMeta[qKey(rowId,q)]=nowIso}
  function setQ(subject,rowId,q,value){
    const key=qKey(rowId,q),now=new Date(),iso=now.toISOString();
    if(value)done[key]={date:dateStr(now),ts:now.getTime(),updatedAt:iso};else delete done[key];
    touchQuestion(rowId,q,iso);
    saveLocal();render();persistQuestion(subject,rowId,q);
  }
  function setRow(subject,rowId,value){
    const row=allRows(subject).find(r=>r.id===rowId);if(!row)return;
    const now=new Date(),iso=now.toISOString(),changed=[];
    for(const q of row.qs){
      const key=qKey(rowId,q);
      if(value)done[key]={date:dateStr(now),ts:now.getTime(),updatedAt:iso};else delete done[key];
      touchQuestion(rowId,q,iso);
      changed.push({subject,rowId,q});
    }
    saveLocal();render();syncQuestionEntries(changed);
  }

  async function waitCloud(){for(let i=0;i<80;i++){if(window.EveraCloud?.listPracticeStates)return window.EveraCloud;await new Promise(r=>setTimeout(r,80))}return null}
  async function pushQuestion(cloud,entry){
    const key=qKey(entry.rowId,entry.q),local=done[key],attempt=questionMeta[key]||local?.updatedAt||new Date().toISOString();
    const row=await cloud.savePracticeState({
      practice_id:PRACTICE_ID,
      item_id:qCloudId(entry.subject,entry.rowId,entry.q),
      subject:entry.subject,
      status:local?'done':'todo',
      first_done_at:local?.updatedAt||null,
      last_attempt_at:attempt
    });
    if(row?.updated_at)questionMeta[key]=row.updated_at;
    return row;
  }
  async function pushNote(cloud,row){
    const attempt=noteMeta[row.id]||new Date().toISOString();
    const saved=await cloud.savePracticeState({
      practice_id:PRACTICE_ID,
      item_id:noteCloudId(row.subject,row.id),
      subject:row.subject,
      status:'todo',
      note:notes[row.id]||'',
      last_attempt_at:attempt
    });
    if(saved?.updated_at)noteMeta[row.id]=saved.updated_at;
    return saved;
  }
  async function runWorkers(items,worker,limit=4){
    let cursor=0,ok=0,failed=0;
    const fn=async()=>{while(cursor<items.length){const item=items[cursor++];try{await worker(item);ok++}catch(e){failed++;console.warn('practice sync item failed',item,e)}}};
    await Promise.all(Array.from({length:Math.min(limit,Math.max(1,items.length))},fn));
    return {ok,failed};
  }
  async function syncQuestionEntries(entries,{silent=false}={}){
    const cloud=await waitCloud();if(!cloud||!entries.length)return {ok:0,failed:0};
    const user=await cloud.getUser?.();if(!user){if(!silent)setMessage('批量操作已保存本机；登录后可同步');return {ok:0,failed:0}}
    bindScope(user.id);
    if(!silent)setMessage(`本机已保存 · 正在同步 ${entries.length} 项…`);
    const result=await runWorkers(entries,e=>pushQuestion(cloud,e),4);
    saveLocal();
    if(!silent)setMessage(result.failed?`已同步 ${result.ok} 项，${result.failed} 项稍后重试`:'批量进度已同步云端',result.failed?'error':'success');
    return result;
  }
  async function persistQuestion(subject,rowId,q){
    const cloud=await waitCloud();if(!cloud)return;
    try{
      const user=await cloud.getUser?.();if(!user){setMessage('未登录 · 当前进度保存在本机');return}
      bindScope(user.id);
      await pushQuestion(cloud,{subject,rowId,q});
      saveLocal();
      setMessage('已保存本机并同步云端','success');
    }catch(e){console.warn('1800 question sync failed',e);setMessage('已保存本机；云同步稍后重试','error')}
  }
  async function persistNote(subject,rowId){
    const cloud=await waitCloud();if(!cloud)return;
    try{
      const user=await cloud.getUser?.();if(!user){setMessage('未登录 · 备注保存在本机');return}
      bindScope(user.id);
      const row=allRows(subject).find(r=>r.id===rowId);if(!row)return;
      await pushNote(cloud,row);saveLocal();setMessage('备注已同步','success');
    }catch(e){console.warn('1800 note sync failed',e);setMessage('备注已保存本机；云同步稍后重试','error')}
  }

  function applyRemoteQuestion(row){
    const m=row.item_id.match(/^q:(ds|co|os|cn):([^:]+):(\d+)$/);if(!m)return false;
    const subject=m[1],rowId=m[2],q=Number(m[3]),entry=allQEntries().find(x=>x.subject===subject&&x.rowId===rowId&&x.q===q);if(!entry)return false;
    const key=qKey(rowId,q),remoteAt=row.updated_at||'',localAt=questionMeta[key]||done[key]?.updatedAt||'';
    if(localAt&&timeMs(remoteAt)<=timeMs(localAt))return false;
    if(row.status&&row.status!=='todo')done[key]={date:dateStr(row.first_done_at||row.updated_at),ts:timeMs(row.updated_at),updatedAt:remoteAt};else delete done[key];
    questionMeta[key]=remoteAt;
    return true;
  }
  function applyRemoteNote(row){
    const m=row.item_id.match(/^note:(ds|co|os|cn):(.+)$/);if(!m)return false;
    const rowId=m[2],localAt=noteMeta[rowId]||'',remoteAt=row.updated_at||'';
    if(localAt&&timeMs(remoteAt)<=timeMs(localAt))return false;
    notes[rowId]=row.note||'';noteMeta[rowId]=remoteAt;return true;
  }
  async function mergeCloud(){
    if(syncRunning){syncAgain=true;return}
    syncRunning=true;
    try{
      const cloud=await waitCloud();if(!cloud)return;
      const user=await cloud.getUser?.();if(!user){setMessage('未登录 · 当前进度保存在本机');return}
      const switched=bindScope(user.id);
      if(switched){current=SUBJECTS.includes(current)?current:'ds';fillChapters();render();setMessage('已切换账户 · 正在载入该账户云端进度')}
      const rows=await cloud.listPracticeStates(PRACTICE_ID);
      const remote=new Map(rows.map(r=>[r.item_id,r]));
      let changed=false;
      for(const row of rows){
        if(row.item_id.startsWith('q:'))changed=applyRemoteQuestion(row)||changed;
        else if(row.item_id.startsWith('note:'))changed=applyRemoteNote(row)||changed;
      }
      if(changed){saveLocal();render()}

      const byKey=entryByKey(),byRow=rowById();
      const pendingQ=[];
      for(const [key,localAt] of Object.entries(questionMeta)){
        const entry=byKey.get(key);if(!entry)continue;
        const r=remote.get(entry.cloudId);
        if(!r||timeMs(localAt)>timeMs(r.updated_at))pendingQ.push(entry);
      }
      const pendingNotes=[];
      for(const [rowId,localAt] of Object.entries(noteMeta)){
        const row=byRow.get(rowId);if(!row)continue;
        const r=remote.get(noteCloudId(row.subject,rowId));
        if(!r||timeMs(localAt)>timeMs(r.updated_at))pendingNotes.push(row);
      }

      if(pendingQ.length||pendingNotes.length)setMessage(`正在补传本机较新的进度 · ${pendingQ.length+pendingNotes.length} 项`);
      const qResult=pendingQ.length?await runWorkers(pendingQ,e=>pushQuestion(cloud,e),4):{ok:0,failed:0};
      const nResult=pendingNotes.length?await runWorkers(pendingNotes,r=>pushNote(cloud,r),4):{ok:0,failed:0};
      saveLocal();render();
      const failed=qResult.failed+nResult.failed,pushed=qResult.ok+nResult.ok;
      setMessage(failed?`已合并；补传 ${pushed} 项，${failed} 项稍后重试`:(pushed?`已登录 · 已合并并补传 ${pushed} 项`:'已登录 · 本机与云端进度一致'),failed?'error':'success');
    }catch(e){console.warn('1800 cloud merge failed',e);setMessage('云端同步失败，本机记录仍可使用','error')}
    finally{syncRunning=false;if(syncAgain){syncAgain=false;scheduleSync(100)}}
  }
  function scheduleSync(delay=250){clearTimeout(syncTimer);syncTimer=setTimeout(()=>mergeCloud(),delay)}

  function markVisible(value){
    const changed=[],now=new Date(),iso=now.toISOString();
    for(const row of visibleRows())for(const q of row.qs){
      const key=qKey(row.id,q);
      if(value)done[key]={date:dateStr(now),ts:now.getTime(),updatedAt:iso};else delete done[key];
      touchQuestion(row.id,q,iso);
      changed.push({subject:row.subject,rowId:row.id,q});
    }
    saveLocal();render();syncQuestionEntries(changed);
  }
  function exportProgress(){
    const payload={version:3,practiceId:PRACTICE_ID,exportedAt:new Date().toISOString(),done,notes,noteMeta,questionMeta};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=`1800题强化必刷题_打卡进度_${dateStr()}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    window.EveraUI?.toast?.('1800题进度已导出',{type:'success'});
  }
  function importProgress(file){
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const x=JSON.parse(reader.result),now=new Date().toISOString();
        if(x.done&&typeof x.done==='object')done=x.done;
        if(x.notes&&typeof x.notes==='object')notes=x.notes;
        if(x.noteMeta&&typeof x.noteMeta==='object')noteMeta=x.noteMeta;
        if(x.questionMeta&&typeof x.questionMeta==='object')questionMeta=x.questionMeta;
        for(const [key,v] of Object.entries(done)){if(v&&!v.updatedAt)v.updatedAt=v.ts?new Date(v.ts).toISOString():now;if(!questionMeta[key])questionMeta[key]=v?.updatedAt||now}
        for(const [id,value] of Object.entries(notes)){if(value&&!noteMeta[id])noteMeta[id]=now}
        saveLocal();render();
        window.EveraUI?.toast?.('进度已导入；正在检查云同步',{type:'success'});
        scheduleSync(50);
      }catch(e){window.EveraUI?.toast?.(`导入失败：${e.message}`,{type:'error'})}
    };
    reader.readAsText(file);
    $('[data-practice-import-file]').value='';
  }

  async function boot(){
    migrateLocal();
    try{
      const response=await fetch(DATA_URL+'?t='+Date.now(),{cache:'no-store'});
      if(!response.ok)throw new Error('catalog_load_failed');
      catalog=await response.json();
      fillChapters();render();scheduleSync(50);
    }catch(e){
      console.error(e);
      $('[data-practice-list]').innerHTML='<div class="practice-empty"><strong>题单目录加载失败</strong><p>请稍后重新打开页面。</p></div>';
      setMessage('题单数据加载失败','error');
    }
  }

  document.addEventListener('click',event=>{
    const tab=event.target.closest('[data-practice-tab]');
    if(tab){
      current=tab.dataset.practiceTab;
      $('[data-practice-search]').value='';
      $('[data-practice-status]').value='';
      fillChapters();window.EveraPrettySelect?.refresh?.();render();saveLocal();return;
    }
    const chip=event.target.closest('[data-question-row]');
    if(chip){setQ(chip.dataset.questionSubject,chip.dataset.questionRow,Number(chip.dataset.questionNumber),chip.getAttribute('aria-pressed')!=='true');return}
    const mark=event.target.closest('[data-practice-mark]');
    if(mark){markVisible(mark.dataset.practiceMark==='done');return}
    if(event.target.closest('[data-practice-export]')){exportProgress();return}
    if(event.target.closest('[data-practice-import]')){$('[data-practice-import-file]').click()}
  });
  document.addEventListener('change',event=>{
    if(event.target.matches('[data-practice-chapter],[data-practice-status]'))render();
    if(event.target.matches('[data-row-check]'))setRow(event.target.dataset.rowSubject,event.target.dataset.rowCheck,event.target.checked);
    if(event.target.matches('[data-practice-import-file]'))importProgress(event.target.files?.[0]);
  });
  document.addEventListener('input',event=>{
    if(event.target.matches('[data-practice-search]'))render();
    if(event.target.matches('[data-row-note]')){
      const rowId=event.target.dataset.rowNote,subject=event.target.dataset.rowSubject,now=new Date().toISOString();
      notes[rowId]=event.target.value;noteMeta[rowId]=now;saveLocal();
      clearTimeout(event.target._saveTimer);
      event.target._saveTimer=setTimeout(()=>persistNote(subject,rowId),650);
    }
  });
  document.addEventListener('everflow:auth-change',event=>{if(event.detail?.user)scheduleSync(50)});
  window.addEventListener('online',()=>scheduleSync(120));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)scheduleSync(180)});

  boot();
})();