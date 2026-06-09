const PACKAGE_TETRIS_CACHE_NAME = "package-tetris-app-shell-v1";
const APP_SHELL_URLS = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PACKAGE_TETRIS_CACHE_NAME);
      await cacheShellAssets(cache);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("package-tetris-") && cacheName !== PACKAGE_TETRIS_CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function cacheShellAssets(cache) {
  await Promise.all(APP_SHELL_URLS.map((url) => cacheUrl(cache, url)));

  try {
    const shellResponse = await fetch("/", { cache: "reload" });

    if (!shellResponse.ok) {
      return;
    }

    const shellHtml = await shellResponse.clone().text();
    await cache.put("/", shellResponse);
    await Promise.all(extractShellAssetUrls(shellHtml).map((url) => cacheUrl(cache, url)));
  } catch {
    // The app can still run online; offline readiness will retry on the next registration/update.
  }
}

function extractShellAssetUrls(html) {
  const urls = new Set(APP_SHELL_URLS);
  const assetPattern = /(?:src|href)="([^"]+)"/g;

  for (const match of html.matchAll(assetPattern)) {
    const url = match[1];

    if (url.startsWith("/_next/") || APP_SHELL_URLS.includes(url)) {
      urls.add(url);
    }
  }

  return [...urls];
}

async function cacheUrl(cache, url) {
  try {
    const response = await fetch(url, { cache: "reload" });

    if (response.ok) {
      await cache.put(url, response);
    }
  } catch {
    // Cache warming is best-effort.
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(PACKAGE_TETRIS_CACHE_NAME);
      await cache.put("/", response.clone());
    }

    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match("/")) || Response.error();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(PACKAGE_TETRIS_CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (await caches.match(request)) || Response.error();
  }
}
