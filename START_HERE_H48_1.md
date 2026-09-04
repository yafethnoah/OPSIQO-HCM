# START HERE — OPSIQO H48.1

H48.1 is the H48 platform plus the Next.js 16 runtime/client stability hotfix.

## Windows validation

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
npm ci
npm run h48.1:runtime:audit
npm run typecheck
npm run test:h48.1
npm run build
```

## Start locally

```powershell
npm run dev
```

The first load may unregister a stale service worker from an older local production session. If the browser was already controlled by that worker, one hard reload / tab reopen can be required once. H48.1 prevents future Next/Turbopack chunk caching by OPSIQO's service worker.
