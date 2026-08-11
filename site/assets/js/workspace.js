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

  function activate(id,scroll=true){
    const target=document.getElementById(id);if(!target)return;
    $$('[data-workspace-nav]').forEach(b=>b.classList.toggle('active',b.dataset.workspaceNav===id));
    if(scroll)target.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function wireNav(){
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-workspace-nav]');if(!btn)return;
      e.preventDefault();activate(btn.dataset.workspaceNav,true);
    });
    $('[data-workspace-collapse]')?.addEventListener('click',()=>setCollapsed(!sidebar?.classList.contains('collapsed')));
    setCollapsed(localStorage.getItem(collapseKey)==='1');
  }

  function wireSearch(){
    const input=$('[data-workspace-search]');if(!input)return;
    input.addEventListener('input',()=>{
      const q=input.value.trim().toLowerCase();
      $$('.workspace-content .owner-content-row,.workspace-content tbody tr').forEach(row=>{
        if(!q){row.hidden=false;return}
        row.hidden=!row.textContent.toLowerCase().includes(q);
      });
    });
  }

  function watchSections(){
    const update=()=>{
      const ids=['workspace-overview','workspace-users','workspace-notices','workspace-resources','workspace-membership','workspace-audit'];
      let best=null,bestDist=Infinity;
      ids.forEach(id=>{const el=document.getElementById(id);if(!el)return;const d=Math.abs(el.getBoundingClientRect().top-110);if(d<bestDist){bestDist=d;best=id}});
      if(best)$$('[data-workspace-nav]').forEach(b=>b.classList.toggle('active',b.dataset.workspaceNav===best));
    };
    addEventListener('scroll',update,{passive:true});
    new MutationObserver(update).observe(document.body,{subtree:true,childList:true});
  }

  async function boot(){
    await EveraCloud.ready;
    const user=await EveraCloud.getUser();
    const owner=Boolean(user&&await EveraCloud.isOwner());
    if(!owner){
      if(guardText)guardText.textContent=user?'当前账户没有 Owner 权限。':'请先登录 Owner 账户后再进入管理工作台。';
      return;
    }
    if(guard)guard.hidden=true;if(shell)shell.hidden=false;
    const email=$('[data-control-owner]');if(email)email.textContent=user.email||user.id;
    wireNav();wireSearch();watchSections();
  }

  boot().catch(err=>{console.error(err);if(guardText)guardText.textContent='工作台初始化失败，请返回账户页重新登录。'});
})();