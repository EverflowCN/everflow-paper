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
  if(path!=='/workspace/')return;

  const assets=[
    ['link','../assets/css/workspace-hotfix-v5.css?v=5'],
    ['script','../assets/js/workspace-controls-v4.js?v=4'],
    ['script','../assets/js/workspace-oxygen-guard-v1.js?v=2'],
    ['script','../assets/js/workspace-user-admin-v1.js?v=1'],
    ['script','../assets/js/workspace-quota-entry-v1.js?v=1']
  ];
  for(const [kind,src] of assets){
    const node=document.createElement(kind);
    if(kind==='link'){node.rel='stylesheet';node.href=src}else{node.src=src;node.async=true}
    document.head.appendChild(node);
  }
})();
