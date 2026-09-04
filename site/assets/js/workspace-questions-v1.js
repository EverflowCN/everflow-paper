(()=>{
  'use strict';
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const SUBJECT={ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络'};
  const YEARS=Array.from({length:18},(_,index)=>String(2026-index));
  const state={bank:'zhenti',year:'2026',rows:[],overrides:new Map(),selected:null,linkedTicket:null,loadedBank:'',loading:false};
  const toast=(message,type='success')=>window.EveraUI?.toast?.(message,{type})||console.log(message);
  const lineList=value=>String(value||'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  const setBusy=(button,on,label='处理中…')=>{if(!button)return;if(on){button.dataset.previousLabel=button.textContent;button.disabled=true;button.textContent=label}else{button.disabled=false;button.textContent=button.dataset.previousLabel||button.textContent;delete button.dataset.previousLabel}};
  async function cloud(){for(let count=0;count<100;count+=1){if(window.EveraAdminCloud?.questions)return window.EveraAdminCloud;await new Promise(resolve=>setTimeout(resolve,60))}throw new Error('题目管理服务加载超时')}
  function normalizeOptions(bank,value){
    if(bank==='relax1000')return Object.fromEntries((Array.isArray(value)?value:[]).map((item,index)=>[String(item?.key||'ABCD'[index]||''),String(item?.text||'')]));
    return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  }
  function originalFor(row){return row?.original||{}}
  function overrideFor(row){return state.overrides.get(row?.entityId)||null}
  function effectiveFor(row){return{...originalFor(row),...(overrideFor(row)?.patch||{})}}
  function setYearOptions(){
    const select=$('[data-question-year]');if(!select)return;
    select.innerHTML=YEARS.map(year=>`<option value="${year}" ${year===state.year?'selected':''}>${year} 年</option>`).join('');
  }
  async function loadOverrides(){
    const result=await(await cloud()).questions('list');
    state.overrides=new Map((result.overrides||[]).filter(row=>row.bank===state.bank&&row.enabled!==false).map(row=>[String(row.entity_id),row]));
  }
  async function loadSource(){
    if(state.bank==='relax1000'){
      const response=await fetch(`/data/relax1000/data/questions.json?v=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`Relax1000 HTTP ${response.status}`);
      const data=await response.json();
      state.rows=(data.questions||[]).map((question,index)=>({bank:'relax1000',entityId:String(question.id),number:question.number||question.bookNumber||index+1,subject:question.subject||SUBJECT[question.subjectId]||question.subjectId||'408',chapter:question.chapter||'',original:question}));
      return;
    }
    const response=await fetch(`/data/zhenti/${state.year}.json?v=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`${state.year} 真题 HTTP ${response.status}`);
    const paper=await response.json();
    state.rows=Object.entries(paper.questions||{}).map(([number,question])=>({bank:'zhenti',entityId:`${state.year}-${number}`,number:Number(question?.number||number),subject:SUBJECT[question?.subject]||question?.subject||'408',chapter:`${state.year} 年真题`,original:question})).sort((a,b)=>a.number-b.number);
  }
  function filteredRows(){
    const query=String($('[data-question-search]')?.value||'').trim().toLowerCase();
    if(!query)return state.rows;
    return state.rows.filter(row=>{const question=effectiveFor(row),options=normalizeOptions(row.bank,question.options);return`${row.entityId} ${row.number} ${row.subject} ${row.chapter} ${question.stem||''} ${Object.values(options).join(' ')}`.toLowerCase().includes(query)});
  }
  function renderList(){
    const rows=filteredRows(),root=$('[data-question-list]');if(!root)return;
    $('[data-question-count]').textContent=`${state.rows.length} 题 · ${state.overrides.size} 已修改`;
    $('[data-question-list-note]').textContent=`当前显示 ${rows.length} / ${state.rows.length} 题，绿点表示已发布修正`;
    root.innerHTML=rows.map(row=>{const question=effectiveFor(row),selected=state.selected?.entityId===row.entityId,edited=state.overrides.has(row.entityId),stem=String(question.stem||'').replace(/\s+/g,' ').slice(0,66)||'题干暂缺';return`<button class="question-admin-item ${selected?'active':''}" type="button" data-question-open="${esc(row.entityId)}"><span>${esc(row.bank==='zhenti'?`Q${row.number}`:String(row.number))}</span><div><strong>${esc(stem)}</strong><small>${esc(row.subject)}${row.chapter?` · ${esc(row.chapter)}`:''}</small></div><i class="${edited?'edited':''}" title="${edited?'已修改':'原始版本'}"></i></button>`}).join('')||'<div class="quality-empty">当前筛选没有题目</div>';
  }
  function figuresToText(figures){return(Array.isArray(figures)?figures:[]).map(figure=>[figure?.src,figure?.caption||figure?.alt,figure?.option].filter(Boolean).join('｜')).join('\n')}
  function parseFigures(value){return lineList(value).map(line=>{const [src,description,option]=line.split(/[｜|]/).map(item=>item.trim()),figure={src};if(description){figure.alt=description;figure.caption=description}if(/^[A-D]$/i.test(option||''))figure.option=option.toUpperCase();return figure}).filter(figure=>figure.src)}
  function frontUrl(row){
    if(state.linkedTicket?.page_path)return state.linkedTicket.page_path;
    return row.bank==='relax1000'?`/zhenti/relax-reader/?id=${encodeURIComponent(row.entityId)}`:`/zhenti/?year=${state.year}&q=${row.number}`;
  }
  async function renderHistory(row){
    const root=$('[data-question-history]');if(!root)return;root.innerHTML='<div class="quality-empty">正在读取版本记录…</div>';
    try{const result=await(await cloud()).questions('history',{bank:row.bank,entityId:row.entityId}),history=result.history||[];root.innerHTML=history.length?`<div class="question-history-list">${history.map(item=>`<div class="question-history-row"><strong>版本 ${item.revision} · ${item.action==='restore'?'恢复原版':'保存修正'}</strong><small>${new Date(item.created_at).toLocaleString('zh-CN')} · ${Object.keys(item.patch||{}).join(' / ')}</small></div>`).join('')}</div>`:'<div class="quality-empty">尚无修改记录</div>'}catch(error){root.innerHTML=`<div class="quality-empty">版本记录读取失败：${esc(error.message||error)}</div>`}
  }
  function openRow(row,{ticket=null}={}){
    if(!row)return;state.selected=row;if(ticket)state.linkedTicket=ticket;
    const question=effectiveFor(row),options=normalizeOptions(row.bank,question.options),isRelax=row.bank==='relax1000';
    $('[data-question-editor-empty]').hidden=true;$('[data-question-editor]').hidden=false;
    $('[data-question-editor-bank]').textContent=isRelax?'RELAX1000':'408 ZHENTI';
    $('[data-question-editor-title]').textContent=isRelax?`Relax1000 · ${row.entityId}`:`${state.year} 年 · 第 ${row.number} 题`;
    $('[data-question-editor-meta]').textContent=`${row.subject}${row.chapter?` · ${row.chapter}`:''}${state.overrides.has(row.entityId)?' · 已发布修正':''}`;
    $('[data-question-stem]').value=question.stem||'';
    for(const key of 'ABCD')$(`[data-question-option="${key}"]`).value=options[key]||'';
    $('[data-question-answer]').value=question.answer||'';
    $('[data-question-analysis]').value=isRelax?question.explanation||'':question.analysis||'';
    $('[data-question-analysis-label]').textContent=isRelax?'解析':'解析 / 参考答案说明';
    $('[data-question-subject-wrap]').hidden=isRelax;
    if(!isRelax)$('[data-question-subject]').value=question.subject||row.original.subject||'ds';
    $('[data-question-figure-wrap]').hidden=isRelax;$('[data-question-relax-images]').hidden=!isRelax;
    const uploadTarget=$('[data-question-upload-target]'),explanationTarget=uploadTarget?.querySelector('option[value="explanation"]');if(explanationTarget)explanationTarget.hidden=!isRelax;if(uploadTarget&&!isRelax)uploadTarget.value='question';
    $('[data-question-figures]').value=figuresToText(question.figures);
    $('[data-question-images]').value=(question.questionImages||[]).join('\n');
    $('[data-question-explanation-images]').value=(question.explanationImages||[]).join('\n');
    $('[data-question-front]').href=frontUrl(row);
    const feedback=$('[data-question-feedback]'),resolution=$('[data-question-resolution-wrap]'),resolveButton=$('[data-question-save-resolve]');
    const linked=Boolean(state.linkedTicket&&state.linkedTicket.entity_id===row.entityId);
    feedback.hidden=!linked;resolution.hidden=!linked;resolveButton.hidden=!linked;
    if(linked){$('[data-question-feedback-description]').textContent=state.linkedTicket.description||'未填写反馈说明';$('[data-question-feedback-user]').textContent=`${state.linkedTicket.reporterEmail||'用户已删除'} · ${state.linkedTicket.category||'题目反馈'}`;$('[data-question-resolution-note]').value=state.linkedTicket.resolution_note||'已修正题目内容。'}
    $('[data-question-save-state]').textContent=state.overrides.has(row.entityId)?`当前版本 ${state.overrides.get(row.entityId).revision}`:'当前为原始版本';
    renderList();renderHistory(row);
    requestAnimationFrame(()=>$('[data-question-editor-card]')?.scrollIntoView?.({block:'start',behavior:'smooth'}));
  }
  function collectPatch(){
    const isRelax=state.selected.bank==='relax1000',optionObject=Object.fromEntries([...document.querySelectorAll('[data-question-option]')].map(input=>[input.dataset.questionOption,input.value.trim()]));
    const patch={stem:$('[data-question-stem]').value.trim(),answer:$('[data-question-answer]').value.trim()};
    patch.options=isRelax?Object.entries(optionObject).map(([key,text])=>({key,text})):optionObject;
    if(isRelax){patch.explanation=$('[data-question-analysis]').value.trim();patch.questionImages=lineList($('[data-question-images]').value);patch.explanationImages=lineList($('[data-question-explanation-images]').value)}
    else{patch.analysis=$('[data-question-analysis]').value.trim();patch.subject=$('[data-question-subject]').value;patch.figures=parseFigures($('[data-question-figures]').value);patch.type=state.selected.original.type||'single'}
    return patch;
  }
  function validatePatch(patch){
    if(!patch.stem)return'题干不能为空。';
    const options=normalizeOptions(state.selected.bank,patch.options),hasOptions=Object.values(options).some(Boolean);
    if(hasOptions&&Object.values(options).filter(Boolean).length<2)return'选择题至少需要两个选项。';
    if(!patch.answer)return'答案不能为空。';
    return'';
  }
  async function save({resolveTicket=false,button=null}={}){
    if(!state.selected)return;
    const patch=collectPatch(),problem=validatePatch(patch);if(problem){toast(problem,'error');return}
    const note=String($('[data-question-resolution-note]')?.value||'').trim();
    if(resolveTicket&&!note){toast('请填写工单处理结论，用户会看到这段说明。','error');return}
    setBusy(button,true,resolveTicket?'保存并解决中…':'保存中…');
    try{
      const api=await cloud(),result=await api.questions('save',{bank:state.selected.bank,entityId:state.selected.entityId,patch});
      state.overrides.set(state.selected.entityId,result.override);
      window.EveraQuestionOverrides?.clearQuestionOverrideCache?.(state.selected.bank);
      if(resolveTicket&&state.linkedTicket){
        await api.feedback('update',{id:state.linkedTicket.id,status:'resolved',priority:state.linkedTicket.priority||'normal',resolutionNote:note});
        state.linkedTicket=null;document.dispatchEvent(new CustomEvent('everflow:feedback-changed'));
        toast('题目已发布，工单已解决；反馈用户下次访问时只提示一次。');
      }else toast('题目修改已发布，前台将立即读取新版本。');
      openRow(state.selected);renderList();
    }catch(error){toast(error.message||'题目保存失败','error')}finally{setBusy(button,false)}
  }
  async function restore(button){
    if(!state.selected||!state.overrides.has(state.selected.entityId)){toast('当前已经是原始版本。');return}
    if(!confirm('确定恢复为题库原始内容？本次恢复仍会写入版本记录。'))return;
    setBusy(button,true,'恢复中…');
    try{await(await cloud()).questions('restore',{bank:state.selected.bank,entityId:state.selected.entityId});state.overrides.delete(state.selected.entityId);window.EveraQuestionOverrides?.clearQuestionOverrideCache?.(state.selected.bank);toast('已恢复原始题目内容。');openRow(state.selected);renderList()}catch(error){toast(error.message||'恢复失败','error')}finally{setBusy(button,false)}
  }
  function readFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('图片读取失败'));reader.readAsDataURL(file)})}
  async function upload(button){
    if(!state.selected)return;const file=$('[data-question-upload-file]').files?.[0];if(!file){toast('请先选择图片。','error');return}if(file.size>4194304){toast('图片不能超过 4 MB。','error');return}
    setBusy(button,true,'上传中…');
    try{const base64=await readFile(file),result=await(await cloud()).questions('upload-image',{bank:state.selected.bank,entityId:state.selected.entityId,contentType:file.type,base64}),target=$('[data-question-upload-target]').value;
      if(state.selected.bank==='zhenti')$('[data-question-figures]').value=[$('[data-question-figures]').value,result.url].filter(Boolean).join('\n');
      else{const field=target==='explanation'?$('[data-question-explanation-images]'):$('[data-question-images]');field.value=[field.value,result.url].filter(Boolean).join('\n')}
      $('[data-question-upload-file]').value='';toast('图片已上传，请保存题目使其生效。')
    }catch(error){toast(error.message||'图片上传失败','error')}finally{setBusy(button,false)}
  }
  async function load({force=false,selectId='',ticket=null}={}){
    if(state.loading)return;state.loading=true;$('[data-question-list]').innerHTML='<div class="quality-empty">正在读取题库…</div>';
    try{await Promise.all([loadOverrides(),loadSource()]);state.loadedBank=`${state.bank}:${state.year}`;renderList();const row=state.rows.find(item=>item.entityId===selectId)||state.rows.find(item=>item.entityId===state.selected?.entityId);if(row)openRow(row,{ticket})}catch(error){toast(error.message||'题库读取失败','error');$('[data-question-list]').innerHTML=`<div class="quality-empty">读取失败：${esc(error.message||error)}</div>`}finally{state.loading=false}
  }
  async function changeScope(){state.bank=$('[data-question-bank]').value;state.year=$('[data-question-year]').value||state.year;state.selected=null;state.linkedTicket=null;$('[data-question-editor]').hidden=true;$('[data-question-editor-empty]').hidden=false;$('[data-question-year-wrap]').hidden=state.bank!=='zhenti';await load({force:true})}
  async function openTicket(ticket){
    if(!ticket?.entity_id||!['zhenti','relax1000'].includes(ticket.bank))return;
    state.bank=ticket.bank;$('[data-question-bank]').value=state.bank;
    if(state.bank==='zhenti'){state.year=String(ticket.entity_id).split('-')[0];$('[data-question-year]').value=state.year}
    $('[data-question-year-wrap]').hidden=state.bank!=='zhenti';$('[data-question-search]').value='';
    state.loadedBank=`${state.bank}:${state.year}`;$('[data-ws-nav="questions"]')?.click();
    await load({force:true,selectId:String(ticket.entity_id),ticket});
    if(!state.selected)toast('工单对应的题目未在题库中找到。','error');
  }

  setYearOptions();$('[data-question-year-wrap]').hidden=false;
  $('[data-ws-nav="questions"]')?.addEventListener('click',()=>{const key=`${$('[data-question-bank]').value}:${$('[data-question-year]').value}`;if(state.loadedBank!==key)changeScope()});
  $('[data-question-bank]')?.addEventListener('change',changeScope);$('[data-question-year]')?.addEventListener('change',changeScope);$('[data-question-search]')?.addEventListener('input',renderList);
  $('[data-question-reload]')?.addEventListener('click',event=>{state.loadedBank='';load({force:true});toast('正在刷新题库。');event.currentTarget.blur()});
  $('[data-question-editor]')?.addEventListener('submit',event=>{event.preventDefault();save({button:$('[data-question-save]')})});
  $('[data-question-save-resolve]')?.addEventListener('click',event=>save({resolveTicket:true,button:event.currentTarget}));
  $('[data-question-restore]')?.addEventListener('click',event=>restore(event.currentTarget));$('[data-question-upload]')?.addEventListener('click',event=>upload(event.currentTarget));
  document.addEventListener('click',event=>{const button=event.target.closest('[data-question-open]');if(!button)return;const row=state.rows.find(item=>item.entityId===button.dataset.questionOpen);if(row){state.linkedTicket=null;openRow(row)}});
  document.addEventListener('everflow:open-question-editor',event=>openTicket(event.detail?.ticket));
  if(location.hash==='#questions')changeScope();
})();
