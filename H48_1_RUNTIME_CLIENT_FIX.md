# OPSIQO H48.1 — Runtime / Client Stability Fix

## Defects closed

1. Next.js 16 development overlay reported a raw `<script>` rendered from `RuntimeLocaleBootstrap`.
2. A service worker left from a previous production/local-start run could control `localhost` and serve stale Next/Turbopack chunks, producing `module factory is not available` during development.

## Repair

- `RuntimeLocaleBootstrap` now uses `next/script` with `beforeInteractive` rather than returning a raw script element.
- Development mode unregisters same-origin service workers and clears OPSIQO static caches.
- Production PWA registration uses `updateViaCache: 'none'`.
- The service worker no longer caches any `/_next/` resource.
- The service worker cache generation is bumped to `opsiqo-static-h48-1`.
- `/opsiqo-sw.js` is served with `Cache-Control: no-cache, no-store, must-revalidate`.

No HR data/API caching was introduced.
