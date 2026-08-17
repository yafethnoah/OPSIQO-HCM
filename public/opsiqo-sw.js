/* OPSIQO 6.0 PWA service worker.
   PRIVACY RULE: cache static application assets only.
   Never cache API responses, navigations, HR data, documents, payroll payloads or authenticated JSON. */
const CACHE='opsiqo-static-v6-0';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE&&key.startsWith('opsiqo-static-'))await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 if(url.pathname.startsWith('/api/'))return;
 const staticOnly=url.pathname.startsWith('/_next/static/')||url.pathname==='/opsiqo-icon.svg';
 if(!staticOnly)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),hit=await cache.match(request);if(hit)return hit;const response=await fetch(request);if(response.ok&&response.type==='basic')await cache.put(request,response.clone());return response})());
});
