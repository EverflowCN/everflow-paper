(()=>{
  if(document.body?.dataset?.view!=='zhenti')return;
  const style=document.createElement('style');
  style.id='everflow-srs-mobile-immersive-fix';
  style.textContent=`
  @media(max-width:720px){
    /* 手机全屏：只保留进度条 + 极简题目信息，不保留桌面工具栏。 */
    .srs-home:fullscreen .srs-toolbar-v2,
    .srs-home:-webkit-full-screen .srs-toolbar-v2,
    body.srs-immersive-fallback .srs-home .srs-toolbar-v2{display:none!important}

    .srs-home:fullscreen .srs-immersive-bar,
    .srs-home:-webkit-full-screen .srs-immersive-bar,
    body.srs-immersive-fallback .srs-home .srs-immersive-bar{
      display:block!important;position:fixed!important;
      top:calc(env(safe-area-inset-top) + 9px);right:12px;left:auto;width:auto;min-height:0!important;
      padding:0!important;border:0!important;background:transparent!important;backdrop-filter:none!important;
      box-shadow:none!important;z-index:90;pointer-events:none
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

    /* “退出全屏”改成右上角小型 ×，不再用大黑块抢视觉。 */
    .srs-home:fullscreen .srs-exit-full,
    .srs-home:-webkit-full-screen .srs-exit-full,
    body.srs-immersive-fallback .srs-home .srs-exit-full{
      width:36px!important;height:36px!important;padding:0!important;border-radius:999px!important;
      border:1px solid color-mix(in srgb,var(--ink) 10%,var(--line))!important;
      background:color-mix(in srgb,var(--card) 92%,transparent)!important;color:transparent!important;
      box-shadow:0 6px 18px rgba(0,0,0,.10)!important;font-size:0!important;backdrop-filter:blur(16px)!important;
      position:relative!important
    }
    .srs-home:fullscreen .srs-exit-full::before,
    .srs-home:-webkit-full-screen .srs-exit-full::before,
    body.srs-immersive-fallback .srs-home .srs-exit-full::before{
      content:'×';position:absolute;inset:0;display:grid;place-items:center;color:var(--ink);font:500 24px/1 system-ui
    }

    .srs-home:fullscreen .srs-stage,
    .srs-home:-webkit-full-screen .srs-stage,
    body.srs-immersive-fallback .srs-home .srs-stage{display:block!important;min-height:100dvh!important;height:100dvh!important;overflow:hidden!important}
    .srs-home:fullscreen .srs-card-shell,
    .srs-home:-webkit-full-screen .srs-card-shell,
    body.srs-immersive-fallback .srs-home .srs-card-shell{
      height:100dvh!important;min-height:100dvh!important;overflow:auto!important;border:0!important;border-radius:0!important;background:var(--paper)!important
    }
    .srs-home:fullscreen .srs-progress,
    .srs-home:-webkit-full-screen .srs-progress,
    body.srs-immersive-fallback .srs-home .srs-progress{position:sticky;top:0;z-index:30;height:3px!important;background:color-mix(in srgb,var(--line) 55%,transparent)!important}

    .srs-home:fullscreen .srs-card,
    .srs-home:-webkit-full-screen .srs-card,
    body.srs-immersive-fallback .srs-home .srs-card{
      max-width:none!important;margin:0!important;padding:calc(env(safe-area-inset-top) + 17px) 15px calc(env(safe-area-inset-bottom) + 28px)!important
    }

    /* 顶部元信息改成一行轻量文本：年份题号 / 科目 / 题型。 */
    .srs-home:fullscreen .srs-card-meta,
    .srs-home:-webkit-full-screen .srs-card-meta,
    body.srs-immersive-fallback .srs-home .srs-card-meta{
      display:flex!important;align-items:center!important;gap:0!important;min-height:36px;margin:0 44px 22px 0!important;
      padding:0!important;flex-wrap:nowrap!important;overflow:hidden
    }
    .srs-home:fullscreen .srs-card-meta .srs-chip,
    .srs-home:-webkit-full-screen .srs-card-meta .srs-chip,
    body.srs-immersive-fallback .srs-home .srs-card-meta .srs-chip{
      flex:0 0 auto;min-height:auto!important;height:auto!important;padding:0!important;border:0!important;border-radius:0!important;
      background:transparent!important;color:var(--muted)!important;font-size:11px!important;font-weight:750!important;white-space:nowrap
    }
    .srs-home:fullscreen .srs-card-meta .srs-chip + .srs-chip::before,
    .srs-home:-webkit-full-screen .srs-card-meta .srs-chip + .srs-chip::before,
    body.srs-immersive-fallback .srs-home .srs-card-meta .srs-chip + .srs-chip::before{content:'·';margin:0 7px;color:color-mix(in srgb,var(--muted) 55%,transparent)}

    /* 新卡、错误率、记忆率下沉：全屏手机顶部不堆标签。 */
    .srs-home:fullscreen .srs-card-meta .srs-chip.new,
    .srs-home:-webkit-full-screen .srs-card-meta .srs-chip.new,
    body.srs-immersive-fallback .srs-home .srs-card-meta .srs-chip.new,
    .srs-home:fullscreen .srs-card-meta .srs-chip.due,
    .srs-home:-webkit-full-screen .srs-card-meta .srs-chip.due,
    body.srs-immersive-fallback .srs-home .srs-card-meta .srs-chip.due,
    .srs-home:fullscreen .srs-card-meta .srs-error-rate,
    .srs-home:-webkit-full-screen .srs-card-meta .srs-error-rate,
    body.srs-immersive-fallback .srs-home .srs-card-meta .srs-error-rate,
    .srs-home:fullscreen .srs-card-meta .srs-memory,
    .srs-home:-webkit-full-screen .srs-card-meta .srs-memory,
    body.srs-immersive-fallback .srs-home .srs-card-meta .srs-memory{display:none!important}

    /* 因为第一枚“新卡/到期”被隐藏，避免第一个可见标签前出现多余分隔点。 */
    .srs-home:fullscreen .srs-card-meta .srs-chip.new + .srs-chip::before,
    .srs-home:-webkit-full-screen .srs-card-meta .srs-chip.new + .srs-chip::before,
    body.srs-immersive-fallback .srs-home .srs-card-meta .srs-chip.new + .srs-chip::before,
    .srs-home:fullscreen .srs-card-meta .srs-chip.due + .srs-chip::before,
    .srs-home:-webkit-full-screen .srs-card-meta .srs-chip.due + .srs-chip::before,
    body.srs-immersive-fallback .srs-home .srs-card-meta .srs-chip.due + .srs-chip::before{content:none!important}

    .srs-home:fullscreen .srs-side,
    .srs-home:-webkit-full-screen .srs-side,
    body.srs-immersive-fallback .srs-home .srs-side{display:none!important}

    /* 题干在顶部信息结束后立即开始，减少无效留白。 */
    .srs-home:fullscreen .srs-question,
    .srs-home:-webkit-full-screen .srs-question,
    body.srs-immersive-fallback .srs-home .srs-question{margin-top:0!important}
  }
  `;
  document.head.appendChild(style);
})();
