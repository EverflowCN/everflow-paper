(()=>{
  const nativeFetch=window.fetch.bind(window);
  const years=new Set(['2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025','2026']);
  const extraYears=new Set(['2010','2011','2012','2013','2014','2017','2018','2020','2021','2022','2025']);
  const DATA_VERSION='20260824-full5';
  const mergedCache=new Map();
  const layerCache={base:new Map(),supplement:new Map(),extra:new Map()};
  const MAX_CONCURRENT=4;
  let active=0;
  const waiters=[];

  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function yearFrom(input){
    try{
      const raw=typeof input==='string'?input:input?.url;
      if(!raw)return null;
      const url=new URL(raw,location.href);
      const match=url.pathname.match(/\/data\/zhenti\/(\d{4})\.json$/);
      return match&&years.has(match[1])?match[1]:null;
    }catch{return null;}
  }

  async function withSlot(task){
    if(active>=MAX_CONCURRENT)await new Promise(resolve=>waiters.push(resolve));
    active++;
    try{return await task();}
    finally{
      active--;
      const next=waiters.shift();
      if(next)next();
    }
  }

  async function fetchJson(url,{allow404=false,retries=2}={}){
    for(let attempt=0;attempt<=retries;attempt++){
      try{
        const response=await nativeFetch(url,{cache:'no-store'});
        if(response.ok)return await response.json();
        if(allow404&&response.status===404)return null;
      }catch{}
      if(attempt<retries)await sleep(140*(attempt+1));
    }
    return null;
  }

  function cachedLayer(map,key,loader){
    if(map.has(key))return map.get(key);
    const promise=loader().then(value=>{
      if(value==null)map.delete(key);
      return value;
    }).catch(()=>{
      map.delete(key);
      return null;
    });
    map.set(key,promise);
    return promise;
  }

  function loadBase(year){
    return cachedLayer(layerCache.base,year,()=>fetchJson(`/data/zhenti/${year}.json?v=${DATA_VERSION}`));
  }

  function loadSupplement(year){
    return cachedLayer(layerCache.supplement,year,()=>fetchJson(`/data/zhenti/supplement/${year}.json?v=${DATA_VERSION}`,{allow404:true}));
  }

  function loadExtra(year){
    if(!extraYears.has(year))return Promise.resolve(null);
    return cachedLayer(layerCache.extra,year,()=>fetchJson(`/data/zhenti/supplement/${year}-extra.json?v=${DATA_VERSION}`,{allow404:true}));
  }

  function mergeQuestionSets(base,supplement,extra){
    const merged={};
    for(const source of [base,supplement,extra]){
      if(!source)continue;
      for(const [number,patch] of Object.entries(source)){
        const previous=merged[number]||{};
        merged[number]={
          ...previous,
          ...patch,
          verification:{...(previous.verification||{}),...(patch?.verification||{})}
        };
      }
    }
    return merged;
  }

  function auditPaper(paper){
    const missing=[];
    const incomplete=[];
    for(let q=1;q<=47;q++){
      const item=paper?.questions?.[String(q)];
      if(!item||item.verification?.status!=='verified'){
        missing.push(q);
        continue;
      }
      if(!String(item.stem||'').trim())incomplete.push(q);
      if((item.type==='single'||q<=40)&&(!item.options||!Object.keys(item.options).length||!String(item.answer||'').trim()))incomplete.push(q);
      if(q>40&&!String(item.answer||'').trim())incomplete.push(q);
    }
    return {missing:[...new Set(missing)],incomplete:[...new Set(incomplete)]};
  }

  function unhealthy(health){return health.missing.length>0||health.incomplete.length>0}

  function clearYearLayers(year){
    layerCache.base.delete(year);
    layerCache.supplement.delete(year);
    layerCache.extra.delete(year);
  }

  async function buildMerged(year,{force=false}={}){
    if(!force&&mergedCache.has(year))return mergedCache.get(year);
    const task=withSlot(async()=>{
      if(force)clearYearLayers(year);
      let [base,supplement,extra]=await Promise.all([loadBase(year),loadSupplement(year),loadExtra(year)]);
      if(!base)return null;
      let paper={...base,questions:mergeQuestionSets(base?.questions,supplement?.questions,extra?.questions)};
      let health=auditPaper(paper);

      if(unhealthy(health)){
        clearYearLayers(year);
        await sleep(100);
        [base,supplement,extra]=await Promise.all([loadBase(year),loadSupplement(year),loadExtra(year)]);
        if(base)paper={...base,questions:mergeQuestionSets(base?.questions,supplement?.questions,extra?.questions)};
        health=auditPaper(paper);
      }

      if(unhealthy(health))console.warn(`[Everflow] ${year} 题库加载不完整`,health);
      return paper;
    });

    mergedCache.set(year,task);
    const result=await task;
    if(!result||unhealthy(auditPaper(result)))mergedCache.delete(year);
    return result;
  }

  function responseFromPaper(paper){
    return new Response(JSON.stringify(paper),{
      status:200,
      headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
    });
  }

  window.EverflowZhentiData={
    version:DATA_VERSION,
    loadPaper:(year,options)=>buildMerged(String(year),options),
    auditPaper,
    clear(year){
      const key=String(year);
      mergedCache.delete(key);
      clearYearLayers(key);
    }
  };

  window.fetch=async function(input,init){
    const year=yearFrom(input);
    if(!year)return nativeFetch(input,init);
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    if(method!=='GET')return nativeFetch(input,init);

    try{
      const paper=await buildMerged(year);
      if(paper)return responseFromPaper(paper);
    }catch(error){
      console.warn(`[Everflow] ${year} 题库合并失败`,error);
    }
    return nativeFetch(input,{...init,cache:'no-store'});
  };

  if(document.body?.dataset.view!=='zhenti')return;

  if(!document.querySelector('link[data-zhenti-media]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`/assets/css/zhenti-media.css?v=${DATA_VERSION}`;
    link.dataset.zhentiMedia='1';
    document.head.appendChild(link);
  }

  const loadMedia=()=>{
    if(document.querySelector('script[data-zhenti-media]'))return;
    const script=document.createElement('script');
    script.src=`/assets/js/zhenti-media.js?v=${DATA_VERSION}`;
    script.defer=true;
    script.dataset.zhentiMedia='1';
    document.body.appendChild(script);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadMedia,{once:true});
  else loadMedia();
})();