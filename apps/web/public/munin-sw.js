const CACHE='munin-mobile-v6';
const SHELL=['/mobile.html','/munin.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{await Promise.all((await caches.keys()).filter(key=>key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();for(const client of await self.clients.matchAll({type:'window'}))await client.navigate(client.url)})());});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET'||new URL(request.url).pathname.startsWith('/api/'))return;event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));return response;}).catch(()=>caches.match(request).then(hit=>hit||caches.match('/mobile.html'))));});
