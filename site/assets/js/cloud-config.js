/*
 * Everflow cloud public configuration.
 *
 * Production values below are intentionally public browser credentials.
 * IMPORTANT: only a Supabase Publishable/anon key may appear here.
 * NEVER put a Secret/service-role key in site/, localStorage, HTML or browser JS.
 */
(()=>{
  const BAKED={
    url:'https://xzodetdohinktagxuwhs.supabase.co',
    publishableKey:'sb_publishable_zODWdr4Dhh8FBxixEAvqaA_k0r50Y-i'
  };

  let local=null;
  try{
    const parsed=JSON.parse(localStorage.getItem('everflow-cloud-public-config')||'null');
    if(parsed&&typeof parsed.url==='string'&&typeof parsed.publishableKey==='string')local=parsed;
  }catch{}

  // Production values always win so a stale device-level test config cannot
  // silently send study data to another Supabase project.
  window.EVERFLOW_CLOUD=(BAKED.url&&BAKED.publishableKey)?BAKED:(local||BAKED);

  // Workspace-only visual/runtime enhancement. Kept separate from workspace-v3
  // business logic so UI polish cannot break Owner APIs or cloud operations.
  if(location.pathname.startsWith('/workspace/')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='../assets/css/workspace-hotfix-v5.css?v=5';
    document.head.appendChild(style);

    const script=document.createElement('script');
    script.src='../assets/js/workspace-controls-v4.js?v=4';
    script.async=true;
    document.head.appendChild(script);

    const oxygenGuard=document.createElement('script');
    oxygenGuard.src='../assets/js/workspace-oxygen-guard-v1.js?v=1';
    oxygenGuard.async=true;
    document.head.appendChild(oxygenGuard);
  }
})();
