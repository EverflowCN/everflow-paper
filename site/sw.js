const CACHE='everflow-study-shell-v10';
const APP_SHELL=[
  '/',
  '/408/',
  '/membership/',
  '/account/',
  '/archive/',
  '/notice/',
  '/links/',
  '/about/',
  '/assets/css/site.css',
  '/assets/css/responsive.css',
  '/assets/css/study.css',
  '/assets/css/membership.css',
  '/assets/css/account-membership.css',
  '/assets/css/content.css',
  '/assets/css/app-ui.css',
  '/assets/js/site.js',
  '/assets/js/site-nav-v2.js',
  '/assets/js/pretty-select.js',
  '/assets/js/study-store.js',
  '/assets/js/cloud-config.js',
  '/assets/js/cloud.js',
  '/assets/js/checkin.js',
  '/assets/js/membership.js',
  '/assets/js/notices.js',
  '/assets/js/links.js',
  '/assets/js/account.js',
  '/assets/js/account-owner.js',
  '/assets/everflow-icon.svg',
  '/manifest.webmanifest'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('everflow-study-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function networkFirst(request){const cache=await caches.open(CACHE);try{const response=await fetch(request,{cache:'no-store'});if(response&&response.ok&&request.method==='GET')cache.put(request,response.clone());return response}catch{return (await cache.match(request))||(request.mode==='navigate'?await cache.match('/'):Response.error())}}
async function staleWhileRevalidate(request){const cache=await caches.open(CACHE),cached=await cache.match(request);const fresh=fetch(request).then(response=>{if(response&&response.ok)cache.put(request,response.clone());return response}).catch(()=>null);return cached||(await fresh)||Response.error()}
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;const critical=url.pathname.startsWith('/workspace/')||url.pathname.endsWith('/workspace-v2.css')||url.pathname.endsWith('/workspace-v2.js')||url.pathname.endsWith('/admin-cloud.js')||url.pathname.endsWith('/assets/js/site.js')||url.pathname.endsWith('/assets/js/site-nav-v2.js')||url.pathname.endsWith('/assets/css/site.css')||url.pathname.endsWith('/assets/css/responsive.css')||url.pathname.endsWith('/assets/css/membership.css')||url.pathname.endsWith('/assets/css/content.css');if(request.mode==='navigate'||critical||url.pathname.startsWith('/data/')||url.pathname.endsWith('/cloud-config.js')){event.respondWith(networkFirst(request));return}event.respondWith(staleWhileRevalidate(request))});