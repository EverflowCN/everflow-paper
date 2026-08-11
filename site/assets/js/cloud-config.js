/*
 * Everflow cloud public configuration.
 *
 * Production: fill BAKED.url + BAKED.publishableKey and commit this file.
 * Test device: account page can save the same two PUBLIC values to localStorage.
 *
 * IMPORTANT: only a Supabase Publishable/anon key may appear here.
 * NEVER put a Secret/service-role key in site/, localStorage, HTML or browser JS.
 */
(()=>{
  const BAKED={
    url:'',
    publishableKey:''
  };

  let local=null;
  try{
    const parsed=JSON.parse(localStorage.getItem('everflow-cloud-public-config')||'null');
    if(parsed&&typeof parsed.url==='string'&&typeof parsed.publishableKey==='string')local=parsed;
  }catch{}

  // Once production values are committed they always win, so an old per-device
  // test configuration cannot silently point a user at the wrong project.
  window.EVERFLOW_CLOUD=(BAKED.url&&BAKED.publishableKey)?BAKED:(local||BAKED);
})();
