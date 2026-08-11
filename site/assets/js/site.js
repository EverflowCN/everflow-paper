(()=>{
  const body=document.body;
  const saved=localStorage.getItem('everflow-theme');
  if(saved==='dark')body.classList.add('dark');

  document.querySelectorAll('[data-theme]').forEach(btn=>btn.addEventListener('click',()=>{
    body.classList.toggle('dark');
    localStorage.setItem('everflow-theme',body.classList.contains('dark')?'dark':'light');
  }));

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
