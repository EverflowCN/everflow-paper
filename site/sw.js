const CACHE='everflow-site-v32';
const SHELL=[
  '/',
  '/assets/css/site.css',
  '/assets/css/responsive.css',
  '/assets/js/site-runtime-v2.js',
  '/assets/js/site-nav-v2.js',
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
  const fresh= request.mode==='navigate' ||
    path.startsWith('/data/') ||
    /\.(?:js|css|json|webmanifest)$/i.test(path);

  event.respondWith(fresh?networkFirst(request):staleWhileRevalidate(request));
});
