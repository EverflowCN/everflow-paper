import './cloud.js';

(()=>{
  const $=s=>document.querySelector(s);
  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let fallbackProfiles=[];

  function ensureMembershipAdmin(){
    const content=$('[data-control-content]');if(!content||$('[data-membership-admin]'))return;
    content.insertAdjacentHTML('beforeend',`<section class="study-card" style="margin-top:16px" data-membership-admin><div class="eyebrow">MEMBERSHIP CODES</div><h3>会员兑换码</h3><p class="muted">兑换码明文只在生成时显示一次，数据库只保存 SHA-256 摘要和提示片段。</p><div class="study-form" style="grid-template-columns:repeat(3,minmax(0,1fr));align-items:end"><label>等级<select data-code-plan><option value="member">普通会员</option><option value="pro">Pro</option></select></label><label>可兑换次数<input type="number" min="1" max="100000" value="1" data-code-uses></label><label>备注<input type="text" maxlength="200" placeholder="例如：活动赠送" data-code-note></label></div><div class="auth-actions" style="margin-top:12px"><button class="small-btn" type="button" data-code-create>生成兑换码</button></div><p class="notice" data-code-created hidden></p><div style="overflow:auto;margin-top:14px"><table class="control-table"><thead><tr><th>提示</th><th>等级</th><th>使用</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody data-code-list><tr><td colspan="6">正在读取…</td></tr></tbody></table></div></section>`);
  }

  async function boot(){
    const root=$('[data-control-root]');if(!root)return;
    await EveraCloud.ready;
    const user=await EveraCloud.getUser();
    if(!EveraCloud.enabled||!user||!(await EveraCloud.isOwner())){
      root.hidden=true;
      return;
    }
    root.hidden=false;
    const content=$('[data-control-content]');if(content)content.hidden=false;
    const who=$('[data-control-owner]');if(who)who.textContent=user.email||user.id;
    ensureMembershipAdmin();
    await refresh();
  }

  const set=(s,v)=>{const el=$(s);if(el)el.textContent=String(v)};

  function renderFallbackUsers(){
    const table=$('[data-control-users-list]');if(!table)return;
    table.innerHTML=fallbackProfiles.length?fallbackProfiles.map(x=>`<tr><td>${escapeHtml(x.display_name||'未命名')}</td><td class="mono">${escapeHtml(String(x.user_id).slice(0,8))}…</td><td>${x.created_at?new Date(x.created_at).toLocaleDateString('zh-CN'):'--'}</td><td>${x.last_seen_at?new Date(x.last_seen_at).toLocaleString('zh-CN',{hour12:false}):'--'}</td><td class="muted">只读</td><td>—</td></tr>`).join(''):'<tr><td colspan="6" class="muted">暂无用户数据</td></tr>';
  }

  async function loadUsers(){
    const status=$('[data-control-edge-status]');
    try{
      const out=await EveraCloud.ownerUsers('list',{page:1,perPage:50});
      if(status)status.textContent='用户管理接口正常';
      const table=$('[data-control-users-list]');if(!table)return;
      table.innerHTML=(out.users||[]).map(u=>{
        const banned=u.bannedUntil&&new Date(u.bannedUntil)>new Date();
        const protectedOwner=u.role==='owner';
        const actions=protectedOwner?'Owner':`<button class="small-btn" type="button" data-user-action="${banned?'unban':'ban'}" data-user-id="${escapeHtml(u.id)}">${banned?'解除停用':'停用'}</button> <button class="small-btn" type="button" data-user-action="delete" data-user-id="${escapeHtml(u.id)}">删除</button>`;
        return `<tr><td>${escapeHtml(u.email||'--')}</td><td class="mono">${escapeHtml(String(u.id).slice(0,8))}…</td><td>${u.createdAt?new Date(u.createdAt).toLocaleDateString('zh-CN'):'--'}</td><td>${u.lastSignInAt?new Date(u.lastSignInAt).toLocaleString('zh-CN',{hour12:false}):'--'}</td><td>${protectedOwner?'Owner':(banned?'已停用':'正常')}</td><td>${actions}</td></tr>`;
      }).join('')||'<tr><td colspan="6" class="muted">暂无账户</td></tr>';
    }catch(e){
      if(status)status.textContent='用户管理接口暂不可用 · 当前只读';
      renderFallbackUsers();
    }
  }

  async function loadCodes(){
    const table=$('[data-code-list]');if(!table)return;
    try{
      const out=await EveraCloud.membership('list-codes');
      table.innerHTML=(out.codes||[]).map(c=>`<tr><td class="mono">${escapeHtml(c.code_hint)}</td><td>${c.plan==='pro'?'Pro':'普通会员'}</td><td>${c.used_count}/${c.max_uses}</td><td>${c.active?'可用':'已停用'}</td><td>${new Date(c.created_at).toLocaleString('zh-CN',{hour12:false})}</td><td>${c.active?`<button class="small-btn" type="button" data-code-disable="${escapeHtml(c.id)}">停用</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">暂无兑换码</td></tr>';
    }catch(e){table.innerHTML=`<tr><td colspan="6" class="muted">兑换码接口暂不可用：${escapeHtml(e.message||String(e))}</td></tr>`}
  }

  async function loadAudit(){
    const table=$('[data-control-audit]');if(!table)return;
    try{
      const rows=await EveraCloud.getOwnerAudit();
      table.innerHTML=rows.length?rows.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('zh-CN',{hour12:false})}</td><td>${escapeHtml(x.action)}</td><td class="mono">${escapeHtml(String(x.target_user_id||'').slice(0,8))}${x.target_user_id?'…':''}</td><td>${escapeHtml(x.detail?.email||x.detail?.code_hint||'')}</td></tr>`).join(''):'<tr><td colspan="4" class="muted">暂无管理操作记录</td></tr>';
    }catch{table.innerHTML='<tr><td colspan="4" class="muted">审计日志暂不可用</td></tr>'}
  }

  async function refresh(){
    const data=await EveraCloud.getOwnerOverview();
    set('[data-control-users]',data.users);set('[data-control-focus]',data.focus);set('[data-control-courses]',data.courses);
    fallbackProfiles=data.recent||[];
    await Promise.all([loadUsers(),loadAudit(),loadCodes()]);
    try{
      const r=await fetch('../data/oxygen.json?t='+Date.now(),{cache:'no-store'}),o=await r.json();
      const sub=o.subjects||{};
      ['ds','co','os','cn'].forEach(k=>set(`[data-control-${k}]`,(sub[k]?.items||[]).length));
      set('[data-control-oxygen-time]',o.updatedAt?new Date(o.updatedAt).toLocaleString('zh-CN',{hour12:false}):'--');
    }catch{}
  }

  document.addEventListener('click',async e=>{
    const createBtn=e.target.closest('[data-code-create]');
    if(createBtn){
      createBtn.disabled=true;
      try{
        const plan=$('[data-code-plan]')?.value||'member',maxUses=Number($('[data-code-uses]')?.value)||1,note=$('[data-code-note]')?.value||'';
        const out=await EveraCloud.membership('create-code',{plan,maxUses,note});
        const box=$('[data-code-created]');if(box){box.hidden=false;box.innerHTML=`新兑换码：<strong class="mono">${escapeHtml(out.code)}</strong>　请现在复制保存，之后后台只显示提示片段。`}
        await Promise.all([loadCodes(),loadAudit()]);
      }catch(err){alert('生成失败：'+(err.message||String(err)))}finally{createBtn.disabled=false}
      return;
    }
    const disableBtn=e.target.closest('[data-code-disable]');
    if(disableBtn){
      if(!confirm('停用这个兑换码？已兑换的会员不会被取消。'))return;
      disableBtn.disabled=true;
      try{await EveraCloud.membership('disable-code',{codeId:disableBtn.dataset.codeDisable});await Promise.all([loadCodes(),loadAudit()])}catch(err){alert('停用失败：'+(err.message||String(err)))}finally{disableBtn.disabled=false}
      return;
    }
    const btn=e.target.closest('[data-user-action]');if(!btn)return;
    const action=btn.dataset.userAction,userId=btn.dataset.userId;
    const text=action==='delete'?'永久删除这个账户及其云端学习数据？此操作不可撤销。':action==='ban'?'停用这个账户？':'解除该账户的停用状态？';
    if(!confirm(text))return;
    btn.disabled=true;
    try{await EveraCloud.ownerUsers(action,{userId});await refresh()}catch(err){alert('操作失败：'+(err.message||String(err)))}finally{btn.disabled=false}
  });
  $('[data-control-refresh]')?.addEventListener('click',()=>refresh().catch(console.error));
  document.addEventListener('everflow:auth-change',()=>boot().catch(console.error));
  boot().catch(err=>{console.error(err);const root=$('[data-control-root]');if(root)root.hidden=true});
})();
