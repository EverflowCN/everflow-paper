(()=>{
  let cache=null,cacheAt=0;
  const TTL=60*1000;
  const cleanBase=value=>String(value||'').replace(/\/$/,'');
  const json=async response=>{if(!response.ok)throw new Error(`course_catalog_http_${response.status}`);return response.json()};
  async function load({force=false}={}){
    if(!force&&cache&&Date.now()-cacheAt<TTL)return cache;
    const cfg=window.EVERFLOW_CLOUD||{},base=cleanBase(cfg.url),key=String(cfg.publishableKey||'');
    if(!base||!key)throw new Error('course_catalog_cloud_unconfigured');
    const headers={apikey:key,Authorization:`Bearer ${key}`,Accept:'application/json'};
    const catalogFields='id,title,subtitle,kind,source_type,source_url,sort_order,metadata';
    const itemFields='catalog_id,item_id,progress_id,subject,title,duration,url,bvid,year,sort_order,metadata,source_updated_at';
    const [catalogs,items]=await Promise.all([
      fetch(`${base}/rest/v1/course_catalogs?select=${catalogFields}&order=sort_order.asc,id.asc`,{headers,cache:force?'reload':'no-cache'}).then(json),
      fetch(`${base}/rest/v1/course_catalog_items?select=${itemFields}&order=sort_order.asc,item_id.asc`,{headers,cache:force?'reload':'no-cache'}).then(json)
    ]);
    const itemMap=new Map();for(const item of items||[]){if(!itemMap.has(item.catalog_id))itemMap.set(item.catalog_id,[]);itemMap.get(item.catalog_id).push(item)}
    cache={catalogs:catalogs||[],items:items||[],itemMap,loadedAt:new Date().toISOString()};cacheAt=Date.now();return cache;
  }
  const clear=()=>{cache=null;cacheAt=0};
  window.EveraCourseCatalog={load,clear};
})();
