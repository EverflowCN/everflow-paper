(()=>{
  const body=document.body;
  const ASSET_VERSION='20260824-clean1';
  const asset=path=>`${path}?v=${ASSET_VERSION}`;
  const storage={
    get:key=>{try{return localStorage.getItem(key)}catch{return null}},
    set:(key,value)=>{try{localStorage.setItem(key,value)}catch{}}
  };

  if(storage.get('everflow-theme')==='dark')body.classList.add('dark');
  document.querySelectorAll('[data-theme]').forEach(btn=>btn.addEventListener('click',()=>{
    body.classList.toggle('dark');
    storage.set('everflow-theme',body.classList.contains('dark')?'dark':'light');
  }));

  const toast=(message,options={})=>{
    const type=options.type||'info';
    const title=options.title||({success:'操作成功',error:'操作失败',info:'提示'}[type]||'提示');
    let stack=document.querySelector('.evera-toast-stack');
    if(!stack){
      stack=document.createElement('div');
      stack.className='evera-toast-stack';stack.setAttribute('aria-live','polite');
      document.body.appendChild(stack);
    }
    const el=document.createElement('div');
    el.className=`evera-toast ${type}`;
    el.innerHTML=`<span class="evera-toast-icon">${type==='success'?'✓':type==='error'?'!':'i'}</span><div><strong></strong><p></p></div><button class="evera-toast-x" type="button" aria-label="关闭提示">×</button>`;
    el.querySelector('strong').textContent=title;
    el.querySelector('p').textContent=String(message||'');
    const remove=()=>el.remove();
    el.querySelector('button').addEventListener('click',remove);
    stack.appendChild(el);
    setTimeout(remove,Number(options.duration)||3600);
    return el;
  };
  const setBusy=(btn,busy,label)=>{
    if(!btn)return;
    if(busy){
      if(!btn.dataset.everaLabel)btn.dataset.everaLabel=btn.textContent;
      btn.disabled=true;btn.classList.add('is-busy');if(label)btn.textContent=label;
      return;
    }
    btn.disabled=false;btn.classList.remove('is-busy');btn.textContent=label||btn.dataset.everaLabel||btn.textContent;delete btn.dataset.everaLabel;
  };
  const complete=(btn,label='完成 ✓',restoreMs=1400)=>{
    if(!btn)return;
    const original=btn.dataset.everaLabel||btn.textContent;
    btn.classList.remove('is-busy');btn.disabled=true;btn.textContent=label;
    if(restoreMs>0)setTimeout(()=>{btn.disabled=false;btn.textContent=original;delete btn.dataset.everaLabel},restoreMs);
  };
  window.EveraUI={toast,setBusy,complete};

  const menu=document.querySelector('.mobile-panel');
  const menuButtons=[...document.querySelectorAll('[data-menu]')];
  const setMenu=open=>{
    if(!menu)return;
    menu.classList.toggle('open',open);body.classList.toggle('menu-open',open);
    menuButtons.forEach(btn=>btn.setAttribute('aria-expanded',open?'true':'false'));
  };
  menuButtons.forEach(btn=>{
    btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click',event=>{event.stopPropagation();setMenu(!menu?.classList.contains('open'))});
  });
  menu?.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false)});
  document.addEventListener('click',event=>{if(menu?.classList.contains('open')&&!menu.contains(event.target)&&!event.target.closest('[data-menu]'))setMenu(false)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')setMenu(false)});
  window.addEventListener('resize',()=>{if(window.innerWidth>900)setMenu(false)},{passive:true});

  import(asset('/assets/js/site-nav-v2.js')).catch(err=>console.error('Everflow navigation failed',err));
  if(body.dataset.view!=='zhenti')return;

  const navCss=document.createElement('link');
  navCss.rel='stylesheet';navCss.href=asset('/assets/css/zhenti-nav-layout-v5.css');document.head.appendChild(navCss);
  import(asset('/assets/js/zhenti-qwer.js')).catch(err=>console.error('Everflow 408 shortcuts failed',err));

  const srsFlow=import(asset('/assets/js/zhenti-srs-v2.js'))
    .then(()=>import(asset('/assets/js/zhenti-srs-error-v2.js')))
    .then(()=>import(asset('/assets/js/zhenti-srs-reset.js')))
    .catch(err=>console.error('Everflow 408 SRS failed',err));

  srsFlow.finally(async()=>{
    try{await import(asset('/assets/js/zhenti-favorites.js'))}catch(err){console.error('Everflow 408 favorites failed',err)}
    try{await import(asset('/assets/js/zhenti-srs-experience.js'))}catch(err){console.error('Everflow 408 immersive SRS failed',err)}
    try{await import(asset('/assets/js/zhenti-srs-mobile-immersive.js'))}catch(err){console.error('Everflow 408 mobile SRS failed',err)}
  });
  import(asset('/assets/js/zhenti-ui-polish.js')).catch(err=>console.error('Everflow 408 UI polish failed',err));
  import(asset('/assets/js/cloud-config.js'))
    .then(()=>import(asset('/assets/js/zhenti-cloud-sync.js')))
    .catch(err=>console.error('Everflow 408 cloud sync failed',err));
})();
