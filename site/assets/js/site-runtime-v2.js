(()=>{
  const body=document.body;
  const ASSET_VERSION='20260824-score1';
  const asset=path=>`${path}?v=${ASSET_VERSION}`;
  const storage={
    get:key=>{try{return localStorage.getItem(key)}catch{return null}},
    set:(key,value)=>{try{localStorage.setItem(key,value)}catch{}}
  };

  const ICONS={
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    moon:'<path d="M21 12.8A8 8 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    close:'<path d="M18 6 6 18M6 6l12 12"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    alert:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.7 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    minus:'<path d="M5 12h14"/>',
    chevronLeft:'<path d="m15 18-6-6 6-6"/>',
    chevronRight:'<path d="m9 18 6-6-6-6"/>',
    arrowLeft:'<path d="M19 12H5M11 18l-6-6 6-6"/>',
    arrowRight:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    pencil:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z"/>',
    star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
    eraser:'<path d="m7 20-4-4L14.5 4.5a2.1 2.1 0 0 1 3 0l2 2a2.1 2.1 0 0 1 0 3L9 20Z"/><path d="m11 8 5 5M7 20h13"/>',
    panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    keyboard:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M17 14h.01M7 14h6"/>'
  };
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iconMarkup=name=>`<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]||ICONS.info}</svg>`;
  window.EveraIcons={markup:iconMarkup,names:Object.keys(ICONS)};

  function iconOnly(el,name){if(!el)return;el.innerHTML=iconMarkup(name);el.classList.add('ui-icon-only');el.classList.remove('ui-iconized')}
  function iconText(el,name,label,position='start'){if(!el)return;const text=`<span>${escapeHtml(label)}</span>`;el.innerHTML=position==='end'?`${text}${iconMarkup(name)}`:`${iconMarkup(name)}${text}`;el.classList.add('ui-iconized');el.classList.remove('ui-icon-only')}
  function preserveLiveLabelIcon(el,name,labelSelector){if(!el)return;const label=el.querySelector(labelSelector);if(!label)return;[...el.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).forEach(node=>node.remove());if(!el.querySelector(':scope > .ui-icon'))el.insertAdjacentHTML('afterbegin',iconMarkup(name));el.classList.add('ui-iconized');el.classList.remove('ui-icon-only')}
  function syncThemeIcons(){document.querySelectorAll('[data-theme]').forEach(btn=>{iconOnly(btn,body.classList.contains('dark')?'sun':'moon');btn.setAttribute('aria-label',body.classList.contains('dark')?'切换浅色主题':'切换深色主题');btn.title=btn.getAttribute('aria-label')})}
  function upgradeControl(el){
    if(!(el instanceof Element))return;
    if(el.matches('[data-theme]'))return syncThemeIcons();
    if(el.matches('[data-menu]')){iconOnly(el,'menu');return}
    if(el.matches('.modal-clear')){iconOnly(el,'eraser');return}
    if(el.matches('.modal-close,.membership-close,.membership-nav-close,[data-drawer-close],[data-shortcut-close]')){iconOnly(el,'close');return}
    if(el.matches('[data-tool="analysis"]')){iconText(el,'book','看解析');return}
    if(el.matches('[data-tool="note"]')){iconText(el,'pencil','笔记');return}
    if(el.matches('[data-tool="timer"]')){preserveLiveLabelIcon(el,'clock','[data-timer-text]');return}
    if(el.matches('[data-prev-question],[data-paper-prev]')){iconText(el,'chevronLeft','上一题');return}
    if(el.matches('[data-next-question],[data-paper-next]')){iconText(el,'chevronRight','下一题','end');return}
    if(el.matches('[data-paper-exit]')){iconText(el,'arrowLeft','退出整套');return}
    if(el.matches('[data-manual-open]')){iconText(el,'plus','手动补录');return}
    if(el.matches('.question-favorite')){iconText(el,'star',el.classList.contains('active')?'已收藏':'收藏');return}
    if(el.matches('.shortcut-fab')){iconText(el,'keyboard','快捷键');const kbd=document.createElement('kbd');kbd.textContent='?';el.appendChild(kbd);return}
    const raw=(el.textContent||'').trim();if(!raw)return;
    const exact={'☰':'menu','◐':body.classList.contains('dark')?'sun':'moon','×':'close','✕':'close','＋':'plus','+':'plus','−':'minus','-':'minus','‹':'chevronLeft','›':'chevronRight','⌨':'keyboard'};
    if(exact[raw]){iconOnly(el,exact[raw]);return}
    const prefix=[['＋ ','plus'],['+ ','plus'],['← ','arrowLeft'],['‹ ','chevronLeft'],['✓ ','check'],['✕ ','close'],['✎ ','pencil'],['◷ ','clock'],['▣ ','book'],['★ ','star'],['☆ ','star'],['⌨ ','keyboard']];
    for(const [token,name] of prefix){if(raw.startsWith(token)){iconText(el,name,raw.slice(token.length));return}}
    const suffix=[[' →','arrowRight'],[' ›','chevronRight']];for(const [token,name] of suffix){if(raw.endsWith(token)){iconText(el,name,raw.slice(0,-token.length),'end');return}}
  }
  function upgradeResult(el){if(!(el instanceof Element))return;const raw=(el.textContent||'').trim();if(raw.startsWith('✓ '))iconText(el,'check',raw.slice(2));else if(raw.startsWith('✕ '))iconText(el,'close',raw.slice(2))}
  function upgradeScope(scope=document){const controls=[];if(scope instanceof Element&&scope.matches('button,a'))controls.push(scope);if(scope.querySelectorAll)controls.push(...scope.querySelectorAll('button,a'));controls.forEach(upgradeControl);const results=[];if(scope instanceof Element&&scope.matches('.answer-result strong'))results.push(scope);if(scope.querySelectorAll)results.push(...scope.querySelectorAll('.answer-result strong'));results.forEach(upgradeResult)}

  if(storage.get('everflow-theme')==='dark')body.classList.add('dark');
  upgradeScope(document);
  document.querySelectorAll('[data-theme]').forEach(btn=>btn.addEventListener('click',()=>{body.classList.toggle('dark');storage.set('everflow-theme',body.classList.contains('dark')?'dark':'light');syncThemeIcons()}));

  const observer=new MutationObserver(mutations=>{for(const mutation of mutations){if(mutation.type==='characterData'){const parent=mutation.target.parentElement;if(parent?.matches('button,a,.answer-result strong')){upgradeControl(parent);upgradeResult(parent)}continue}mutation.addedNodes.forEach(node=>{if(node.nodeType===Node.ELEMENT_NODE)upgradeScope(node);else if(node.nodeType===Node.TEXT_NODE&&node.parentElement?.matches('button,a,.answer-result strong')){upgradeControl(node.parentElement);upgradeResult(node.parentElement)}})}});
  observer.observe(body,{childList:true,subtree:true,characterData:true});

  const toast=(message,options={})=>{const type=options.type||'info',title=options.title||({success:'操作成功',error:'操作失败',info:'提示'}[type]||'提示');let stack=document.querySelector('.evera-toast-stack');if(!stack){stack=document.createElement('div');stack.className='evera-toast-stack';stack.setAttribute('aria-live','polite');document.body.appendChild(stack)}const el=document.createElement('div');el.className=`evera-toast ${type}`;const statusIcon=type==='success'?'check':type==='error'?'alert':'info';el.innerHTML=`<span class="evera-toast-icon">${iconMarkup(statusIcon)}</span><div><strong></strong><p></p></div><button class="evera-toast-x" type="button" aria-label="关闭提示">${iconMarkup('close')}</button>`;el.querySelector('strong').textContent=title;el.querySelector('p').textContent=String(message||'');const remove=()=>el.remove();el.querySelector('button').addEventListener('click',remove);stack.appendChild(el);setTimeout(remove,Number(options.duration)||3600);return el};
  const setBusy=(btn,busy,label)=>{if(!btn)return;if(busy){if(!btn.dataset.everaHtml)btn.dataset.everaHtml=btn.innerHTML;btn.disabled=true;btn.classList.add('is-busy');if(label)btn.textContent=label;return}btn.disabled=false;btn.classList.remove('is-busy');if(btn.dataset.everaHtml){btn.innerHTML=btn.dataset.everaHtml;delete btn.dataset.everaHtml}else if(label)btn.textContent=label};
  const complete=(btn,label='完成',restoreMs=1400)=>{if(!btn)return;const original=btn.dataset.everaHtml||btn.innerHTML,cleanLabel=String(label||'完成').replace(/[✓✔]\s*$/,'').trim()||'完成';btn.classList.remove('is-busy');btn.disabled=true;iconText(btn,'check',cleanLabel);if(restoreMs>0)setTimeout(()=>{btn.disabled=false;btn.innerHTML=original;delete btn.dataset.everaHtml;upgradeControl(btn)},restoreMs)};
  window.EveraUI={toast,setBusy,complete,icon:iconMarkup,upgradeIcons:upgradeScope};

  const menu=document.querySelector('.mobile-panel'),menuButtons=[...document.querySelectorAll('[data-menu]')];
  const setMenu=open=>{if(!menu)return;menu.classList.toggle('open',open);body.classList.toggle('menu-open',open);menuButtons.forEach(btn=>btn.setAttribute('aria-expanded',open?'true':'false'))};
  menuButtons.forEach(btn=>{btn.setAttribute('aria-expanded','false');btn.addEventListener('click',event=>{event.stopPropagation();setMenu(!menu?.classList.contains('open'))})});
  menu?.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false)});document.addEventListener('click',event=>{if(menu?.classList.contains('open')&&!menu.contains(event.target)&&!event.target.closest('[data-menu]'))setMenu(false)});document.addEventListener('keydown',event=>{if(event.key==='Escape')setMenu(false)});window.addEventListener('resize',()=>{if(window.innerWidth>900)setMenu(false)},{passive:true});

  import(asset('/assets/js/site-nav-v2.js')).then(()=>upgradeScope(document)).catch(err=>console.error('Everflow navigation failed',err));
  if(body.dataset.view!=='zhenti')return;
  const navCss=document.createElement('link');navCss.rel='stylesheet';navCss.href=asset('/assets/css/zhenti-nav-layout-v5.css');document.head.appendChild(navCss);
  import(asset('/assets/js/zhenti-qwer.js')).catch(err=>console.error('Everflow 408 shortcuts failed',err));
  const srsFlow=import(asset('/assets/js/zhenti-srs-v2.js')).then(()=>import(asset('/assets/js/zhenti-srs-error-v2.js'))).then(()=>import(asset('/assets/js/zhenti-srs-reset.js'))).catch(err=>console.error('Everflow 408 SRS failed',err));
  srsFlow.finally(async()=>{try{await import(asset('/assets/js/zhenti-favorites.js'))}catch(err){console.error('Everflow 408 favorites failed',err)}try{await import(asset('/assets/js/zhenti-srs-experience.js'))}catch(err){console.error('Everflow 408 immersive SRS failed',err)}try{await import(asset('/assets/js/zhenti-srs-mobile-immersive.js'))}catch(err){console.error('Everflow 408 mobile SRS failed',err)}});
  import(asset('/assets/js/zhenti-ui-polish.js')).catch(err=>console.error('Everflow 408 UI polish failed',err));
  import(asset('/assets/js/cloud-config.js')).then(()=>import(asset('/assets/js/zhenti-cloud-sync.js'))).catch(err=>console.error('Everflow 408 cloud sync failed',err));
})();
