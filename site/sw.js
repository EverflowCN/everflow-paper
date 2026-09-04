const CACHE='everflow-site-v53-smooth1';
const CORE=[
  '/',
  '/study/',
  '/zhenti/',
  '/assets/css/site.css',
  '/assets/css/responsive.css',
  '/assets/js/site-runtime-v2.js',
  '/assets/js/site-nav-v2.js',
  '/assets/everflow-icon.svg',
  '/manifest.webmanifest'
];
const WARM=[
  '/408/','/relax/','/graph/','/zhenti/relax-reader/','/links/','/account/','/workspace/',
  '/assets/css/interaction-guard.css','/assets/css/question-content-v1.css','/assets/css/zhenti-status.css',
  '/assets/css/resource-hub-v2.css','/assets/css/relax1000-practice.css','/assets/css/workspace-v3.css',
  '/assets/js/question-content-v1.js','/assets/js/question-bank-switch.js','/assets/js/content-feedback-v1.js','/assets/js/feedback-notifications-v1.js',
  '/assets/js/relax1000-core.js','/assets/js/relax1000-reader.js','/assets/js/graph-app.js','/assets/js/workspace-v3.js'
];

const cacheKey=request=>{
  const url=new URL(typeof request==='string'?request:request.url,self.location.origin);
  url.search='';
  return new Request(url.href,{method:'GET'});
};

async function fetchAndCache(request,cache,preloadResponse){
  const response=(await preloadResponse?.catch(()=>null))||await fetch(request,{cache:'no-cache'});
  if(response?.ok)await cache.put(cacheKey(request),response.clone());
  return response;
}

async function warmCache(){
  const cache=await caches.open(CACHE);
  for(const path of WARM){
    if(await cache.match(cacheKey(path)))continue;
    try{await fetchAndCache(path,cache)}catch{}
  }
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.all(CORE.map(async path=>{try{await fetchAndCache(path,cache)}catch{}}));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE&&(key.startsWith('everflow-study-shell-')||key.startsWith('everflow-site-'))).map(key=>caches.delete(key)));
    if(self.registration.navigationPreload)await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

async function networkFirst(request,event,timeoutMs=3500){
  const cache=await caches.open(CACHE),key=cacheKey(request);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=(await event?.preloadResponse)||await fetch(request,{cache:'no-cache',signal:controller.signal});
    if(response?.ok)await cache.put(key,response.clone());
    return response;
  }catch{
    return(await cache.match(key))||Response.error();
  }finally{clearTimeout(timer)}
}

async function staleWhileRevalidate(request,event){
  const cache=await caches.open(CACHE),key=cacheKey(request),cached=await cache.match(key);
  const fresh=fetchAndCache(request,cache,event?.preloadResponse).catch(()=>null);
  if(cached){event?.waitUntil(fresh.then(()=>undefined));return cached}
  return(await fresh)||(request.mode==='navigate'?await cache.match(cacheKey('/')):Response.error());
}

self.addEventListener('message',event=>{
  if(event.data?.type==='WARM_CACHE')event.waitUntil(warmCache());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const path=url.pathname;
  if(request.mode==='navigate'){event.respondWith(staleWhileRevalidate(request,event));return}
  if(path.startsWith('/data/relax1000/')){event.respondWith(staleWhileRevalidate(request,event));return}
  if(path.startsWith('/data/')&&/\.(?:png|jpe?g|webp|gif|svg)$/i.test(path)){event.respondWith(staleWhileRevalidate(request,event));return}
  event.respondWith(path.startsWith('/data/')?networkFirst(request,event):staleWhileRevalidate(request,event));
});
