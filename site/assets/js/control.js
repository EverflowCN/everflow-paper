import './cloud.js';

(()=>{
  const $=s=>document.querySelector(s);
  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let fallbackProfiles=[];

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

  async function loadAudit(){
    const table=$('[data-control-audit]');if(!table)return;
    try{
      const rows=await EveraCloud.getOwnerAudit();
      table.innerHTML=rows.length?rows.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('zh-CN',{hour12:false})}</td><td>${escapeHtml(x.action)}</td><td class="mono">${escapeHtml(String(x.target_user_id||'').slice(0,8))}${x.target_user_id?'…':''}</td><td>${escapeHtml(x.detail?.email||'')}</td></tr>`).join(''):'<tr><td colspan="4" class="muted">暂无管理操作记录</td></tr>';
    }catch{table.innerHTML='<tr><td colspan="4" class="muted">审计日志暂不可用</td></tr>'}
  }

  async function refresh(){
    const data=await EveraCloud.getOwnerOverview();
    set('[data-control-users]',data.users);set('[data-control-focus]',data.focus);set('[data-control-courses]',data.courses);
    fallbackProfiles=data.recent||[];
    await Promise.all([loadUsers(),loadAudit()]);
    try{
      const r=await fetch('../data/oxygen.json?t='+Date.now(),{cache:'no-store'}),o=await r.json();
      const sub=o.subjects||{};
      ['ds','co','os','cn'].forEach(k=>set(`[data-control-${k}]`,(sub[k]?.items||[]).length));
      set('[data-control-oxygen-time]',o.updatedAt?new Date(o.updatedAt).toLocaleString('zh-CN',{hour12:false}):'--');
    }catch{}
  }

  document.addEventListener('click',async e=>{
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
