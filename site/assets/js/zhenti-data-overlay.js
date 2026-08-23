(()=>{
  const nativeFetch=window.fetch.bind(window);
  const supplementYears=new Set(['2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025','2026']);
  const cache=new Map();

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
    const p=nativeFetch(`/data/zhenti/supplement/${year}.json?v=20260824b`,{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .catch(()=>null);
    cache.set(year,p);
    return p;
  }

  window.fetch=async function(input,init){
    const year=yearFrom(input);
    const response=await nativeFetch(input,init);
    if(!year||!response.ok)return response;

    try{
      const [base,supplement]=await Promise.all([response.clone().json(),loadSupplement(year)]);
      if(!supplement?.questions)return response;
      const merged={
        ...base,
        questions:{
          ...(supplement.questions||{}),
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
})();
