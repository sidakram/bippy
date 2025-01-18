/// <reference lib="webworker" />

// biome-ignore lint/style/noVar: needed for typescript
declare var self: ServiceWorkerGlobalScope;

import './types.js';
import { INSTALL_HOOK_SCRIPT_STRING } from './install-hook-script-string.js';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (!url.endsWith('.js')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request.clone(), {
      mode: 'cors',
      credentials: 'omit',
      headers: { Accept: '*/*' },
    })
      .then(async (response) => {
        if (!response?.ok || response.type === 'opaque') {
          return fetch(event.request);
        }

        try {
          const text = await response.clone().text();
          const modifiedText = `${INSTALL_HOOK_SCRIPT_STRING}\n${text}`;

          const headers = new Headers(response.headers);
          headers.set('Content-Type', 'application/javascript');
          headers.set(
            'Content-Length',
            new TextEncoder().encode(modifiedText).length.toString(),
          );

          return new Response(modifiedText, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        } catch {
          return fetch(event.request);
        }
      })
      .catch(() => fetch(event.request)),
  );
});
