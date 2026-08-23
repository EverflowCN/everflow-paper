(()=>{
  if(document.body?.dataset?.view!=='zhenti')return;
  const style=document.createElement('style');
  style.id='everflow-srs-mobile-immersive-fix';
  style.textContent=`
  @media(max-width:720px){
    .srs-home:fullscreen .srs-toolbar-v2,
    .srs-home:-webkit-full-screen .srs-toolbar-v2,
    body.srs-immersive-fallback .srs-home .srs-toolbar-v2{display:none!important}

    .srs-home:fullscreen .srs-immersive-bar,
    .srs-home:-webkit-full-screen .srs-immersive-bar,
    body.srs-immersive-fallback .srs-home .srs-immersive-bar{
      display:block!important;position:fixed!important;top:calc(env(safe-area-inset-top) + 8px);right:10px;left:auto;width:auto;min-height:0!important;padding:0!important;border:0!important;background:transparent!important;backdrop-filter:none!important;box-shadow:none!important;z-index:80;pointer-events:none
    }
    .srs-home:fullscreen .srs-immersive-title,
    .srs-home:-webkit-full-screen .srs-immersive-title,
    body.srs-immersive-fallback .srs-home .srs-immersive-title,
    .srs-home:fullscreen .srs-immersive-meta,
    .srs-home:-webkit-full-screen .srs-immersive-meta,
    body.srs-immersive-fallback .srs-home .srs-immersive-meta,
    .srs-home:fullscreen .srs-side-toggle,
    .srs-home:-webkit-full-screen .srs-side-toggle,
    body.srs-immersive-fallback .srs-home .srs-side-toggle{display:none!important}

    .srs-home:fullscreen .srs-immersive-actions,
    .srs-home:-webkit-full-screen .srs-immersive-actions,
    body.srs-immersive-fallback .srs-home .srs-immersive-actions{display:block!important;pointer-events:auto}
    .srs-home:fullscreen .srs-exit-full,
    .srs-home:-webkit-full-screen .srs-exit-full,
    body.srs-immersive-fallback .srs-home .srs-exit-full{
      height:36px!important;padding:0 12px!important;border-radius:12px!important;border:1px solid rgba(255,255,255,.08)!important;background:rgba(16,17,22,.94)!important;color:#fff!important;box-shadow:0 8px 24px rgba(0,0,0,.16)!important;font-size:11px!important
    }

    .srs-home:fullscreen .srs-stage,
    .srs-home:-webkit-full-screen .srs-stage,
    body.srs-immersive-fallback .srs-home .srs-stage{display:block!important;min-height:100dvh!important;height:100dvh!important;overflow:hidden!important}
    .srs-home:fullscreen .srs-card-shell,
    .srs-home:-webkit-full-screen .srs-card-shell,
    body.srs-immersive-fallback .srs-home .srs-card-shell{height:100dvh!important;min-height:100dvh!important;overflow:auto!important;border:0!important;border-radius:0!important;background:var(--paper)!important}
    .srs-home:fullscreen .srs-progress,
    .srs-home:-webkit-full-screen .srs-progress,
    body.srs-immersive-fallback .srs-home .srs-progress{position:sticky;top:0;z-index:20;height:3px!important}
    .srs-home:fullscreen .srs-card,
    .srs-home:-webkit-full-screen .srs-card,
    body.srs-immersive-fallback .srs-home .srs-card{max-width:none!important;margin:0!important;padding:calc(env(safe-area-inset-top) + 18px) 14px calc(env(safe-area-inset-bottom) + 28px)!important}
    .srs-home:fullscreen .srs-side,
    .srs-home:-webkit-full-screen .srs-side,
    body.srs-immersive-fallback .srs-home .srs-side{display:none!important}
  }
  `;
  document.head.appendChild(style);
})();
