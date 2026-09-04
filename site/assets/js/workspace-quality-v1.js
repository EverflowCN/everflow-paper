(()=>{
  'use strict';
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const labels={stem:'题干',options:'选项',answer:'答案',image:'图片',explanation:'解析',link:'链接',other:'其他',zhenti:'408 真题',relax1000:'Relax1000',course:'课程',resource:'资源',site:'站点'};
  const statusLabels={open:'待处理',in_progress:'处理中',resolved:'已解决',dismissed:'已忽略'};
  const statusOptionLabels={...statusLabels,resolved:'已解决（通知用户一次）'};
  const priorityLabels={low:'低',normal:'普通',high:'高',urgent:'紧急'};
  let quality=null,staticReport=null,selectedTicket=null;
  const toast=(message,type='success')=>window.EveraUI?.toast?.(message,{type})||console.log(message);
  const fmt=value=>{if(!value)return'--';const d=new Date(value);return Number.isNaN(d.getTime())?'--':d.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})};
  const set=(selector,value)=>{const el=$(selector);if(el)el.textContent=String(value??'--')};
  const percent=value=>Math.max(0,Math.min(100,Number(value)||0));

  function renderCoverage(){
    const root=$('[data-quality-coverage]');if(!root)return;
    const rows=quality?.coverage||[];
    root.innerHTML=rows.map(row=>`<div class="coverage-row"><div><strong>${esc(row.label)}</strong><span>${row.users} / ${row.total} 人</span></div><div class="coverage-track"><i style="width:${percent(row.rate)}%"></i></div><b>${percent(row.rate)}%</b></div>`).join('')||'<div class="quality-empty">暂时没有覆盖率数据</div>';
  }
  function renderIssues(){
    const root=$('[data-quality-issues]');if(!root)return;
    const rows=quality?.qualityIssues||[];
    const repair=$('[data-quality-repair-profiles]');if(repair)repair.hidden=!rows.some(row=>row.type==='profile');
    root.innerHTML=rows.map(row=>`<div class="quality-issue ${esc(row.level||'warning')}"><i></i><div><strong>${esc(row.title)}</strong><small>${esc(row.detail||'')}</small></div>${row.target?`<button type="button" data-quality-user="${esc(row.target)}">查看用户</button>`:''}</div>`).join('')||'<div class="quality-pass"><span>✓</span><div><strong>数据库检查通过</strong><small>未发现阻断发布的数据异常。</small></div></div>';
  }
  function renderBanks(){
    const root=$('[data-quality-banks]');if(!root)return;
    const banks=staticReport?.banks||[];
    root.innerHTML=banks.map(bank=>`<article class="quality-bank ${bank.status==='pass'?'pass':bank.status==='warning'?'warning':'bad'}"><div><span>${esc(bank.label||bank.id)}</span><strong>${bank.status==='pass'?'通过':bank.status==='warning'?'待确认':'异常'}</strong></div><p>${esc(bank.note||'')}</p><small>${esc((bank.checks||[]).join(' · '))}</small></article>`).join('')||'<div class="quality-empty">本次构建未附带题库审计报告，数据库质检仍正常可用。</div>';
    const pass=banks.length&&banks.every(bank=>bank.status==='pass');
    set('[data-quality-bank-status]',banks.length?(pass?'通过':`${banks.filter(bank=>bank.status!=='pass').length} 项`):'待生成');
    set('[data-quality-bank-note]',banks.length?`${banks.filter(bank=>bank.status==='pass').length}/${banks.length} 个题库通过`:'下次部署自动生成');
    set('[data-quality-generated]',staticReport?.generatedAt?`构建于 ${fmt(staticReport.generatedAt)}`:'暂无构建报告');
  }
  function renderSummary(){
    set('[data-quality-issue-count]',quality?.summary?.qualityIssues??0);
    set('[data-quality-lessons]',staticReport?.content?.enabledLessons??window.EveraWorkspaceData?.analytics?.health?.lessonCount??'--');
    set('[data-quality-open-feedback]',quality?.summary?.openFeedback??0);
    const risks=quality?.risks||[];
    set('[data-risk-high]',risks.filter(row=>row.level==='high').length);
    set('[data-risk-medium]',risks.filter(row=>row.level==='medium').length);
    set('[data-risk-inactive]',risks.filter(row=>row.daysInactive>=14).length);
    set('[data-risk-never]',risks.filter(row=>row.reasons?.some(reason=>reason.includes('48 小时'))).length);
    const stats=quality?.feedbackStats||{};
    set('[data-feedback-open]',stats.open||0);set('[data-feedback-progress]',stats.inProgress||0);set('[data-feedback-urgent]',stats.urgent||0);set('[data-feedback-resolved]',stats.resolved||0);
  }
  function filteredRisks(){
    const query=String($('[data-risk-search]')?.value||'').trim().toLowerCase(),level=$('[data-risk-filter]')?.value||'all';
    return(quality?.risks||[]).filter(row=>(level==='all'||row.level===level)&&(!query||`${row.email} ${row.displayName} ${(row.reasons||[]).join(' ')}`.toLowerCase().includes(query)));
  }
  function renderRisks(){
    const root=$('[data-risk-table]');if(!root)return;
    const rows=filteredRisks();
    root.innerHTML=rows.map(row=>`<tr><td><strong>${esc(row.email||row.displayName||row.userId)}</strong>${row.displayName?`<span>${esc(row.displayName)}</span>`:''}</td><td><span class="risk-score ${esc(row.level)}">${row.score}</span></td><td>${fmt(row.lastActiveAt)}<span>${row.daysInactive} 天前</span></td><td>${row.progress.doneCourses}/${row.progress.courses} 课时<span>${row.progress.practiceDone}/${row.progress.practice} 练习</span></td><td><div class="risk-reasons">${(row.reasons||[]).map(reason=>`<span>${esc(reason)}</span>`).join('')}</div></td><td><button type="button" data-risk-user="${esc(row.userId)}">用户详情</button></td></tr>`).join('')||'<tr><td colspan="6">当前筛选下没有需要跟进的用户</td></tr>';
  }
  function filteredTickets(){
    const query=String($('[data-feedback-search]')?.value||'').trim().toLowerCase(),status=$('[data-feedback-status]')?.value||'active',category=$('[data-feedback-category]')?.value||'all';
    return(quality?.tickets||[]).filter(row=>{
      const statusOk=status==='all'||(status==='active'?['open','in_progress'].includes(row.status):row.status===status);
      const categoryOk=category==='all'||row.category===category;
      return statusOk&&categoryOk&&(!query||`${row.entity_id} ${row.description} ${row.reporterEmail} ${row.page_path}`.toLowerCase().includes(query));
    });
  }
  function renderTickets(){
    const root=$('[data-feedback-list]');if(!root)return;
    const rows=filteredTickets();
    root.innerHTML=rows.map(row=>`<article class="feedback-ticket ${esc(row.priority)}"><div class="feedback-ticket-meta"><span class="pill ${row.status==='resolved'?'ok':row.priority==='urgent'?'bad':''}">${esc(statusLabels[row.status]||row.status)}</span><b>${esc(priorityLabels[row.priority]||row.priority)}</b><time>${fmt(row.created_at)}</time></div><div class="feedback-ticket-body"><div><strong>${esc(labels[row.bank]||row.bank)} · ${esc(row.entity_id||'页面反馈')}</strong><small>${esc(labels[row.category]||row.category)} · ${esc(row.reporterEmail||'用户已删除')}</small></div><p>${esc(row.description)}</p><code>${esc(row.page_path)}</code></div><button type="button" data-feedback-open-ticket="${esc(row.id)}">处理</button></article>`).join('')||'<div class="quality-pass"><span>✓</span><div><strong>没有待处理工单</strong><small>新的前台纠错会自动出现在这里。</small></div></div>';
  }
  function renderOverviewAlerts(){
    const root=$('[data-overview-alerts]');if(!root)return;root.querySelectorAll('[data-quality-alert]').forEach(node=>node.remove());
    const summary=quality?.summary||{},rows=[];
    if(summary.qualityIssues)rows.push({level:'warning',title:`${summary.qualityIssues} 项数据异常需要确认`,detail:'资料档案、课程资源或学习事件存在不完整项。',target:'quality'});
    if(summary.highRisks)rows.push({level:'danger',title:`${summary.highRisks} 位用户触发高风险预警`,detail:'优先查看未开始学习或长期未活跃用户。',target:'risks'});
    if(summary.openFeedback)rows.push({level:'warning',title:`${summary.openFeedback} 条内容反馈尚未关闭`,detail:'请进入反馈工单分级并记录处理结论。',target:'feedback'});
    root.insertAdjacentHTML('afterbegin',rows.map(row=>`<div class="ws-alert ${row.level}" data-quality-alert><i class="ws-alert-dot"></i><div><strong>${esc(row.title)}</strong><small>${esc(row.detail)}</small></div><button data-jump="${row.target}">处理</button></div>`).join(''));
    set('[data-alert-count]',`${root.querySelectorAll('.ws-alert.warning,.ws-alert.danger').length} 项`);
  }
  function render(){renderSummary();renderCoverage();renderIssues();renderBanks();renderRisks();renderTickets();renderOverviewAlerts()}

  async function fetchStatic(){
    try{const response=await fetch(`/data/admin-quality-report.json?v=${Date.now()}`,{cache:'no-store'});staticReport=response.ok?await response.json():null}catch{staticReport=null}
  }
  async function refresh(button){
    if(button){button.disabled=true;button.textContent='扫描中…'}
    try{const cloud=window.EveraAdminCloud;if(!cloud)throw new Error('管理服务未就绪');const [live]=await Promise.all([cloud.quality(),fetchStatic()]);quality=live;window.EveraWorkspaceData={...(window.EveraWorkspaceData||{}),quality:live};render();toast('质检、预警与工单已刷新。')}catch(error){toast(error.message||'扫描失败','error')}finally{if(button){button.disabled=false;button.textContent='重新扫描'}}
  }
  async function repairProfiles(button){
    button.disabled=true;button.textContent='补齐中…';
    try{const result=await window.EveraAdminCloud.quality('repair-profiles');await refresh();toast(result.repaired?`已补齐 ${result.repaired} 个缺失档案。`:'当前没有缺失档案。')}catch(error){toast(error.message||'补齐失败','error')}finally{button.disabled=false;button.textContent='补齐缺失档案'}
  }
  function openTicket(id){
    selectedTicket=(quality?.tickets||[]).find(row=>row.id===id);if(!selectedTicket)return;
    const editor=$('[data-feedback-editor]'),backdrop=$('[data-feedback-editor-backdrop]');
    editor.innerHTML=`<div class="ws-drawer-head"><div><span class="eyebrow">FEEDBACK TICKET</span><h3>${esc(labels[selectedTicket.bank]||selectedTicket.bank)} · ${esc(selectedTicket.entity_id||'页面反馈')}</h3><small>${esc(selectedTicket.reporterEmail||'用户已删除')} · ${fmt(selectedTicket.created_at)}</small></div><button class="ws-drawer-close" type="button" data-feedback-editor-close>×</button></div><section class="ws-drawer-section"><h4>反馈内容</h4><p>${esc(selectedTicket.description)}</p><code>${esc(selectedTicket.page_path)}</code></section><section class="ws-drawer-section"><div class="ws-form"><label class="ws-field"><span>处理状态</span><select data-feedback-edit-status>${Object.entries(statusLabels).map(([value,label])=>`<option value="${value}" ${selectedTicket.status===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="ws-field"><span>优先级</span><select data-feedback-edit-priority>${Object.entries(priorityLabels).map(([value,label])=>`<option value="${value}" ${selectedTicket.priority===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="ws-field wide"><span>处理结论</span><textarea rows="7" data-feedback-edit-note placeholder="记录核查、修正或忽略原因">${esc(selectedTicket.resolution_note||'')}</textarea></label></div><div class="ws-form-actions"><button class="ws-btn primary" type="button" data-feedback-save>保存处理结果</button></div></section>`;
    editor.querySelector('.ws-form')?.insertAdjacentHTML('afterend','<p class="feedback-notify-hint">选择“已解决”后，反馈用户下次登录访问时会收到一次修正提示；提示成功领取后不会重复出现。</p>');
    editor.hidden=false;backdrop.hidden=false;requestAnimationFrame(()=>editor.classList.add('open'));
  }
  function closeTicket(){const editor=$('[data-feedback-editor]'),backdrop=$('[data-feedback-editor-backdrop]');editor?.classList.remove('open');if(editor)editor.hidden=true;if(backdrop)backdrop.hidden=true;selectedTicket=null}
  async function saveTicket(button){
    if(!selectedTicket)return;
    const status=$('[data-feedback-edit-status]').value,resolutionNote=$('[data-feedback-edit-note]').value.trim();
    if(status==='resolved'&&!resolutionNote){toast('标记已解决前请填写处理结论，用户将看到这段说明。','error');return}
    button.disabled=true;button.textContent='保存中…';
    try{await window.EveraAdminCloud.feedback('update',{id:selectedTicket.id,status,priority:$('[data-feedback-edit-priority]').value,resolutionNote});closeTicket();await refresh();toast(status==='resolved'?'工单已解决，将向反馈用户提示一次。':'工单处理结果已保存。')}catch(error){toast(error.message||'保存失败','error')}finally{button.disabled=false;button.textContent='保存处理结果'}
  }

  document.addEventListener('everflow:workspace-data',event=>{quality=event.detail?.quality||null;render()});
  $('[data-quality-refresh]')?.addEventListener('click',event=>refresh(event.currentTarget));
  $('[data-quality-repair-profiles]')?.addEventListener('click',event=>repairProfiles(event.currentTarget));
  $('[data-risk-search]')?.addEventListener('input',renderRisks);$('[data-risk-filter]')?.addEventListener('change',renderRisks);
  $('[data-feedback-search]')?.addEventListener('input',renderTickets);$('[data-feedback-status]')?.addEventListener('change',renderTickets);$('[data-feedback-category]')?.addEventListener('change',renderTickets);
  $('[data-feedback-editor-backdrop]')?.addEventListener('click',closeTicket);
  document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.qualityUser||button.dataset.riskUser)document.dispatchEvent(new CustomEvent('everflow:open-user',{detail:{userId:button.dataset.qualityUser||button.dataset.riskUser}}));else if(button.dataset.feedbackOpenTicket)openTicket(button.dataset.feedbackOpenTicket);else if(button.hasAttribute('data-feedback-editor-close'))closeTicket();else if(button.hasAttribute('data-feedback-save'))saveTicket(button)});
  fetchStatic().then(()=>{quality=window.EveraWorkspaceData?.quality||quality;render()});
})();
