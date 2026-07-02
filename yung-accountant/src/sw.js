// ── Workbox from CDN ───────────────────────────────────────────
self.__WB_DISABLE_DEV_LOGS = true;
importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js'
);

// Standard SW lifecycle — activate immediately
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Queue reference — declared here so the message listener (set up
// synchronously) can access it. Assigned once modules finish loading.
let apiMutationsQueue = null;

// ── Replay helper — manually fetches queued entries with CORS-safe
// headers. Workbox's built-in replay() keeps origin/referer which
// causes CORS rejections when preview server origin (4173) differs
// from dev server origin (5173) in the backend's allowlist.
async function replayQueueSafely(queue) {
  const entries = await queue.getAll();
  let replayed = 0;
  for (const entry of entries) {
        // The CDN Queue stores entries with { request: {...}, timestamp } —
    // NOT { requestData: {...} } like the npm package. Handle both.
    const rd = (entry && (entry.request || entry.requestData)) || {};
    if (!rd.url) {
            try { await queue.shiftRequest(); } catch {}
      continue;
    }
    const { url, headers: storedHeaders, body, method: reqMethod } = rd;
    // Normalize headers (can be POJO, Headers instance, or 2D array)
    const headerObj = {};
    if (storedHeaders instanceof Headers) {
      for (const [k, v] of storedHeaders.entries()) headerObj[k] = v;
    } else if (Array.isArray(storedHeaders)) {
      for (const [k, v] of storedHeaders) headerObj[k] = v;
    } else if (storedHeaders) {
      Object.assign(headerObj, storedHeaders);
    }
    delete headerObj['origin'];
    delete headerObj['referer'];
    try {
      // The stored body may be a ReadableStream — read it to get
      // the raw bytes before constructing a new Request.
      let bodyData = body;
      if (body instanceof ReadableStream) {
        bodyData = await new Response(body).arrayBuffer();
      }
      const req = new Request(url, {
        method: reqMethod || 'POST',
        headers: new Headers(headerObj),
        body: bodyData,
      });
      const resp = await fetch(req);
      if (resp.ok) {
        await queue.shiftRequest();
        replayed++;
      } else {
      }
    } catch (err) {
    }
  }
}

// ── Message-based replay — set up IMMEDIATELY (not inside async .then())
// so it's ready before the first REPLAY_QUEUE message arrives.
let replayInProgress = false;
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'REPLAY_QUEUE') {
    if (replayInProgress) {
      return;
    }
    replayInProgress = true;
    try {
      if (!apiMutationsQueue) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!apiMutationsQueue) return;
      }
      await replayQueueSafely(apiMutationsQueue);
      // Only broadcast if we actually replayed something
      const remaining = (await apiMutationsQueue.getAll()).length;
      if (remaining === 0) {
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.postMessage({ type: 'SYNC_COMPLETED', queue: 'api-mutations' });
        }
      }
    } finally {
      replayInProgress = false;
    }
  }
});

// ── Load all needed workbox modules before setting up routes ──
Promise.all([
  workbox.loadModule('workbox-precaching'),
  workbox.loadModule('workbox-routing'),
  workbox.loadModule('workbox-strategies'),
  workbox.loadModule('workbox-background-sync'),
  workbox.loadModule('workbox-expiration'),
  workbox.loadModule('workbox-cacheable-response'),
]).then(() => {
  const { precacheAndRoute } = workbox.precaching;
  const { registerRoute } = workbox.routing;
  const { NetworkFirst, CacheFirst, StaleWhileRevalidate } = workbox.strategies;
  const { ExpirationPlugin } = workbox.expiration;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;
  const { Queue } = workbox.backgroundSync;

  // ── Precaching ────────────────────────────────────────────────
  precacheAndRoute(self.__WB_MANIFEST || []);

  // ── API URL matcher ───────────────────────────────────────────
  const isApiUrl = ({ url }) => {
    return url.hostname.includes('yung-accountant-back') ||
      (url.hostname === 'localhost' && ['8081','8082','8083','8084','8085','8086','8087','8088','8089'].includes(url.port)) ||
      (url.hostname === '127.0.0.1' && ['8081','8082','8083','8084','8085','8086','8087','8088','8089'].includes(url.port));
  };

  // ── Background Sync Queue ─────────────────────────────────────
  // Using Queue directly instead of BackgroundSyncPlugin —
  // the plugin's fetchDidFail callback has a known issue in
  // workbox CDN v7 where no-response errors aren't queued.
  // Assign to outer variable so the message listener can access it
  apiMutationsQueue = new Queue('api-mutations', {
    maxRetentionTime: 24 * 60,
    onSync: async ({ queue }) => {
      // Use workbox's built-in replay — the `queue` parameter in onSync
      // has a different internal shape than the outer Queue reference.
      try {
        await queue.replay();
      } catch {
        return;
      }
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'SYNC_COMPLETED', queue: 'api-mutations' });
      }
    },
  });

  // ── Mutations — custom handler that explicitly queues on failure
  ['POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) => {
    registerRoute(
      isApiUrl,
      async ({ request }) => {
        try {
          const response = await fetch(request.clone());
          return response;
        } catch (_fetchError) {
          // Network failed → push to background-sync queue
          try {
            await apiMutationsQueue.pushRequest({ request: request.clone() });
            // Explicitly register the sync tag — workbox should do this
            // in pushRequest, but the CDN Queue sometimes doesn't.
            if ('sync' in self.registration) {
              await self.registration.sync.register(
                'workbox-background-sync:api-mutations'
              );
            }
          } catch (queueError) {
          }
          // Re-throw so the frontend knows it failed
          throw _fetchError;
        }
      },
      method,
    );
  });

  // ── Stale-tag cleanup ────────────────────────────────────────
  self.addEventListener('sync', (event) => {
    if (event.tag === 'force-cleanup-stale') {
      event.waitUntil(
        (async () => {
          await replayQueueSafely(apiMutationsQueue);
          const clients = await self.clients.matchAll({ type: 'window' });
          for (const client of clients) {
            client.postMessage({ type: 'SYNC_COMPLETED', queue: 'api-mutations' });
          }
        })()
      );
    }
  });

  // ── API GET — NetworkFirst, 2s timeout ───────────────────────
  registerRoute(
    isApiUrl,
    new NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 2,
      plugins: [
        new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 5 * 60 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  );

  // ── Google Fonts — CacheFirst, 1 year ────────────────────────
  registerRoute(
    /^https:\/\/fonts\.googleapis\.com\/.*/,
    new CacheFirst({
      cacheName: 'google-fonts-stylesheets',
      plugins: [
        new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  );

  registerRoute(
    /^https:\/\/fonts\.gstatic\.com\/.*/,
    new CacheFirst({
      cacheName: 'google-fonts-webfonts',
      plugins: [
        new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  );

  // ── Cloudinary images — StaleWhileRevalidate, 7 days ──────────
  registerRoute(
    /^https:\/\/res\.cloudinary\.com\/.*/,
    new StaleWhileRevalidate({
      cacheName: 'cloudinary-images',
      plugins: [
        new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  );
});
