(()=>{
  const nativeFetch=window.fetch.bind(window);
  const supplementYears=new Set(['2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025','2026']);
  const extraYears=new Set(['2010','2011','2012','2013','2014','2017','2018','2020','2021','2022','2025']);
  const cache=new Map();
  const extraCache=new Map();
  const DATA_VERSION='20260824-base-authoritative-c';

  function yearFrom(input){
    try{
      const raw=typeof input==='string'?input:input?.url;
      if(!raw)return null;
      const url=new URL(raw,location.href);
      const match=url.pathname.match(/\/data\/zhenti\/(\d{4})\.json$/);
      return match&&supplementYears.has(match[1])?match[1]:null;
    }catch{return null;}
  }

  async function loadSupplement(year){
    if(cache.has(year))return cache.get(year);
    const promise=nativeFetch(`/data/zhenti/supplement/${year}.json?v=${DATA_VERSION}`,{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .catch(()=>null);
    cache.set(year,promise);
    return promise;
  }

  async function loadExtra(year){
    if(!extraYears.has(year))return null;
    if(extraCache.has(year))return extraCache.get(year);
    const promise=nativeFetch(`/data/zhenti/supplement/${year}-extra.json?v=${DATA_VERSION}`,{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .catch(()=>null);
    extraCache.set(year,promise);
    return promise;
  }

  function mergeQuestionSets(base,supplement,extra){
    const merged={};
    // Canonical precedence: extra < supplement < base.
    // Supplements may fill missing verified questions, but must never replace
    // a question already present in the authoritative base-year JSON.
    for(const source of [extra,supplement,base]){
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

  window.fetch=async function(input,init){
    const year=yearFrom(input);
    const response=await nativeFetch(input,init);
    if(!year||!response.ok)return response;

    try{
      const [base,supplement,extra]=await Promise.all([
        response.clone().json(),
        loadSupplement(year),
        loadExtra(year)
      ]);
      if(!supplement?.questions&&!extra?.questions)return response;

      const merged={
        ...base,
        questions:mergeQuestionSets(base?.questions,supplement?.questions,extra?.questions)
      };
      return new Response(JSON.stringify(merged),{
        status:response.status,
        statusText:response.statusText,
        headers:{'Content-Type':'application/json; charset=utf-8'}
      });
    }catch{
      return response;
    }
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