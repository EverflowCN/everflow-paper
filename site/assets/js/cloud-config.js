/* Everflow public browser configuration. Only publishable/anon credentials belong here. */
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
  window.EVERFLOW_CLOUD=(BAKED.url&&BAKED.publishableKey)?BAKED:(local||BAKED);

  const path=location.pathname.replace(/\/index\.html$/,'/');
  const load=(src,async=true)=>{
    const node=document.createElement('script');
    node.src=src;node.async=async;
    document.head.appendChild(node);
  };

  if(path.startsWith('/workspace/'))load('../assets/js/workspace-icons-v1.js?v=20260903-admin4');
  if(path!=='/workspace/')return;

  [
    '../assets/js/workspace-controls-v4.js?v=20260903-admin4',
    '../assets/js/workspace-user-admin-v1.js?v=20260903-admin4',
    '../assets/js/workspace-quota-entry-v1.js?v=1'
  ].forEach(src=>load(src));
})();
