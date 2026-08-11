import './cloud.js';

(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const guard=$('[data-workspace-guard]'),shell=$('[data-workspace-shell]'),guardText=$('[data-workspace-guard-text]');
  const sidebar=$('[data-workspace-sidebar]');
  const collapseKey='everflow-workspace-sidebar-collapsed-v1';

  function setCollapsed(on){
    if(!sidebar||!shell)return;
    sidebar.classList.toggle('collapsed',on);shell.classList.toggle('sidebar-collapsed',on);
    localStorage.setItem(collapseKey,on?'1':'0');
    const btn=$('[data-workspace-collapse]');if(btn){btn.textContent=on?'›':'‹';btn.setAttribute('aria-label',on?'展开侧边栏':'收起侧边栏')}
  }

  function activate(id){
    const target=document.getElementById(id);if(!target)return;
    $$('.workspace-panel').forEach(p=>p.classList.toggle('active',p.id===id));
    $$('[data-workspace-nav]').forEach(b=>b.classList.toggle('active',b.dataset.workspaceNav===id));
    const search=$('[data-workspace-search]');if(search){search.value='';$$('.workspace-content .owner-content-row,.workspace-content tbody tr').forEach(row=>row.hidden=false)}
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function wireNav(){
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-workspace-nav]');if(!btn)return;
      e.preventDefault();activate(btn.dataset.workspaceNav);
    });
    $('[data-workspace-collapse]')?.addEventListener('click',()=>setCollapsed(!sidebar?.classList.contains('collapsed')));
    setCollapsed(localStorage.getItem(collapseKey)==='1');
  }

  function wireSearch(){
    const input=$('[data-workspace-search]');if(!input)return;
    input.addEventListener('input',()=>{
      const q=input.value.trim().toLowerCase();
      const current=$('.workspace-panel.active')||document;
      current.querySelectorAll('.owner-content-row,tbody tr').forEach(row=>{row.hidden=Boolean(q)&&!row.textContent.toLowerCase().includes(q)});
    });
  }

  async function boot(){
    await EveraCloud.ready;
    const user=await EveraCloud.getUser();
    const owner=Boolean(user&&await EveraCloud.isOwner());
    if(!owner){if(guardText)guardText.textContent=user?'当前账户没有 Owner 权限。':'请先登录 Owner 账户后再进入管理工作台。';return}
    if(guard)guard.hidden=true;if(shell)shell.hidden=false;
    const email=$('[data-control-owner]');if(email)email.textContent=user.email||user.id;
    wireNav();wireSearch();activate('workspace-overview');
  }

  boot().catch(err=>{console.error(err);if(guardText)guardText.textContent='工作台初始化失败，请返回账户页重新登录。'});
})();