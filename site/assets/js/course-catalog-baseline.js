(()=>{
  const api=window.EveraCourseCatalog;
  if(!api||typeof api.load!=='function')return;

  const originalLoad=api.load.bind(api);
  const DATA_VERSION='20260828-course-baseline1';
  const BUILTIN_IDS=new Set(['oxygen-past-papers','oxygen-reinforcement']);
  const MIN_REINFORCEMENT={ds:37,co:29,os:29,cn:28};

  const itemKey=item=>String(item?.progress_id||item?.progressId||item?.item_id||item?.id||'');
  const fetchJson=async(path,{force=false}={})=>{
    const join=path.includes('?')?'&':'?';
    const response=await fetch(`${path}${join}v=${DATA_VERSION}`,{cache:force?'reload':'default'});
    if(!response.ok)throw new Error(`${path} HTTP ${response.status}`);
    return response.json();
  };

  async function loadStaticBaseline({force=false}={}){
    const [paper,reinforcement]=await Promise.all([
      fetchJson('../data/oxygen.json',{force}),
      fetchJson('../data/oxygen-reinforcement.json',{force})
    ]);
    const catalogs=[
      {id:'oxygen-past-papers',title:paper?.course?.label||'历年408真题讲解',kind:'past-paper',source_url:paper?.source?.url||'',sort_order:10,enabled:true},
      {id:'oxygen-reinforcement',title:'27考研408四科强化',kind:'reinforcement',source_url:'',sort_order:20,enabled:true}
    ];
    const itemMap=new Map();
    itemMap.set('oxygen-past-papers',(paper?.course?.items||[]).map((item,index)=>({
      catalog_id:'oxygen-past-papers',item_id:item.id,progress_id:item.id,subject:'408',title:item.title,duration:item.duration||'',url:item.url||'',bvid:item.bvid||'',year:item.year||null,sort_order:index,enabled:true,metadata:{publishedAt:Number(item.publishedAt||0)||0,baseline:true}
    })));
    const reinforcementItems=[];
    for(const [subject,group] of Object.entries(reinforcement?.subjects||{})){
      for(const [index,item] of (group?.items||[]).entries())reinforcementItems.push({
        catalog_id:'oxygen-reinforcement',item_id:item.id,progress_id:item.id,subject,title:item.title,duration:item.duration||'',url:item.url||'',bvid:item.bvid||'',year:null,sort_order:index,enabled:true,metadata:{publishedAt:Number(item.publishedAt||0)||0,baseline:true}
      });
    }
    itemMap.set('oxygen-reinforcement',reinforcementItems);
    return{catalogs,itemMap};
  }

  function mergeBaseline(base,cloud){
    const catalogsById=new Map((base.catalogs||[]).map(c=>[c.id,{...c}]));
    const itemMap=new Map();
    for(const [catalogId,items] of base.itemMap||[])itemMap.set(catalogId,items.map(item=>({...item})));

    for(const catalog of cloud?.catalogs||[]){
      const previous=catalogsById.get(catalog.id)||{};
      catalogsById.set(catalog.id,{...previous,...catalog});
      const baseItems=itemMap.get(catalog.id)||[];
      const mergedById=new Map();
      const order=[];
      for(const item of baseItems){const key=itemKey(item);if(!key)continue;mergedById.set(key,item);order.push(key)}
      for(const item of cloud?.itemMap?.get?.(catalog.id)||[]){
        const key=itemKey(item);if(!key)continue;
        if(!mergedById.has(key))order.push(key);
        mergedById.set(key,{...(mergedById.get(key)||{}),...item,metadata:{...(mergedById.get(key)?.metadata||{}),...(item?.metadata||{})}});
      }
      itemMap.set(catalog.id,order.map(key=>mergedById.get(key)).filter(Boolean));
    }
    return{...cloud,catalogs:[...catalogsById.values()].sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)),itemMap};
  }

  function validateBaseline(data){
    const rows=data?.itemMap?.get?.('oxygen-reinforcement')||[];
    const counts={ds:0,co:0,os:0,cn:0};
    rows.forEach(item=>{if(Object.hasOwn(counts,item.subject))counts[item.subject]++});
    for(const [subject,min] of Object.entries(MIN_REINFORCEMENT)){
      if(counts[subject]<min)throw new Error(`reinforcement baseline truncated: ${subject} ${counts[subject]}/${min}`);
    }
    return data;
  }

  api.load=async options=>{
    let base=null,cloud=null,baseError=null,cloudError=null;
    try{base=await loadStaticBaseline(options||{})}catch(error){baseError=error;console.warn('static course baseline unavailable',error)}
    try{cloud=await originalLoad(options)}catch(error){cloudError=error;console.warn('cloud course catalog unavailable',error)}
    if(base&&cloud)return validateBaseline(mergeBaseline(base,cloud));
    if(base)return validateBaseline(base);
    if(cloud)return cloud;
    throw cloudError||baseError||new Error('course catalog unavailable');
  };

  window.EveraCourseCatalogBaseline={version:DATA_VERSION,minimums:{...MIN_REINFORCEMENT},builtinIds:[...BUILTIN_IDS]};
})();
