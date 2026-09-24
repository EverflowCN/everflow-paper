(async()=>{
  const nodes=[...document.querySelectorAll('[data-admin-english-entry],[data-admin-english-section]')];
  if(!nodes.length)return;
  try{
    await import('/assets/js/cloud-config.js?v=20260924-1');
    await import('/assets/js/admin-cloud.js?v=20260924-1');
    const cloud=window.EveraAdminCloud,client=await cloud?.ready;
    if(!client)return;
    const {data,error}=await client.auth.getUser();
    const role=String(data?.user?.app_metadata?.role||'').toLowerCase();
    if(error||!['owner','admin'].includes(role))return;
    nodes.forEach(node=>node.hidden=false);
  }catch(e){console.warn('English admin entry unavailable',e)}
})();
