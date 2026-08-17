# OPSIQO HCM 8.5 — Local Development

The local commands are deliberately emulator-aware. They do not require a real Firebase web API key and do not write local credentials into `.env.local`.

## Terminal A — Firebase emulators

```powershell
npm run dev:backend
```

This starts:

- Authentication — `127.0.0.1:9099`
- Firestore — `127.0.0.1:8080`
- Storage — `127.0.0.1:9199`
- Emulator UI — `http://127.0.0.1:4000`

The local Firebase project is `demo-opsiqo-local` unless `OPSIQO_LOCAL_FIREBASE_PROJECT_ID` is set.

## Terminal B — Next.js frontend/API

```powershell
npm run dev:frontend
```

The wrapper:

- connects server-side Firebase Admin calls to the running emulators;
- supplies a local-only syntactic Firebase web config;
- tells the browser Auth SDK to use the Auth emulator before any Auth request;
- disables App Check only for explicit emulator mode;
- enables local open registration for an empty emulator data set;
- permits one controlled first-organization bootstrap identity;
- clears stale `.next` development artifacts before startup.

## First local sign-in

Open:

`http://localhost:3000/register`

Create:

`admin@opsiqo.local`

with any local test password of at least 8 characters.

Then open:

`http://localhost:3000/setup`

and create the first local organization.

The local bootstrap email can be overridden with `OPSIQO_LOCAL_ADMIN_EMAIL`.

## LAN development

Prefer `http://localhost:3000` on the same computer. OPSIQO also adds the machine's current non-internal IPv4 addresses to Next.js `allowedDevOrigins`, which prevents Next.js 16 from blocking its own development chunks when you intentionally open the app from a local-network address.

## Cloud development

To use a real Firebase project instead of emulators:

```powershell
npm run dev:frontend:cloud
```

Provide the real `NEXT_PUBLIC_FIREBASE_*` values and server credentials through the approved environment mechanism. Emulator fallbacks are never enabled in this mode.
