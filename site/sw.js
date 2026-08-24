const CACHE='everflow-site-v40';
const SHELL=[
  '/',
  '/study/',
  '/zhenti/',
  '/links/',
  '/account/',
  '/workspace/',
  '/visual/',
  '/assets/css/site.css',
  '/assets/css/responsive.css',
  '/assets/css/interaction-guard.css',
  '/assets/css/graph.css',
  '/assets/css/resource-hub-v2.css',
  '/assets/css/auth-loading.css',
  '/assets/js/site-runtime-v2.js',
  '/assets/js/site-nav-v2.js',
  '/assets/js/cloud-config.js',
  '/assets/js/links.js',
  '/assets/js/graph-app.js',
  '/assets/js/graph-controls.js',
  '/assets/everflow-icon.svg',
  '/manifest.webmanifest'
];

const cacheKey=request=>{
  const url=new URL(request.url);
  return new Request(`${url.origin}${url.pathname}`,{method:'GET'});
};

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.all(SHELL.map(async path=>{
      try{
        const response=await fetch(path,{cache:'no-store'});
        if(response.ok)await cache.put(path,response);
      }catch{}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE&&(key.startsWith('everflow-study-shell-')||key.startsWith('everflow-site-'))).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request){
  const cache=await caches.open(CACHE),key=cacheKey(request);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok)await cache.put(key,response.clone());
    return response;
  }catch{
    return (await cache.match(key))||(request.mode==='navigate'?await cache.match('/'):Response.error());
  }
}

async function staleWhileRevalidate(request){
  const cache=await caches.open(CACHE),key=cacheKey(request),cached=await cache.match(key);
  const fresh=fetch(request).then(async response=>{
    if(response.ok)await cache.put(key,response.clone());
    return response;
  }).catch(()=>null);
  return cached||(await fresh)||Response.error();
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const path=url.pathname;
  if(request.mode==='navigate'){
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  const fresh=path.startsWith('/data/');
  event.respondWith(fresh?networkFirst(request):staleWhileRevalidate(request));
});
