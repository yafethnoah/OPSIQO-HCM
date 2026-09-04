/* OPSIQO H48.1 privacy-safe PWA service worker.
   PRIVACY RULE: cache only the static offline notice and brand assets.
   Never cache Next.js/Turbopack chunks, API responses, authenticated
   navigations, HR data, documents, payroll payloads or JSON. */
const CACHE='opsiqo-static-h48-1';
const SAFE_SHELL=['/offline.html','/opsiqo-icon.svg','/brand/opsiqo-icon.png'];

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(SAFE_SHELL).catch(()=>undefined);
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys()){
    if(key!==CACHE&&key.startsWith('opsiqo-static-'))await caches.delete(key);
  }
  await self.clients.claim();
})()));

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/'))return;

  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(async()=>await caches.match('/offline.html')||Response.error()));
    return;
  }

  // Next.js chunks are content-addressed and must stay browser/network
  // authoritative. Caching them in a service worker can make local dev serve
  // an old Turbopack module graph after a build/version change.
  if(url.pathname.startsWith('/_next/'))return;

  const staticOnly=url.pathname==='/opsiqo-icon.svg'||url.pathname.startsWith('/brand/');
  if(!staticOnly)return;

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(request);
    if(hit)return hit;
    const response=await fetch(request);
    if(response.ok&&response.type==='basic')await cache.put(request,response.clone());
    return response;
  })());
});
