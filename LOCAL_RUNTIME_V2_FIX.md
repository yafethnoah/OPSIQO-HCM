# OPSIQO 8.5 Local Runtime V2 Fix

This repair closes two remaining local-development hazards:

1. Local emulator mode now **forces** local Firebase browser configuration instead of inheriting stale/cloud `NEXT_PUBLIC_FIREBASE_*` variables from the parent shell or env files.
2. The local frontend now reserves **port 3000 explicitly** and fails with a clear error if an older Next.js process is already listening there, instead of silently starting on 3001 while the browser continues talking to the old server.

`npm run dev:frontend` still clears `.next` before startup and connects Firebase Auth to `http://127.0.0.1:9099`.

Use `npm run dev:doctor` before startup if needed.
