# OPSIQO ONE V7.24 — Production Candidate Closure

V7.24 is a stabilization and certification-readiness release built on the V7.23 production-hardening baseline.

## Implemented

- Windows certification preflight before dependency installation.
- Post-`npm ci` verification of the locked Firebase CLI, TypeScript, and Vitest toolchain.
- Certification runner now launches Firebase emulators through the project-locked CLI (`npx --no-install firebase`) instead of an arbitrary global Firebase installation.
- Preflight checks Node >=22 <24, npm, package-lock, frozen source manifest, Chrome/Chromium/Edge, Java, required local ports, and available disk space without printing secret values.
- Reviewed EN/FR/ES/AR localization added for Safety, Career & Succession, and HR Diagnostic.
- Authenticated accessibility UAT matrix expanded to `/safety`, `/career`, and `/hr-diagnostic`, including reviewed Arabic marker checks and existing RTL/mobile/accessibility-tree checks.
- Historical V7.18–V7.23 source audits made forward-compatible with the V7.24 catalog and product badge without removing their original safety assertions.
- Safe Execute remains frozen at `notifications.mark_visible_read` only.

## Translation evidence

V7.24 source inventory:

- 26 governed/catalogued surfaces
- 1,430 explicit catalog source strings
- 1,597 exact reviewed source occurrences
- 2,205 heuristic visible-string candidates remaining
- English, French, Spanish, Arabic

The inventory is a source-review work queue, not a linguistic-quality certificate or a claim that all dynamic content is translated.

## Accessibility boundary

The authenticated browser harness covers the newly added Safety, Career and HR Diagnostic routes in the isolated emulator-backed demo environment. Passing the harness is evidence for representative technical checks, not a formal WCAG 2.2 AA conformance claim.

## Certification boundary

The packaged source is audited without `node_modules`. Dependency-backed certification remains authoritative only after the Windows V7.24 runner completes `npm ci`, semantic TypeScript, targeted/full tests, Firestore Rules, security scan, production build, public browser smoke, authenticated emulator UAT, fresh production rebuild, and release gate.
