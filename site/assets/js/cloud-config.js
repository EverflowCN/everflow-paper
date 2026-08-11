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
})();
