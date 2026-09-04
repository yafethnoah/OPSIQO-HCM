# OPSIQO HCM 8.5 Local Runtime V5 — Public Auth Bootstrap Fix

V5 addresses the runtime path exposed during local UAT where `/register` mounted the authenticated global navigation before a Firebase identity or organization context existed.

## Corrected boundaries

- `/signin`, `/register`, `/forgot-password`, `/accept-invite`, and `/setup` render through a public/bootstrap shell without `Nav` or `OrganizationSwitcher`.
- Authenticated application routes continue to render the normal OPSIQO navigation.
- The Firebase client continues to use a deterministic named app rather than `getApps()[0]`.
- Local emulator detection has a development-only fallback restricted to localhost/127.0.0.1 plus the `demo-opsiqo-local` project.
- Firebase Auth validates the resolved configuration before `getAuth()` and reports an OPSIQO-specific configuration error if it is malformed.
- The local launcher identifies itself as V5, verifies the registration HTML, uses a cache-busted 127.0.0.1 URL, and opens that exact runtime.

## Local start

```powershell
npm ci
npm run dev:local
```

Keep the controller, backend, and frontend PowerShell windows open during testing.
