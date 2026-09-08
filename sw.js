'use strict';

// Change VERSION whenever index.html, the manifest or icons change.
const VERSION = '1.3.0';
// Isolated by app path: other GitHub Pages projects keep their own caches.
const SCOPE = self.registration.scope;
const PREFIX = 'architekturfoto:' + encodeURIComponent(SCOPE) + ':';
const CACHE = PREFIX + VERSION;
const APP_URL = new URL('./index.html', SCOPE).href;
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
].map(path => new URL(path, SCOPE).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Atomic precaching: a missing asset fails this installation.
    await cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })));
    // Deliberately no skipWaiting(): preserve open editing sessions.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const app = new URL(APP_URL);
  if (url.origin !== app.origin) return;
  // Only cache the shipped application. Never cache photo uploads or external sites.
  const isEntry = request.mode === 'navigate' &&
    (url.pathname === app.pathname || url.pathname === new URL(SCOPE).pathname);
  const plainURL = url.origin + url.pathname;
  const key = isEntry ? APP_URL : (ASSETS.includes(plainURL) ? plainURL : null);
  if (!key) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(key);
    if (saved) return saved;
    // Fallback for evicted entries. Report a real network failure if offline.
    return fetch(request);
  })());
});
