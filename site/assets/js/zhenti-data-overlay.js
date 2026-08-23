(()=>{
  const nativeFetch=window.fetch.bind(window);
  const supplementYears=new Set(['2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025','2026']);
  const extraYears=new Set(['2010']);
  const cache=new Map();
  const extraCache=new Map();

  function yearFrom(input){
    try{
      const raw=typeof input==='string'?input:input?.url;
      if(!raw)return null;
      const url=new URL(raw,location.href);
      const m=url.pathname.match(/\/data\/zhenti\/(\d{4})\.json$/);
      return m&&supplementYears.has(m[1])?m[1]:null;
    }catch{return null;}
  }

  async function loadSupplement(year){
    if(cache.has(year))return cache.get(year);
    const p=nativeFetch(`/data/zhenti/supplement/${year}.json?v=20260824g`,{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .catch(()=>null);
    cache.set(year,p);
    return p;
  }

  async function loadExtra(year){
    if(!extraYears.has(year))return null;
    if(extraCache.has(year))return extraCache.get(year);
    const p=nativeFetch(`/data/zhenti/supplement/${year}-extra.json?v=20260824a`,{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .catch(()=>null);
    extraCache.set(year,p);
    return p;
  }

  window.fetch=async function(input,init){
    const year=yearFrom(input);
    const response=await nativeFetch(input,init);
    if(!year||!response.ok)return response;

    try{
      const [base,supplement,extra]=await Promise.all([response.clone().json(),loadSupplement(year),loadExtra(year)]);
      if(!supplement?.questions&&!extra?.questions)return response;
      const merged={
        ...base,
        questions:{
          ...(extra?.questions||{}),
          ...(supplement?.questions||{}),
          ...(base.questions||{})
        }
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

  if(!document.querySelector('link[data-zhenti-media]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='/assets/css/zhenti-media.css?v=20260824a';link.dataset.zhentiMedia='1';
    document.head.appendChild(link);
  }
  const loadMedia=()=>{
    if(document.querySelector('script[data-zhenti-media]'))return;
    const script=document.createElement('script');
    script.src='/assets/js/zhenti-media.js?v=20260824a';script.defer=true;script.dataset.zhentiMedia='1';
    document.body.appendChild(script);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadMedia,{once:true});else loadMedia();
})();
