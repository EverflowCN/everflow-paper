(()=>{
  'use strict';
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const iconPaths={
    overview:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    analytics:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    membership:'<path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 2.45-3c.55 1.08 2.05 3 2.05 3ZM12 7h4.5a2.5 2.5 0 1 0-2.45-3C13.5 5.08 12 7 12 7Z"/>',
    codes:'<path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7M14 14l7 7M3 3l7 7"/>',notices:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    resources:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',questions:'<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    quality:'<path d="m9 12 2 2 4-4M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/>',risks:'<path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01"/>',feedback:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
    oxygen:'<path d="M8 2v4M16 2v4M4 10h16M5 6h14a2 2 0 0 1 2 2v12H3V8a2 2 0 0 1 2-2ZM8 14h3v3H8z"/>',audit:'<path d="M9 11h6M9 15h6M5 3h14v18H5zM9 3V1h6v2"/>',operations:'<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H2v-4h.6A1.7 1.7 0 0 0 4.2 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.6 4.2a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V2h4v.6a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8.6a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1 .4h1v4h-1a1.7 1.7 0 0 0-1.6 1Z"/>',
    system:'<path d="M4 17V7M8 14V4M12 20V10M16 16V6M20 19V9"/>',home:'<path d="m3 11 9-8 9 8v10h-6v-6H9v6H3Z"/>',account:'<path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/>',article:'<path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',collapse:'<path d="m14 7-5 5 5 5"/>',expand:'<path d="m10 7 5 5-5 5"/>',refresh:'<path d="M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7"/>'
  };
  const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name]||iconPaths.overview}</svg>`;
  const side=$('.ws-side'),menuButton=$('[data-ws-menu]'),sideButton=$('[data-ws-sidebar-toggle]'),navBackdrop=$('[data-ws-nav-backdrop]');
  const commandBackdrop=$('[data-ws-command-backdrop]'),commandInput=$('[data-ws-command-input]'),commandResults=$('[data-ws-command-results]');
  let commandItems=[],visibleItems=[],selectedIndex=0;

  function addIcons(){
    $$('[data-ws-nav]').forEach(node=>{if(node.querySelector('.ws-nav-icon'))return;const span=document.createElement('span');span.className='ws-nav-icon';span.innerHTML=icon(node.dataset.wsNav);node.prepend(span);node.title=node.textContent.trim()});
    $$('.ws-side .ws-nav a').forEach(node=>{if(node.querySelector('.ws-nav-icon'))return;const href=node.getAttribute('href')||'',name=href.includes('account')?'account':href.includes('admin')?'article':'home',span=document.createElement('span');span.className='ws-nav-icon';span.innerHTML=icon(name);node.prepend(span);node.title=node.textContent.trim()});
    if(menuButton)menuButton.innerHTML=icon('menu');if(sideButton)sideButton.innerHTML=icon('collapse');
    const triggerIcon=$('[data-ws-command-icon]'),searchIcon=$('[data-ws-command-search-icon]');if(triggerIcon)triggerIcon.innerHTML=icon('search');if(searchIcon)searchIcon.innerHTML=icon('search');
  }
  function groupFor(node){let current=node.closest('.ws-nav')?.previousElementSibling;return current?.classList.contains('ws-label')?current.textContent.trim():'快捷操作'}
  function buildCommandItems(){
    commandItems=$$('[data-ws-nav]').map(node=>({label:node.textContent.trim(),group:groupFor(node),hint:'打开页面',icon:node.dataset.wsNav,node}));
    commandItems.push({label:'刷新全部数据',group:'快捷操作',hint:'重新读取后台数据',icon:'refresh',node:$('[data-ws-refresh]')});
    $$('.ws-side .ws-nav a').forEach(node=>commandItems.push({label:node.textContent.trim(),group:'快捷入口',hint:node.getAttribute('href')||'',icon:node.getAttribute('href')?.includes('account')?'account':node.getAttribute('href')?.includes('admin')?'article':'home',node}));
  }
  function renderCommands(query=''){
    const normalized=query.trim().toLowerCase();visibleItems=commandItems.filter(item=>!normalized||`${item.label} ${item.group} ${item.hint}`.toLowerCase().includes(normalized));selectedIndex=Math.min(selectedIndex,Math.max(0,visibleItems.length-1));
    if(!visibleItems.length){commandResults.innerHTML='<div class="ws-command-empty">没有找到对应功能</div>';return}
    const groups=[];for(const item of visibleItems){let group=groups.find(entry=>entry.name===item.group);if(!group){group={name:item.group,items:[]};groups.push(group)}group.items.push(item)}
    let flat=0;commandResults.innerHTML=groups.map(group=>`<div class="ws-command-group">${esc(group.name)}</div>${group.items.map(item=>{const index=flat++;return`<button class="ws-command-item ${index===selectedIndex?'selected':''}" type="button" data-ws-command-index="${index}"><span class="ws-nav-icon">${icon(item.icon)}</span><span><strong>${esc(item.label)}</strong><small>${esc(item.hint)}</small></span><kbd>↵</kbd></button>`}).join('')}`).join('');
  }
  function openCommand(){if(!commandBackdrop)return;commandBackdrop.hidden=false;commandInput.value='';selectedIndex=0;renderCommands();requestAnimationFrame(()=>commandInput.focus())}
  function closeCommand(){if(commandBackdrop)commandBackdrop.hidden=true}
  function runCommand(index=selectedIndex){const item=visibleItems[index];if(!item?.node)return;closeCommand();item.node.click()}
  function isMobile(){return matchMedia('(max-width:980px)').matches}
  function closeMobileNav(){document.body.classList.remove('ws-mobile-nav-open');if(navBackdrop)navBackdrop.hidden=true;menuButton?.setAttribute('aria-expanded','false')}
  function toggleNavigation(){
    if(isMobile()){const open=!document.body.classList.contains('ws-mobile-nav-open');document.body.classList.toggle('ws-mobile-nav-open',open);if(navBackdrop)navBackdrop.hidden=!open;menuButton?.setAttribute('aria-expanded',String(open));return}
    const collapsed=!document.body.classList.contains('ws-sidebar-collapsed');document.body.classList.toggle('ws-sidebar-collapsed',collapsed);try{localStorage.setItem('everflow-workspace-sidebar-v1',collapsed?'collapsed':'open')}catch{}sideButton.innerHTML=icon(collapsed?'expand':'collapse');sideButton.setAttribute('aria-label',collapsed?'展开侧边栏':'收起侧边栏');sideButton.title=collapsed?'展开侧边栏':'收起侧边栏';
  }
  function restoreNavigation(){if(isMobile())return;let collapsed=false;try{collapsed=localStorage.getItem('everflow-workspace-sidebar-v1')==='collapsed'}catch{}document.body.classList.toggle('ws-sidebar-collapsed',collapsed);if(sideButton){sideButton.innerHTML=icon(collapsed?'expand':'collapse');sideButton.setAttribute('aria-label',collapsed?'展开侧边栏':'收起侧边栏');sideButton.title=collapsed?'展开侧边栏':'收起侧边栏'}}
  function setBadge(id,value){const node=$(`[data-ws-nav="${id}"]`);if(!node)return;let badge=node.querySelector('.ws-nav-badge');const count=Number(value)||0;if(!count){badge?.remove();return}if(!badge){badge=document.createElement('b');badge.className='ws-nav-badge';node.appendChild(badge)}badge.textContent=count>99?'99+':String(count)}

  addIcons();buildCommandItems();restoreNavigation();
  menuButton?.addEventListener('click',toggleNavigation);sideButton?.addEventListener('click',toggleNavigation);navBackdrop?.addEventListener('click',closeMobileNav);
  $('[data-ws-command]')?.addEventListener('click',openCommand);commandBackdrop?.addEventListener('click',event=>{if(event.target===commandBackdrop)closeCommand()});
  commandInput?.addEventListener('input',()=>{selectedIndex=0;renderCommands(commandInput.value)});commandResults?.addEventListener('click',event=>{const button=event.target.closest('[data-ws-command-index]');if(button)runCommand(Number(button.dataset.wsCommandIndex))});
  document.addEventListener('keydown',event=>{
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();commandBackdrop?.hidden?openCommand():closeCommand();return}
    if(commandBackdrop?.hidden)return;if(event.key==='Escape'){event.preventDefault();closeCommand()}else if(event.key==='ArrowDown'){event.preventDefault();selectedIndex=(selectedIndex+1)%Math.max(1,visibleItems.length);renderCommands(commandInput.value);commandResults.querySelector('.selected')?.scrollIntoView({block:'nearest'})}else if(event.key==='ArrowUp'){event.preventDefault();selectedIndex=(selectedIndex-1+Math.max(1,visibleItems.length))%Math.max(1,visibleItems.length);renderCommands(commandInput.value);commandResults.querySelector('.selected')?.scrollIntoView({block:'nearest'})}else if(event.key==='Enter'){event.preventDefault();runCommand()}
  });
  document.addEventListener('everflow:workspace-section',event=>{closeMobileNav();const id=event.detail?.id;$$('[data-ws-nav]').forEach(node=>node.toggleAttribute('aria-current',node.dataset.wsNav===id));document.title=`${event.detail?.title||'管理工作台'} · Everflow`});
  document.addEventListener('everflow:workspace-data',event=>{const data=event.detail||{},quality=data.quality||{};setBadge('feedback',quality.summary?.openFeedback);setBadge('risks',quality.summary?.highRisks);setBadge('quality',quality.summary?.qualityIssues)});
  document.addEventListener('everflow:question-workbench-summary',event=>{const detail=event.detail||{};setBadge('questions',(Number(detail.drafts)||0)+(Number(detail.issues)||0))});
  addEventListener('resize',()=>{if(!isMobile())closeMobileNav()},{passive:true});
  const initial=location.hash.slice(1)||'overview';$$('[data-ws-nav]').forEach(node=>node.toggleAttribute('aria-current',node.dataset.wsNav===initial));
})();
