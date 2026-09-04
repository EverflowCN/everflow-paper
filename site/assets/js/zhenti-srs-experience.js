(()=>{
  if(document.body?.dataset?.view!=='zhenti')return;
  const home=document.querySelector('[data-srs-home]');
  const bar=document.querySelector('.wall-subject-bar');
  if(!home||!bar)return;

  if(!document.querySelector('link[href*="zhenti-srs-experience.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/zhenti-srs-experience.css?v=20260823a';document.head.appendChild(css)}

  // Final top-navigation layout: modes / subjects / cloud status are different levels.
  // Desktop keeps a single balanced row; tablet becomes two rows; phone keeps two compact scrollable rows.
  const navStyle=document.createElement('style');
  navStyle.id='everflow-zhenti-nav-layout-v4';
  navStyle.textContent=`
    .wall-subject-bar.has-srs-groups{
      display:grid!important;
      grid-template-columns:auto minmax(0,1fr) auto!important;
      align-items:center!important;
      justify-content:stretch!important;
      gap:18px!important;
      padding:10px clamp(16px,2.4vw,44px)!important;
      overflow:visible!important;
    }
    .wall-subject-bar.has-srs-groups .srs-mode-group,
    .wall-subject-bar.has-srs-groups .srs-subject-group{
      display:flex!important;
      align-items:center!important;
      gap:8px!important;
      min-width:0;
      padding:0!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      box-shadow:none!important;
    }
    .wall-subject-bar.has-srs-groups .srs-mode-group{justify-self:start!important}
    .wall-subject-bar.has-srs-groups .srs-subject-group{justify-self:center!important}
    .wall-subject-bar.has-srs-groups .srs-mode-group .subject-tab,
    .wall-subject-bar.has-srs-groups .srs-subject-group .subject-tab{
      min-height:40px!important;
      padding:0 17px!important;
      border:1px solid var(--line)!important;
      border-radius:13px!important;
      background:color-mix(in srgb,var(--soft) 78%,var(--card))!important;
      color:var(--muted)!important;
      box-shadow:none!important;
      white-space:nowrap!important;
    }
    .wall-subject-bar.has-srs-groups .srs-mode-group .subject-tab{font-weight:900!important}
    .wall-subject-bar.has-srs-groups .srs-subject-group .subject-tab{font-weight:800!important}
    .wall-subject-bar.has-srs-groups .srs-mode-group .subject-tab:hover,
    .wall-subject-bar.has-srs-groups .srs-subject-group .subject-tab:hover{
      border-color:color-mix(in srgb,var(--red) 24%,var(--line))!important;
      color:var(--ink)!important;
      background:var(--card)!important;
    }
    .wall-subject-bar.has-srs-groups .srs-mode-group .subject-tab.active,
    .wall-subject-bar.has-srs-groups .srs-subject-group .subject-tab.active{
      border-color:var(--red)!important;
      background:var(--red)!important;
      color:#fff!important;
      box-shadow:0 7px 18px rgba(243,18,36,.14)!important;
    }
    .wall-subject-bar.has-srs-groups>.zhenti-cloud-status{
      justify-self:end!important;
      align-self:center!important;
      margin-left:0!important;
      min-height:30px!important;
      padding:0 8px!important;
      border-color:transparent!important;
      background:transparent!important;
      box-shadow:none!important;
      font-size:10px!important;
    }
    .wall-subject-bar.has-srs-groups>.zhenti-cloud-status i{width:7px;height:7px}

    @media(max-width:1180px) and (min-width:721px){
      .wall-subject-bar.has-srs-groups{
        grid-template-columns:minmax(0,1fr) auto!important;
        grid-template-areas:'modes sync' 'subjects subjects';
        gap:8px 12px!important;
        padding:9px 16px 10px!important;
      }
      .wall-subject-bar.has-srs-groups .srs-mode-group{grid-area:modes;justify-self:start!important}
      .wall-subject-bar.has-srs-groups .srs-subject-group{
        grid-area:subjects;
        justify-self:stretch!important;
        width:100%;
        overflow-x:auto;
        padding-bottom:1px!important;
        scrollbar-width:none;
      }
      .wall-subject-bar.has-srs-groups .srs-subject-group::-webkit-scrollbar{display:none}
      .wall-subject-bar.has-srs-groups>.zhenti-cloud-status{grid-area:sync}
    }

    @media(max-width:720px){
      .wall-subject-bar.has-srs-groups{
        display:grid!important;
        grid-template-columns:1fr!important;
        gap:7px!important;
        padding:8px 10px!important;
        overflow:hidden!important;
      }
      .wall-subject-bar.has-srs-groups .srs-mode-group,
      .wall-subject-bar.has-srs-groups .srs-subject-group{
        justify-self:stretch!important;
        width:100%;
        overflow-x:auto;
        gap:6px!important;
        scrollbar-width:none;
      }
      .wall-subject-bar.has-srs-groups .srs-mode-group::-webkit-scrollbar,
      .wall-subject-bar.has-srs-groups .srs-subject-group::-webkit-scrollbar{display:none}
      .wall-subject-bar.has-srs-groups .srs-mode-group .subject-tab,
      .wall-subject-bar.has-srs-groups .srs-subject-group .subject-tab{
        flex:0 0 auto;
        min-height:34px!important;
        padding:0 12px!important;
        border-radius:11px!important;
        font-size:11px!important;
      }
      .wall-subject-bar.has-srs-groups>.zhenti-cloud-status{
        position:fixed!important;
        right:10px!important;
        bottom:calc(12px + env(safe-area-inset-bottom))!important;
        z-index:90!important;
        width:34px!important;
        min-width:34px!important;
        height:34px!important;
        padding:0!important;
        border:1px solid var(--line)!important;
        border-radius:999px!important;
        background:color-mix(in srgb,var(--card) 94%,transparent)!important;
        box-shadow:0 8px 24px rgba(0,0,0,.12)!important;
        backdrop-filter:blur(16px)!important;
      }
      .wall-subject-bar.has-srs-groups>.zhenti-cloud-status span{display:none!important}
    }
  `;
  if(!document.querySelector('link[href*="zhenti-nav-layout-v5.css"]'))document.head.appendChild(navStyle);

  // Separate page modes from subject filters for clearer hierarchy.
  if(!bar.classList.contains('has-srs-groups')){
    const modeButtons=[bar.querySelector('[data-main-subject="all"]'),bar.querySelector('[data-srs-tab]'),bar.querySelector('[data-favorites-tab]')].filter(Boolean);
    const subjectButtons=[...bar.querySelectorAll('[data-main-subject]:not([data-main-subject="all"])')];
    const modeGroup=document.createElement('div');modeGroup.className='srs-mode-group';modeGroup.setAttribute('aria-label','刷题模式');
    const subjectGroup=document.createElement('div');subjectGroup.className='srs-subject-group';subjectGroup.setAttribute('aria-label','408 科目');
    modeButtons.forEach(btn=>modeGroup.appendChild(btn));subjectButtons.forEach(btn=>subjectGroup.appendChild(btn));
    const divider=bar.querySelector('.subject-divider');if(divider)divider.remove();
    bar.append(modeGroup,subjectGroup);bar.classList.add('has-srs-groups');
  }

  const settings=home.querySelector('.srs-settings');
  if(!settings)return;
  const fullscreenBtn=document.createElement('button');
  fullscreenBtn.type='button';fullscreenBtn.className='srs-fullscreen-btn';fullscreenBtn.dataset.srsFullscreen='';fullscreenBtn.innerHTML='⛶ 畅享全屏';
  const resetBtn=settings.querySelector('.srs-reset-btn');if(resetBtn)settings.insertBefore(fullscreenBtn,resetBtn);else settings.appendChild(fullscreenBtn);

  const shortcuts=home.querySelector('.srs-shortcuts');
  if(shortcuts){shortcuts.insertAdjacentHTML('beforeend','<span>畅享全屏</span><kbd>Shift + F</kbd>')}

  const immersiveBar=document.createElement('div');immersiveBar.className='srs-immersive-bar';immersiveBar.innerHTML=`
    <div class="srs-immersive-title"><span class="srs-immersive-mark">408</span><div><strong>速刷卡片 · 畅享全屏</strong><span data-srs-immersive-scope>全部科目 · 全部题型</span></div></div>
    <div class="srs-immersive-meta"><span>待复习 <b data-srs-immersive-due>0</b></span><span>今日已刷 <b data-srs-immersive-reviewed>0</b></span></div>
    <div class="srs-immersive-actions"><button type="button" class="srs-side-toggle" data-srs-side-toggle>隐藏侧栏</button><button type="button" class="srs-exit-full" data-srs-exit-full>退出全屏</button></div>`;
  home.prepend(immersiveBar);

  const scopeEl=immersiveBar.querySelector('[data-srs-immersive-scope]');
  const dueEl=immersiveBar.querySelector('[data-srs-immersive-due]');
  const reviewedEl=immersiveBar.querySelector('[data-srs-immersive-reviewed]');
  const sideBtn=immersiveBar.querySelector('[data-srs-side-toggle]');
  const exitBtn=immersiveBar.querySelector('[data-srs-exit-full]');
  const dueSource=home.querySelector('[data-srs-due]');
  const reviewedSource=home.querySelector('[data-srs-reviewed]');

  function activeText(selector,fallback){return home.querySelector(`${selector}.active`)?.textContent?.trim()||fallback}
  function updateImmersiveInfo(){
    scopeEl.textContent=`${activeText('[data-srs-filter]','全部')} · ${activeText('[data-srs-type]','全部题型')}`;
    dueEl.textContent=dueSource?.textContent?.trim()||'0';reviewedEl.textContent=reviewedSource?.textContent?.trim()||'0';
    sideBtn.textContent=home.classList.contains('srs-side-collapsed')?'显示侧栏':'隐藏侧栏';
  }

  function isNativeFullscreen(){return document.fullscreenElement===home||document.webkitFullscreenElement===home}
  function isImmersive(){return isNativeFullscreen()||document.body.classList.contains('srs-immersive-fallback')}
  async function enterImmersive(){
    home.classList.toggle('srs-side-collapsed',window.innerWidth<=1100);
    updateImmersiveInfo();
    try{
      const request=home.requestFullscreen||home.webkitRequestFullscreen;
      if(request){await request.call(home);return}
    }catch(err){console.warn('Native fullscreen unavailable, using CSS fallback',err)}
    document.body.classList.add('srs-immersive-fallback');
    fullscreenBtn.textContent='退出全屏';
  }
  async function exitImmersive(){
    document.body.classList.remove('srs-immersive-fallback');
    try{
      if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen();
      else if(document.webkitFullscreenElement&&document.webkitExitFullscreen)document.webkitExitFullscreen();
    }catch{}
    home.classList.remove('srs-side-collapsed');
    fullscreenBtn.innerHTML='⛶ 畅享全屏';
    updateImmersiveInfo();
  }
  function syncFullscreenState(){
    const active=isImmersive();fullscreenBtn.innerHTML=active?'退出全屏':'⛶ 畅享全屏';
    if(!active)home.classList.remove('srs-side-collapsed');updateImmersiveInfo();
  }

  fullscreenBtn.addEventListener('click',()=>isImmersive()?exitImmersive():enterImmersive());
  exitBtn.addEventListener('click',exitImmersive);
  sideBtn.addEventListener('click',()=>{home.classList.toggle('srs-side-collapsed');updateImmersiveInfo()});
  home.querySelectorAll('[data-srs-filter],[data-srs-type]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(updateImmersiveInfo,0)));
  document.addEventListener('fullscreenchange',syncFullscreenState);document.addEventListener('webkitfullscreenchange',syncFullscreenState);

  // Window capture runs before the SRS document-level shortcut handler.
  window.addEventListener('keydown',e=>{
    if(home.hidden)return;
    const el=document.activeElement;if(el&&(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.isContentEditable))return;
    if(e.shiftKey&&String(e.key).toUpperCase()==='F'){
      e.preventDefault();e.stopImmediatePropagation();isImmersive()?exitImmersive():enterImmersive();return;
    }
    if(isImmersive()&&e.key==='Escape'){
      // Prevent SRS's normal Esc handler from leaving card mode while fullscreen is active.
      e.stopImmediatePropagation();
      if(document.body.classList.contains('srs-immersive-fallback')){e.preventDefault();exitImmersive()}
      return;
    }
  },true);

  // Read-only observers: they never modify observed nodes, so no feedback loop.
  const statsObserver=new MutationObserver(updateImmersiveInfo);
  [dueSource,reviewedSource].filter(Boolean).forEach(node=>statsObserver.observe(node,{childList:true,characterData:true,subtree:true}));
  updateImmersiveInfo();
})();
