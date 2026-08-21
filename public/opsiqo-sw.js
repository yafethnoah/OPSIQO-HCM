/* OPSIQO ONE v7.14 privacy-safe PWA service worker.
   PRIVACY RULE: cache static shell assets and a static offline notice only.
   Never cache API responses, authenticated navigations, HR data, documents, payroll payloads or JSON. */
const CACHE='opsiqo-static-v7-14';
const SAFE_SHELL=['/offline.html','/opsiqo-icon.svg','/brand/opsiqo-icon.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(SAFE_SHELL).catch(()=>undefined);await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE&&key.startsWith('opsiqo-static-'))await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 if(url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(async()=>await caches.match('/offline.html')||Response.error()));return;}
 const staticOnly=url.pathname.startsWith('/_next/static/')||url.pathname==='/opsiqo-icon.svg'||url.pathname.startsWith('/brand/');if(!staticOnly)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),hit=await cache.match(request);if(hit)return hit;const response=await fetch(request);if(response.ok&&response.type==='basic')await cache.put(request,response.clone());return response})());
});
