(()=>{
  const $=s=>document.querySelector(s);
  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function boot(){
    const root=$('[data-control-root]');if(!root)return;
    await EveraCloud.ready;
    if(!EveraCloud.enabled){
      root.innerHTML='<div class="control-guard"><div class="eyebrow">NOT FOUND</div><h1>页面不可用</h1><p class="muted">当前站点没有启用此服务。</p></div>';return;
    }
    const user=await EveraCloud.getUser();
    if(!user||!(await EveraCloud.isOwner())){
      root.innerHTML='<div class="control-guard"><div class="eyebrow">404</div><h1>页面不存在</h1><p class="muted">请检查地址后重试。</p></div>';return;
    }
    const guard=$('[data-control-guard]');if(guard)guard.remove();
    const content=$('[data-control-content]');if(content)content.hidden=false;
    const who=$('[data-control-owner]');if(who)who.textContent=user.email||user.id;
    await refresh();
  }

  async function refresh(){
    const data=await EveraCloud.getOwnerOverview();
    const set=(s,v)=>{const el=$(s);if(el)el.textContent=String(v)};
    set('[data-control-users]',data.users);set('[data-control-focus]',data.focus);set('[data-control-courses]',data.courses);
    const table=$('[data-control-users-list]');if(table){
      table.innerHTML=data.recent.length?data.recent.map(x=>`<tr><td>${escapeHtml(x.display_name||'未命名')}</td><td class="mono">${escapeHtml(String(x.user_id).slice(0,8))}…</td><td>${x.created_at?new Date(x.created_at).toLocaleDateString('zh-CN'):'--'}</td><td>${x.last_seen_at?new Date(x.last_seen_at).toLocaleString('zh-CN',{hour12:false}):'--'}</td></tr>`).join(''):'<tr><td colspan="4" class="muted">暂无用户数据</td></tr>';
    }
    try{
      const r=await fetch('../data/oxygen.json?t='+Date.now(),{cache:'no-store'}),o=await r.json();
      const sub=o.subjects||{};
      ['ds','co','os','cn'].forEach(k=>set(`[data-control-${k}]`,(sub[k]?.items||[]).length));
      set('[data-control-oxygen-time]',o.updatedAt?new Date(o.updatedAt).toLocaleString('zh-CN',{hour12:false}):'--');
    }catch{}
  }

  $('[data-control-refresh]')?.addEventListener('click',()=>refresh().catch(console.error));
  boot().catch(err=>{console.error(err);const root=$('[data-control-root]');if(root)root.innerHTML='<div class="control-guard"><h1>页面不存在</h1></div>'});
})();
