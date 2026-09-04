(()=>{
  'use strict';

  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const SUBJECT={ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络'};
  const SUBJECT_CODE=Object.fromEntries(Object.entries(SUBJECT).map(([key,value])=>[value,key]));
  const YEARS=Array.from({length:18},(_,index)=>String(2026-index));
  const FIELD_NAMES={stem:'题干',A:'选项 A',B:'选项 B',C:'选项 C',D:'选项 D',answer:'答案',subject:'科目',analysis:'解析',explanation:'解析',figures:'题图',questionImages:'题目图片',explanationImages:'解析图片'};
  const state={bank:'zhenti',year:'2026',rows:[],overrides:new Map(),drafts:new Map(),ticketsByEntity:new Map(),selected:null,linkedTicket:null,loadedBank:'',loading:false,dirty:false,loadedDraft:false,baseline:'',history:[],tab:'edit',renderFrame:0};
  const toast=(message,type='success')=>window.EveraUI?.toast?.(message,{type})||console.log(message);
  const lineList=value=>String(value||'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  const setBusy=(button,on,label='处理中…')=>{if(!button)return;if(on){button.dataset.previousLabel=button.textContent;button.disabled=true;button.textContent=label}else{button.disabled=false;button.textContent=button.dataset.previousLabel||button.textContent;delete button.dataset.previousLabel}};

  async function cloud(){
    for(let count=0;count<100;count+=1){if(window.EveraAdminCloud?.questions)return window.EveraAdminCloud;await new Promise(resolve=>setTimeout(resolve,60))}
    throw new Error('题目管理服务加载超时');
  }
  function normalizeOptions(bank,value){
    if(bank==='relax1000')return Object.fromEntries((Array.isArray(value)?value:[]).map((item,index)=>[String(item?.key||'ABCD'[index]||''),String(item?.text||'')]));
    return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  }
  function originalFor(row){return row?.original||{}}
  function overrideFor(row){return state.overrides.get(row?.entityId)||null}
  function effectiveFor(row){return{...originalFor(row),...(overrideFor(row)?.patch||{})}}
  function draftKey(row){return`everflow-question-draft-v2:${row.bank}:${row.entityId}`}
  function draftFor(row){const key=draftKey(row);if(state.drafts.has(key))return state.drafts.get(key);try{const value=JSON.parse(localStorage.getItem(key)||'null'),draft=value?.patch&&typeof value.patch==='object'?value:null;state.drafts.set(key,draft);return draft}catch{state.drafts.set(key,null);return null}}
  function removeDraft(row){const key=draftKey(row);state.drafts.set(key,null);try{localStorage.removeItem(key)}catch{}}
  function tickets(){return(window.EveraWorkspaceData?.quality?.tickets||[]).filter(ticket=>!['resolved','dismissed'].includes(ticket.status))}
  function refreshTicketIndex(){state.ticketsByEntity=new Map();for(const ticket of tickets()){const key=`${ticket.bank}:${ticket.entity_id}`,rows=state.ticketsByEntity.get(key)||[];rows.push(ticket);state.ticketsByEntity.set(key,rows)}}
  function ticketsFor(row){return state.ticketsByEntity.get(`${row.bank}:${row.entityId}`)||[]}
  function rowSubjectCode(row,question=effectiveFor(row)){return question.subject&&SUBJECT[question.subject]?question.subject:(SUBJECT_CODE[row.subject]||row.original?.subjectId||'')}
  function figuresToText(figures){return(Array.isArray(figures)?figures:[]).map(figure=>[figure?.src,figure?.caption||figure?.alt,figure?.option].filter(Boolean).join('｜')).join('\n')}
  function parseFigures(value){return lineList(value).map(line=>{const [src,description,option]=line.split(/[｜|]/).map(item=>item.trim()),figure={src};if(description){figure.alt=description;figure.caption=description}if(/^[A-D]$/i.test(option||''))figure.option=option.toUpperCase();return figure}).filter(figure=>figure.src)}

  function inspectPatch(patch,bank=state.selected?.bank||state.bank){
    const errors=[],warnings=[],options=normalizeOptions(bank,patch.options),optionKeys=Object.entries(options).filter(([,text])=>String(text||'').trim()).map(([key])=>key.toUpperCase());
    if(!String(patch.stem||'').trim())errors.push('题干不能为空');
    const expectsOptions=bank==='relax1000'||patch.type!=='comprehensive';
    if(expectsOptions&&optionKeys.length<2)errors.push('选择题至少需要两个有效选项');
    if(!String(patch.answer||'').trim())errors.push('答案不能为空');
    const answer=String(patch.answer||'').trim().toUpperCase();
    if(optionKeys.length>=2&&/^[A-D]+$/.test(answer)){
      const missing=[...new Set(answer)].filter(key=>!optionKeys.includes(key));
      if(missing.length)errors.push(`答案 ${missing.join('、')} 没有对应选项`);
    }
    const analysis=String(bank==='relax1000'?patch.explanation:patch.analysis||'').trim();
    if(!analysis)warnings.push('尚未填写解析');
    const imageCount=bank==='relax1000'?(patch.questionImages||[]).length+(patch.explanationImages||[]).length:(patch.figures||[]).length;
    if(/[如见由下上右左]?图(?:中|所示|可知)?/.test(String(patch.stem||''))&&!imageCount)warnings.push('题干提到了图，但没有配置题图');
    return{errors,warnings,ok:errors.length===0};
  }
  function rowPatchForInspection(row){return draftFor(row)?.patch||effectiveFor(row)}
  function hasIssues(row){return!inspectPatch(rowPatchForInspection(row),row.bank).ok}

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
    const query=String($('[data-question-search]')?.value||'').trim().toLowerCase(),subject=$('[data-question-subject-filter]')?.value||'all',status=$('[data-question-status-filter]')?.value||'all';
    return state.rows.filter(row=>{
      const question=rowPatchForInspection(row),options=normalizeOptions(row.bank,question.options),matchesQuery=!query||`${row.entityId} ${row.number} ${row.subject} ${row.chapter} ${question.stem||''} ${Object.values(options).join(' ')}`.toLowerCase().includes(query);
      const matchesSubject=subject==='all'||rowSubjectCode(row,question)===subject;
      const published=state.overrides.has(row.entityId),draft=Boolean(draftFor(row)),feedback=ticketsFor(row).length>0;
      const matchesStatus=status==='all'||(status==='published'&&published)||(status==='draft'&&draft)||(status==='issues'&&hasIssues(row))||(status==='feedback'&&feedback)||(status==='original'&&!published&&!draft);
      return matchesQuery&&matchesSubject&&matchesStatus;
    });
  }
  function renderSummary(){
    const drafts=state.rows.filter(row=>draftFor(row)).length,issues=state.rows.filter(hasIssues).length,feedback=state.rows.reduce((count,row)=>count+ticketsFor(row).length,0),values={'[data-question-total]':state.rows.length,'[data-question-published]':state.overrides.size,'[data-question-drafts]':drafts,'[data-question-issues]':issues,'[data-question-feedback-count]':feedback};
    for(const [selector,value] of Object.entries(values)){const node=$(selector);if(node)node.textContent=String(value)}document.dispatchEvent(new CustomEvent('everflow:question-workbench-summary',{detail:{drafts,issues,feedback}}));
  }
  function renderList(){
    const rows=filteredRows(),root=$('[data-question-list]');if(!root)return;$('[data-question-count]').textContent=String(rows.length);$('[data-question-list-note]').textContent=`显示 ${rows.length} / ${state.rows.length} 题；状态可组合搜索`;
    root.innerHTML=rows.map(row=>{
      const question=rowPatchForInspection(row),selected=state.selected?.entityId===row.entityId,published=state.overrides.has(row.entityId),draft=Boolean(draftFor(row)),issue=hasIssues(row),feedback=ticketsFor(row).length,stem=String(question.stem||'').replace(/\s+/g,' ').slice(0,64)||'题干暂缺';
      const badges=[published?'<i class="question-list-status published">已发布</i>':'<i class="question-list-status">原始</i>',draft?'<i class="question-list-status draft">草稿</i>':'',issue?'<i class="question-list-status issue">待检查</i>':'',feedback?`<i class="question-list-status feedback">${feedback} 工单</i>`:''].join('');
      return`<button class="question-admin-item ${selected?'active':''}" type="button" data-question-open="${esc(row.entityId)}"><span>${esc(row.bank==='zhenti'?`Q${row.number}`:String(row.number))}</span><div><strong>${esc(stem)}</strong><small>${esc(row.subject)}${row.chapter?` · ${esc(row.chapter)}`:''}</small><small class="question-admin-item-footer">${badges}</small></div></button>`;
    }).join('')||'<div class="quality-empty">当前筛选没有题目</div>';renderSummary();
  }

  function frontUrl(row){if(state.linkedTicket?.page_path)return state.linkedTicket.page_path;return row.bank==='relax1000'?`/zhenti/relax-reader/?id=${encodeURIComponent(row.entityId)}`:`/zhenti/?year=${state.year}&q=${row.number}`}
  function fillForm(question,row){
    const options=normalizeOptions(row.bank,question.options),isRelax=row.bank==='relax1000';$('[data-question-stem]').value=question.stem||'';for(const key of 'ABCD')$(`[data-question-option="${key}"]`).value=options[key]||'';$('[data-question-answer]').value=question.answer||'';$('[data-question-analysis]').value=isRelax?question.explanation||'':question.analysis||'';$('[data-question-analysis-label]').textContent=isRelax?'解析':'解析 / 参考答案说明';$('[data-question-subject-wrap]').hidden=isRelax;if(!isRelax)$('[data-question-subject]').value=question.subject||row.original.subject||'ds';$('[data-question-figure-wrap]').hidden=isRelax;$('[data-question-relax-images]').hidden=!isRelax;
    const uploadTarget=$('[data-question-upload-target]'),explanationTarget=uploadTarget?.querySelector('option[value="explanation"]');if(explanationTarget)explanationTarget.hidden=!isRelax;if(uploadTarget&&!isRelax)uploadTarget.value='question';$('[data-question-figures]').value=figuresToText(question.figures);$('[data-question-images]').value=(question.questionImages||[]).join('\n');$('[data-question-explanation-images]').value=(question.explanationImages||[]).join('\n');
  }
  function collectPatch(){
    const isRelax=state.selected?.bank==='relax1000',optionObject=Object.fromEntries($$('[data-question-option]').map(input=>[input.dataset.questionOption,input.value.trim()])),patch={stem:$('[data-question-stem]').value.trim(),answer:$('[data-question-answer]').value.trim()};patch.options=isRelax?Object.entries(optionObject).map(([key,text])=>({key,text})):optionObject;
    if(isRelax){patch.explanation=$('[data-question-analysis]').value.trim();patch.questionImages=lineList($('[data-question-images]').value);patch.explanationImages=lineList($('[data-question-explanation-images]').value)}else{patch.analysis=$('[data-question-analysis]').value.trim();patch.subject=$('[data-question-subject]').value;patch.figures=parseFigures($('[data-question-figures]').value);patch.type=state.selected?.original?.type||'single'}return patch;
  }
  function serializedPatch(patch=collectPatch()){return JSON.stringify(patch)}
  function changedFields(base,current,bank){
    const baseOptions=normalizeOptions(bank,base.options),currentOptions=normalizeOptions(bank,current.options),rows=[],add=(key,before,after)=>{const left=typeof before==='string'?before:JSON.stringify(before??'',null,2),right=typeof after==='string'?after:JSON.stringify(after??'',null,2);if(left!==right)rows.push({key,label:FIELD_NAMES[key]||key,before:left,after:right})};add('stem',base.stem||'',current.stem||'');for(const key of 'ABCD')add(key,baseOptions[key]||'',currentOptions[key]||'');add('answer',base.answer||'',current.answer||'');
    if(bank==='relax1000'){add('explanation',base.explanation||'',current.explanation||'');add('questionImages',base.questionImages||[],current.questionImages||[]);add('explanationImages',base.explanationImages||[],current.explanationImages||[])}else{add('subject',base.subject||'',current.subject||'');add('analysis',base.analysis||'',current.analysis||'');add('figures',base.figures||[],current.figures||[])}return rows;
  }
  function safeImageUrl(value){const src=String(value||'').trim();if(!src)return'';if(/^\/(?:data\/|question-images\/|explanations\/|assets\/)/.test(src)||/^data:image\/(?:png|jpeg|webp|gif);/i.test(src))return src;const base=String(window.EVERFLOW_CLOUD?.url||'').replace(/\/$/,'');return base&&src.startsWith(`${base}/storage/v1/object/public/question-assets/`)?src:''}
  function fallbackRichText(value){let text=String(value||'').replace(/\r\n?/g,'\n').trim();text=text.replace(/([：:；;。？！?])[ \t]*(（\d{1,2}）)/g,'$1\n$2').replace(/([：:；;。？！?])[ \t]*((?:IV|IX|V?I{1,3}|X)[.．、])/g,'$1\n$2');return text.split(/\n{2,}/).map(block=>`<p>${block.split('\n').map(line=>`<span class="question-text-line">${esc(line)}</span>`).join('')}</p>`).join('')}
  function richText(value){return window.EveraQuestionContent?.richText?.(value)||fallbackRichText(value)}
  function renderPreview(){
    const root=$('[data-question-preview]');if(!root||!state.selected)return;const patch=collectPatch(),options=normalizeOptions(state.selected.bank,patch.options),isRelax=state.selected.bank==='relax1000',images=isRelax?[...(patch.questionImages||[]),...(patch.explanationImages||[])]:patch.figures||[],analysis=isRelax?patch.explanation:patch.analysis;
    root.innerHTML=`<div class="question-preview-header"><span>${esc(isRelax?'Relax1000':`${state.year} 年真题`)} · ${esc(state.selected.subject)}</span><b>${esc(state.selected.entityId)}</b></div><div class="question-preview-stem">${richText(patch.stem)||'<div class="question-preview-empty">尚未填写题干</div>'}</div>${images.length?`<div class="question-preview-images">${images.map(item=>{const src=safeImageUrl(typeof item==='string'?item:item?.src);return src?`<img src="${esc(src)}" alt="${esc(typeof item==='string'?'题图':item?.alt||item?.caption||'题图')}" loading="lazy">`:''}).join('')}</div>`:''}<div class="question-preview-options">${Object.entries(options).filter(([,text])=>String(text||'').trim()).map(([key,text])=>`<div class="question-preview-option"><b>${esc(key)}</b><div>${richText(text)}</div></div>`).join('')}</div><div class="question-preview-answer"><strong>答案：</strong>${esc(patch.answer||'尚未填写')}</div>${analysis?`<div class="question-preview-analysis"><strong>解析</strong>${richText(analysis)}</div>`:''}`;
  }
  function renderCompare(){
    const root=$('[data-question-compare]');if(!root||!state.selected)return;const rows=changedFields(originalFor(state.selected),collectPatch(),state.selected.bank);$('[data-question-change-count]').textContent=String(rows.length);root.innerHTML=rows.length?`<div class="question-compare-summary">共修改 ${rows.length} 个字段；左侧为题库原文，右侧为准备发布的内容。</div>${rows.map(row=>`<section class="question-diff-row"><header>${esc(row.label)}</header><div class="question-diff-columns"><div class="question-diff-column before"><span>题库原文</span><pre>${esc(row.before||'（空）')}</pre></div><div class="question-diff-column after"><span>当前编辑</span><pre>${esc(row.after||'（空）')}</pre></div></div></section>`).join('')}`:'<div class="question-diff-empty"><div><strong>没有检测到修改</strong><small>当前内容与题库原文一致。</small></div></div>';
  }
  function renderValidation({reveal=false}={}){
    if(!state.selected)return{errors:[],warnings:[],ok:false};const result=inspectPatch(collectPatch(),state.selected.bank),root=$('[data-question-validation]');if(!root)return result;if(!reveal){root.hidden=true;return result}root.hidden=false;root.classList.toggle('bad',!result.ok);const items=[...result.errors.map(text=>`<li>${esc(text)}</li>`),...result.warnings.map(text=>`<li>提醒：${esc(text)}</li>`)];root.innerHTML=`<strong>${result.ok?'结构检查通过，可以发布':'发现必须修正的问题'}</strong>${items.length?`<ul>${items.join('')}</ul>`:'<span>题干、选项与答案结构正常。</span>'}`;return result;
  }
  function scheduleRender(){cancelAnimationFrame(state.renderFrame);state.renderFrame=requestAnimationFrame(()=>{if(state.tab==='preview')renderPreview();else if(state.tab==='compare')renderCompare();else if(state.selected)$('[data-question-change-count]').textContent=String(changedFields(originalFor(state.selected),collectPatch(),state.selected.bank).length)})}
  function workflowState(){if(state.dirty)return{label:'有未保存修改',className:'dirty'};if(state.loadedDraft)return{label:'本机草稿',className:'draft'};if(state.selected&&state.overrides.has(state.selected.entityId))return{label:`已发布 v${state.overrides.get(state.selected.entityId).revision}`,className:'published'};return{label:'原始版本',className:''}}
  function updateEditorState(){if(!state.selected)return;const flow=workflowState(),pill=$('[data-question-workflow]');pill.textContent=flow.label;pill.className=`question-workflow-pill ${flow.className}`.trim();$('[data-question-save-state]').textContent=state.dirty?'有尚未保存的修改':state.loadedDraft?'本机草稿已保存；尚未影响前台':state.overrides.has(state.selected.entityId)?`线上版本 ${state.overrides.get(state.selected.entityId).revision}`:'当前使用题库原文';$('[data-question-clear-draft]').hidden=!state.loadedDraft;$('[data-question-stem-count]').textContent=`${$('[data-question-stem]').value.length} 字`;$('[data-question-analysis-count]').textContent=`${$('[data-question-analysis]').value.length} 字`}
  function editorChanged(){if(!state.selected)return;state.dirty=serializedPatch()!==state.baseline;updateEditorState();renderValidation();scheduleRender()}
  function switchTab(name){if(!['edit','preview','compare','history'].includes(name))name='edit';state.tab=name;$$('[data-question-tab]').forEach(button=>button.classList.toggle('active',button.dataset.questionTab===name));$$('[data-question-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.questionPane===name));if(name==='preview')renderPreview();if(name==='compare')renderCompare()}
  async function renderHistory(row){
    const root=$('[data-question-history]');if(!root)return;root.innerHTML='<div class="quality-empty">正在读取版本记录…</div>';
    try{const result=await(await cloud()).questions('history',{bank:row.bank,entityId:row.entityId});if(state.selected?.entityId!==row.entityId)return;state.history=result.history||[];root.innerHTML=state.history.length?`<div class="question-history-list">${state.history.map(item=>`<div class="question-history-row"><div><strong>版本 ${item.revision} · ${item.action==='restore'?'恢复题库原文':'发布修正'}</strong><small>${new Date(item.created_at).toLocaleString('zh-CN')} · ${Object.keys(item.patch||{}).map(key=>FIELD_NAMES[key]||key).join(' / ')}</small></div>${item.action==='save'?`<button class="ws-btn" type="button" data-question-restore-revision="${item.revision}">恢复此版本</button>`:''}</div>`).join('')}</div>`:'<div class="quality-empty">尚无发布记录</div>'}catch(error){root.innerHTML=`<div class="quality-empty">版本记录读取失败：${esc(error.message||error)}</div>`}
  }
  function confirmLeaveCurrent(nextRow){return!state.dirty||state.selected?.entityId===nextRow?.entityId||confirm('当前题目有未保存修改。继续切换将丢失这些修改，是否继续？')}
  function openRow(row,{ticket=null,force=false}={}){
    if(!row||(!force&&!confirmLeaveCurrent(row)))return;state.selected=row;if(ticket)state.linkedTicket=ticket;else if(state.linkedTicket?.entity_id!==row.entityId)state.linkedTicket=null;const localDraft=draftFor(row),question=localDraft?.patch||effectiveFor(row),isRelax=row.bank==='relax1000';state.loadedDraft=Boolean(localDraft);state.dirty=false;$('[data-question-editor-empty]').hidden=true;$('[data-question-editor]').hidden=false;$('[data-question-editor-bank]').textContent=isRelax?'RELAX1000':'408 ZHENTI';$('[data-question-editor-title]').textContent=isRelax?`Relax1000 · ${row.entityId}`:`${state.year} 年 · 第 ${row.number} 题`;$('[data-question-editor-meta]').textContent=`${row.subject}${row.chapter?` · ${row.chapter}`:''}${localDraft?` · 草稿保存于 ${new Date(localDraft.savedAt).toLocaleString('zh-CN')}`:''}`;fillForm(question,row);state.baseline=serializedPatch();$('[data-question-front]').href=frontUrl(row);
    const feedback=$('[data-question-feedback]'),resolution=$('[data-question-resolution-wrap]'),resolveButton=$('[data-question-save-resolve]'),linked=Boolean(state.linkedTicket&&state.linkedTicket.entity_id===row.entityId);feedback.hidden=!linked;resolution.hidden=!linked;resolveButton.hidden=!linked;if(linked){$('[data-question-feedback-description]').textContent=state.linkedTicket.description||'未填写反馈说明';$('[data-question-feedback-user]').textContent=`${state.linkedTicket.reporterEmail||'用户已删除'} · ${state.linkedTicket.category||'题目反馈'}`;$('[data-question-resolution-note]').value=state.linkedTicket.resolution_note||'已修正题目内容。'}updateEditorState();renderList();renderPreview();renderCompare();renderValidation();renderHistory(row);switchTab('edit');requestAnimationFrame(()=>$('.question-admin-editor-card')?.scrollIntoView?.({block:'start',behavior:'smooth'}));
  }

  function saveLocalDraft(){if(!state.selected)return;const payload={patch:collectPatch(),savedAt:new Date().toISOString(),baseRevision:Number(overrideFor(state.selected)?.revision||0)};try{localStorage.setItem(draftKey(state.selected),JSON.stringify(payload));state.drafts.set(draftKey(state.selected),payload);state.loadedDraft=true;state.dirty=false;state.baseline=serializedPatch(payload.patch);updateEditorState();renderList();toast('草稿已保存在这台设备，前台内容没有变化。')}catch{toast('浏览器存储空间不足，草稿未保存。','error')}}
  function clearLocalDraft(){if(!state.selected||!state.loadedDraft)return;if(state.dirty&&!confirm('丢弃本机草稿和当前修改？'))return;removeDraft(state.selected);state.loadedDraft=false;fillForm(effectiveFor(state.selected),state.selected);state.baseline=serializedPatch();state.dirty=false;updateEditorState();renderList();scheduleRender();toast('本机草稿已丢弃。')}
  async function publish({resolveTicket=false,button=null}={}){
    if(!state.selected)return;const patch=collectPatch(),check=renderValidation({reveal:true});if(!check.ok){switchTab('edit');toast('请先修正题目检查中标出的必填问题。','error');return}const changes=changedFields(effectiveFor(state.selected),patch,state.selected.bank);if(!changes.length&&!state.loadedDraft){toast('当前内容与线上版本一致，无需重复发布。');return}const note=String($('[data-question-resolution-note]')?.value||'').trim();if(resolveTicket&&!note){toast('请填写工单处理结论，用户会看到这段说明。','error');return}if(check.warnings.length&&!confirm(`题目还有 ${check.warnings.length} 条提醒，确认继续发布？`))return;setBusy(button,true,resolveTicket?'发布并解决中…':'发布中…');
    try{const api=await cloud(),expectedRevision=Number(overrideFor(state.selected)?.revision||0),result=await api.questions('save',{bank:state.selected.bank,entityId:state.selected.entityId,patch,expectedRevision});state.overrides.set(state.selected.entityId,result.override);removeDraft(state.selected);state.loadedDraft=false;state.dirty=false;state.baseline=serializedPatch(patch);window.EveraQuestionOverrides?.clearQuestionOverrideCache?.(state.selected.bank);if(resolveTicket&&state.linkedTicket){await api.feedback('update',{id:state.linkedTicket.id,status:'resolved',priority:state.linkedTicket.priority||'normal',resolutionNote:note});state.linkedTicket=null;document.dispatchEvent(new CustomEvent('everflow:feedback-changed'));toast('题目已发布，工单已解决；反馈用户下次访问时只提示一次。')}else toast('题目修改已发布，前台已切换到新版本。');openRow(state.selected,{force:true})}catch(error){if(String(error.message||error).includes('stale_question_revision'))toast('线上版本已被更新，请刷新题目后重新确认修改。','error');else toast(error.message||'题目发布失败','error')}finally{setBusy(button,false)}
  }
  async function restoreOriginal(button){
    if(!state.selected||!state.overrides.has(state.selected.entityId)){toast('当前已经使用题库原文。');return}if(!confirm('确定恢复题库原文？前台会立即撤销当前修正，操作仍会写入版本记录。'))return;setBusy(button,true,'恢复中…');try{await(await cloud()).questions('restore',{bank:state.selected.bank,entityId:state.selected.entityId,expectedRevision:Number(overrideFor(state.selected)?.revision||0)});state.overrides.delete(state.selected.entityId);removeDraft(state.selected);state.loadedDraft=false;window.EveraQuestionOverrides?.clearQuestionOverrideCache?.(state.selected.bank);toast('已恢复题库原文。');openRow(state.selected,{force:true})}catch(error){toast(error.message||'恢复失败','error')}finally{setBusy(button,false)}
  }
  async function restoreRevision(revision,button){
    if(!state.selected||!Number.isInteger(revision))return;if(!confirm(`确定把版本 ${revision} 重新发布到前台？当前版本仍会保留在历史记录中。`))return;setBusy(button,true,'恢复中…');try{const result=await(await cloud()).questions('restore-version',{bank:state.selected.bank,entityId:state.selected.entityId,revision,expectedRevision:Number(overrideFor(state.selected)?.revision||0)});state.overrides.set(state.selected.entityId,result.override);removeDraft(state.selected);state.loadedDraft=false;toast(`版本 ${revision} 已重新发布。`);openRow(state.selected,{force:true})}catch(error){toast(error.message||'历史版本恢复失败','error')}finally{setBusy(button,false)}
  }
  function readFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('图片读取失败'));reader.readAsDataURL(file)})}
  async function upload(button){
    if(!state.selected)return;const file=$('[data-question-upload-file]').files?.[0];if(!file){toast('请先选择图片。','error');return}if(file.size>4194304){toast('图片不能超过 4 MB。','error');return}setBusy(button,true,'上传中…');try{const base64=await readFile(file),result=await(await cloud()).questions('upload-image',{bank:state.selected.bank,entityId:state.selected.entityId,contentType:file.type,base64}),target=$('[data-question-upload-target]').value;if(state.selected.bank==='zhenti')$('[data-question-figures]').value=[$('[data-question-figures]').value,result.url].filter(Boolean).join('\n');else{const field=target==='explanation'?$('[data-question-explanation-images]'):$('[data-question-images]');field.value=[field.value,result.url].filter(Boolean).join('\n')}$('[data-question-upload-file]').value='';editorChanged();toast('图片已上传并加入当前编辑，发布后才会影响前台。')}catch(error){toast(error.message||'图片上传失败','error')}finally{setBusy(button,false)}
  }
  function exportRows(){const rows=filteredRows().map(row=>({bank:row.bank,entityId:row.entityId,number:row.number,subject:row.subject,status:{published:state.overrides.has(row.entityId),localDraft:Boolean(draftFor(row)),needsChecking:hasIssues(row),openFeedback:ticketsFor(row).length},question:rowPatchForInspection(row)})),blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),scope:{bank:state.bank,year:state.bank==='zhenti'?state.year:null},count:rows.length,rows},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`everflow-question-workbench-${state.bank}-${state.bank==='zhenti'?state.year:'all'}-${new Date().toISOString().slice(0,10)}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`已导出 ${rows.length} 道题。`)}
  function moveSelection(offset){const rows=filteredRows();if(!rows.length)return;const index=Math.max(0,rows.findIndex(row=>row.entityId===state.selected?.entityId)),next=rows[(index+offset+rows.length)%rows.length];openRow(next)}
  async function load({selectId='',ticket=null}={}){
    if(state.loading)return;state.loading=true;$('[data-question-list]').innerHTML='<div class="quality-empty">正在读取题库…</div>';try{await Promise.all([loadOverrides(),loadSource()]);refreshTicketIndex();state.loadedBank=`${state.bank}:${state.year}`;renderList();const row=state.rows.find(item=>item.entityId===selectId)||state.rows.find(item=>item.entityId===state.selected?.entityId);if(row)openRow(row,{ticket,force:true})}catch(error){toast(error.message||'题库读取失败','error');$('[data-question-list]').innerHTML=`<div class="quality-empty">读取失败：${esc(error.message||error)}</div>`}finally{state.loading=false}
  }
  async function changeScope(){
    if(state.dirty&&!confirm('当前题目有未保存修改。切换题库将丢失这些修改，是否继续？')){$('[data-question-bank]').value=state.bank;$('[data-question-year]').value=state.year;return}state.bank=$('[data-question-bank]').value;state.year=$('[data-question-year]').value||state.year;state.selected=null;state.linkedTicket=null;state.dirty=false;$('[data-question-editor]').hidden=true;$('[data-question-editor-empty]').hidden=false;$('[data-question-year-wrap]').hidden=state.bank!=='zhenti';await load();
  }
  async function openTicket(ticket){if(!ticket?.entity_id||!['zhenti','relax1000'].includes(ticket.bank))return;state.bank=ticket.bank;$('[data-question-bank]').value=state.bank;if(state.bank==='zhenti'){state.year=String(ticket.entity_id).split('-')[0];$('[data-question-year]').value=state.year}$('[data-question-year-wrap]').hidden=state.bank!=='zhenti';$('[data-question-search]').value='';$('[data-question-status-filter]').value='all';state.loadedBank=`${state.bank}:${state.year}`;$('[data-ws-nav="questions"]')?.click();await load({selectId:String(ticket.entity_id),ticket});if(!state.selected)toast('工单对应的题目未在题库中找到。','error')}

  setYearOptions();$('[data-question-year-wrap]').hidden=false;
  $('[data-ws-nav="questions"]')?.addEventListener('click',()=>{const key=`${$('[data-question-bank]').value}:${$('[data-question-year]').value}`;if(state.loadedBank!==key)changeScope()});
  $('[data-question-bank]')?.addEventListener('change',changeScope);$('[data-question-year]')?.addEventListener('change',changeScope);let searchTimer=0;$('[data-question-search]')?.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(renderList,80)});$('[data-question-subject-filter]')?.addEventListener('change',renderList);$('[data-question-status-filter]')?.addEventListener('change',renderList);
  $('[data-question-reload]')?.addEventListener('click',event=>{if(state.dirty&&!confirm('刷新会丢失当前未保存修改，是否继续？'))return;state.loadedBank='';load();toast('正在刷新题库。');event.currentTarget.blur()});$('[data-question-export]')?.addEventListener('click',exportRows);$('[data-question-editor]')?.addEventListener('input',editorChanged);$('[data-question-editor]')?.addEventListener('change',editorChanged);$('[data-question-editor]')?.addEventListener('submit',event=>{event.preventDefault();publish({button:$('[data-question-save]')})});
  $('[data-question-save-resolve]')?.addEventListener('click',event=>publish({resolveTicket:true,button:event.currentTarget}));$('[data-question-save-draft]')?.addEventListener('click',saveLocalDraft);$('[data-question-clear-draft]')?.addEventListener('click',clearLocalDraft);$('[data-question-validate]')?.addEventListener('click',()=>{const result=renderValidation({reveal:true});toast(result.ok?'题目结构检查通过。':'发现必须修正的问题。',result.ok?'success':'error')});$('[data-question-restore]')?.addEventListener('click',event=>restoreOriginal(event.currentTarget));$('[data-question-upload]')?.addEventListener('click',event=>upload(event.currentTarget));$('[data-question-previous]')?.addEventListener('click',()=>moveSelection(-1));$('[data-question-next]')?.addEventListener('click',()=>moveSelection(1));
  document.addEventListener('click',event=>{const open=event.target.closest('[data-question-open]');if(open){const row=state.rows.find(item=>item.entityId===open.dataset.questionOpen);if(row)openRow(row);return}const tab=event.target.closest('[data-question-tab]');if(tab){switchTab(tab.dataset.questionTab);return}const restore=event.target.closest('[data-question-restore-revision]');if(restore)restoreRevision(Number(restore.dataset.questionRestoreRevision),restore)});
  document.addEventListener('keydown',event=>{if(!state.selected||!$('[data-ws-panel="questions"]')?.classList.contains('active')||!(event.metaKey||event.ctrlKey))return;if(event.key.toLowerCase()==='s'){event.preventDefault();saveLocalDraft()}else if(event.key==='Enter'){event.preventDefault();publish({button:$('[data-question-save]')})}});document.addEventListener('everflow:open-question-editor',event=>openTicket(event.detail?.ticket));document.addEventListener('everflow:workspace-data',()=>{refreshTicketIndex();renderSummary();renderList()});addEventListener('beforeunload',event=>{if(state.dirty){event.preventDefault();event.returnValue=''}});
  import('./question-content-v1.js?v=20260904-format1').then(()=>{if(state.selected)renderPreview()}).catch(()=>{});if(location.hash==='#questions')changeScope();
})();
