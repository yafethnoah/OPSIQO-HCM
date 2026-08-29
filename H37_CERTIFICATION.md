# OPSIQO H37 Certification

## Scope

H37 adds governed platform tenant creation for authenticated `super_admin` users while preserving the H36 People Lifecycle and Import Center closure.

## Implemented controls

- Role-gated Platform Companies screen and API.
- Verified administrator identity requirement.
- Documented creation reason.
- Transactional tenant-name uniqueness claim.
- Transactional organization, org unit, position, worker, employment, assignment and membership foundation.
- Separate tenant records with no source-tenant data copying.
- Target-tenant audit evidence.

## Certification commands

```powershell
npm ci
npm run typecheck
npm run test:h37
npm run opsiqo85:h37:audit
npm test
npm run build
npm run source:manifest:verify
```

Run the final certification with the Node version declared in `package.json` (`>=22 <24`).
