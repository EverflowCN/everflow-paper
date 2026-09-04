(()=>{
  'use strict';
  if(window.__EVERFLOW_WORKSPACE_ICONS__)return;
  window.__EVERFLOW_WORKSPACE_ICONS__=true;

  const ICONS={
    overview:'<rect x="4" y="4" width="6" height="8" rx="1"/><rect x="14" y="4" width="6" height="4" rx="1"/><rect x="4" y="16" width="6" height="4" rx="1"/><rect x="14" y="12" width="6" height="8" rx="1"/>',
    analytics:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    membership:'<path d="M15 5v2M15 11v2M15 17v2"/><path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2Z"/>',
    codes:'<circle cx="8" cy="15" r="4"/><path d="m10.85 12.15 8.15-8.15M18 5l2 2M15 8l2 2"/>',
    notices:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    resources:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    quality:'<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    risks:'<path d="M10.3 3.7 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    feedback:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/>',
    oxygen:'<path d="M4 6h11a3 3 0 0 1 3 3v1M15 7l3 3 3-3M20 18H9a3 3 0 0 1-3-3v-1M9 17l-3-3-3 3"/>',
    audit:'<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    operations:'<path d="M4 7h10M4 17h16M14 4v6M9 14v6"/>',
    quota:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 16v-4M12 16V8M17 16v-6"/>',
    system:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21h-4v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3v-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3h4v.1a1.7 1.7 0 0 0 1.1 1.5 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.38.31.72.6 1 .29.28.65.42 1 .4h.1v4H21c-.39-.02-.75.12-1 .4-.29.28-.5.62-.6 1Z"/>',
    home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
    account:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    minus:'<path d="M5 12h14"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    close:'<path d="M18 6 6 18M6 6l12 12"/>'
  };
  const svg=name=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]||ICONS.overview}</svg>`;
  const iconWrap=name=>`<span class="ws-nav-icon" aria-hidden="true">${svg(name)}</span>`;

  function navKey(el){
    if(el.dataset.wsNav)return el.dataset.wsNav;
    if(el.hasAttribute('data-quota-active')||el.hasAttribute('data-ws-quota-entry'))return'quota';
    const href=el.getAttribute('href')||'';
    const hash=(href.match(/#([\w-]+)/)||[])[1];
    if(hash&&ICONS[hash])return hash;
    if(href.includes('limits'))return'quota';
    if(href.includes('account'))return'account';
    return'home';
  }
  function upgradeNav(){
    document.querySelectorAll('.ws3 .ws-nav button,.ws3 .ws-nav a').forEach(el=>{
      [...el.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).forEach(node=>node.remove());
      const key=navKey(el);
      let holder=el.querySelector(':scope > .ws-nav-icon');
      if(!holder){el.insertAdjacentHTML('afterbegin',iconWrap(key));holder=el.querySelector(':scope > .ws-nav-icon')}
      else if(holder.dataset.icon!==key)holder.innerHTML=svg(key);
      holder.dataset.icon=key;
    });
  }
  function iconOnly(el,name){
    if(!el||el.dataset.wsVectorIcon===name)return;
    el.dataset.wsVectorIcon=name;
    el.innerHTML=svg(name);
    el.classList.add('ws-vector-control');
    if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',name==='close'?'关闭':name==='plus'?'增加':'减少');
  }
  function upgradeControls(root=document){
    const query=(selector,icon)=>root.querySelectorAll?.(selector).forEach(el=>iconOnly(el,icon));
    query('[data-time-hour-dec],[data-time-minute-dec]','minus');
    query('[data-time-hour-inc],[data-time-minute-inc]','plus');
    query('.ws-drawer-close','close');
  }
  function installStyle(){
    if(document.getElementById('everflow-workspace-vector-icons'))return;
    const style=document.createElement('style');
    style.id='everflow-workspace-vector-icons';
    style.textContent='.ws3 .ws-vector-control{font-size:0!important;line-height:0!important;color:#737a84!important;display:grid!important;place-items:center!important}.ws3 .ws-vector-control::before,.ws3 .ws-vector-control::after{content:none!important;display:none!important}.ws3 .ws-vector-control>svg{display:block;width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}.ws3 .ws-drawer-close.ws-vector-control{color:#5f6570!important}.ws3 .ws-nav-icon svg{vector-effect:non-scaling-stroke}';
    document.head.appendChild(style);
  }
  function upgrade(root=document){upgradeNav();upgradeControls(root)}
  function boot(){installStyle();upgrade()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  const observer=new MutationObserver(mutations=>{
    let needsNav=false;
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        if(node.nodeType!==Node.ELEMENT_NODE)continue;
        if(node.matches?.('.ws-nav,.ws-nav *'))needsNav=true;
        upgradeControls(node);
      }
    }
    if(needsNav)upgradeNav();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
