(()=>{
  if(document.body?.dataset?.view!=='zhenti')return;
  const home=document.querySelector('[data-srs-home]');
  const bar=document.querySelector('.wall-subject-bar');
  if(!home||!bar)return;

  const css=document.createElement('link');
  css.rel='stylesheet';css.href='/assets/css/zhenti-srs-experience.css?v=20260823a';document.head.appendChild(css);

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