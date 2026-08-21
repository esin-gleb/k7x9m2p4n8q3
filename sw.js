const CACHE = 'air-v10';
const ASSETS = [
  "./",
  "./index.html",
  "./topic.html",
  "./exam.html",
  "./app.css",
  "./app.js",
  "./manifest.webmanifest",
  "./qrcode.min.js",
  "./data/anesthesia.json",
  "./data/brain_death.json",
  "./data/cardiology.json",
  "./data/cpr.json",
  "./data/infection.json",
  "./data/neuro.json",
  "./data/nutrition.json",
  "./data/obstetrics.json",
  "./data/other.json",
  "./data/preop.json",
  "./data/renal.json",
  "./data/respiratory.json",
  "./data/sepsis.json",
  "./data/shock.json",
  "./data/surgery.json",
  "./data/topics.json",
  "./data/toxicology.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png"
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
    if (resp.ok && new URL(e.request.url).origin === location.origin) {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
    }
    return resp;
  }).catch(() => cached)));
});
