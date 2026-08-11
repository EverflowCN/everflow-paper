(()=>{
  const body=document.body;
  const saved=localStorage.getItem('everflow-theme');
  if(saved==='dark')body.classList.add('dark');

  document.querySelectorAll('[data-theme]').forEach(btn=>btn.addEventListener('click',()=>{
    body.classList.toggle('dark');
    localStorage.setItem('everflow-theme',body.classList.contains('dark')?'dark':'light');
  }));

  // Membership promotion entry. It sits immediately before “账户”. Once a user
  // claims/redeems a membership, or explicitly closes it with ×, it stays hidden
  // on this device. The membership page remains reachable from the account page.
  const membershipHidden=()=>localStorage.getItem('everflow-membership-nav-hidden-v1')==='1';
  const ensurePromoStyle=()=>{
    if(document.getElementById('everflow-membership-nav-style'))return;
    const style=document.createElement('style');style.id='everflow-membership-nav-style';
    style.textContent=`.membership-nav-entry{display:inline-flex;align-items:center;gap:3px}.membership-nav-entry>a{white-space:nowrap}.membership-nav-close{border:0;background:transparent;color:var(--muted,#777);font:600 15px/1 system-ui;padding:4px 2px;cursor:pointer;border-radius:999px}.membership-nav-close:hover{color:var(--text,#111);background:rgba(127,127,127,.12)}.membership-nav-entry.is-hidden{display:none!important}.mobile-panel .membership-nav-entry{display:flex;width:100%;align-items:center}.mobile-panel .membership-nav-entry>a{flex:1}.mobile-panel .membership-nav-close{padding:10px 12px}`;
    document.head.appendChild(style);
  };
  const accountAnchor=container=>[...(container?.querySelectorAll('a')||[])].find(a=>a.textContent.trim()==='账户');
  const addMembershipEntry=container=>{
    const account=accountAnchor(container);if(!account||container.querySelector('.membership-nav-entry'))return;
    ensurePromoStyle();
    const wrap=document.createElement('span');wrap.className='membership-nav-entry'+(membershipHidden()?' is-hidden':'');
    const link=document.createElement('a');link.href='/membership/';link.textContent='会员';if(location.pathname.startsWith('/membership/'))link.classList.add('active');
    const close=document.createElement('button');close.type='button';close.className='membership-nav-close';close.setAttribute('aria-label','关闭会员入口');close.textContent='×';
    close.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();localStorage.setItem('everflow-membership-nav-hidden-v1','1');document.querySelectorAll('.membership-nav-entry').forEach(x=>x.classList.add('is-hidden'));});
    wrap.append(link,close);account.before(wrap);
  };
  addMembershipEntry(document.querySelector('.links'));
  addMembershipEntry(document.querySelector('.mobile-panel'));
  document.addEventListener('everflow:membership-change',e=>{
    if(e.detail?.active){localStorage.setItem('everflow-membership-nav-hidden-v1','1');document.querySelectorAll('.membership-nav-entry').forEach(x=>x.classList.add('is-hidden'));}
  });

  const menu=document.querySelector('.mobile-panel');
  const menuButtons=[...document.querySelectorAll('[data-menu]')];
  const setMenu=open=>{
    if(!menu)return;
    menu.classList.toggle('open',open);
    body.classList.toggle('menu-open',open);
    menuButtons.forEach(btn=>btn.setAttribute('aria-expanded',open?'true':'false'));
  };

  menuButtons.forEach(btn=>{
    btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      setMenu(!menu?.classList.contains('open'));
    });
  });

  menu?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));

  document.addEventListener('click',e=>{
    if(menu?.classList.contains('open')&&!menu.contains(e.target)&&!e.target.closest('[data-menu]'))setMenu(false);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false)});
  window.addEventListener('resize',()=>{if(window.innerWidth>760)setMenu(false)},{passive:true});
})();
