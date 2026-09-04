# OPSIQO ONE V7.25 — Production Certification Closure

V7.25 is a certification-closure and multilingual production-governance release built on the V7.24 production-candidate baseline.

## Implemented

- Fixed the authenticated Windows UAT configuration defect by packaging a dedicated `firebase.test.json`.
- Isolated emulator config pins Firestore 8080, Auth 9099 and Storage 9199, disables the emulator UI, and contains no production project id.
- Certification preflight now validates the isolated emulator config before dependency installation.
- Certification preflight statically verifies that the Windows runner contains no production deploy command, pins `demo-opsiqo-local`, uses `firebase.test.json`, references only package scripts that actually exist, and keeps package-lock root metadata aligned with package.json.
- Windows path-length warning added to reduce deep-extraction failures on Windows.
- Sanitized certification ledger added at `artifacts/v7-25-certification-ledger.json` with gate name, pass/fail, duration and exit code only.
- Reviewed EN/FR/ES/AR localization expanded to Regulatory Change, Resilience, Identity Governance, Enterprise Governance and Enterprise Command Center.
- Authenticated accessibility UAT expanded to `/regulatory`, `/resilience`, `/identity`, `/governance` and `/dashboard`, including reviewed Arabic marker checks.
- Translation Readiness now consumes the V7.25 inventory rather than an older snapshot.
- Historical V7.18–V7.24 audits were made forward-compatible with the V7.25 catalog/product identity without removing substantive historical assertions.
- Safe Execute remains frozen at `notifications.mark_visible_read` only.

## Translation evidence

V7.25 source inventory:

- 31 governed/catalogued surfaces
- 2,029 explicit catalog source strings
- 1,995 exact reviewed source occurrences
- 1,810 heuristic visible-string candidates remaining
- 3,805 total candidate occurrences
- English, French, Spanish, Arabic

The inventory is a source-review work queue. It is not a linguistic-quality certificate and does not imply that every dynamic validation response, date/number format, generated value, accessibility label or mixed-language record has been manually reviewed in browser.

## Accessibility boundary

The authenticated browser harness now covers 34 signed-in routes, including the five new V7.25 production-governance routes. Passing the harness is evidence for representative 320px reflow, accessible-name basics, target size, keyboard entry, five-outcome mobile navigation, Accessibility Tree naming and Arabic RTL/marker behavior. It is not a formal WCAG 2.2 AA conformance claim.

## Certification boundary

The packaged source intentionally excludes `node_modules` and generated build artifacts. Dependency-backed certification remains authoritative only after the Windows V7.25 runner completes `npm ci`, semantic TypeScript, targeted/full tests, Firestore Rules, security scan, production build, public browser smoke, isolated authenticated emulator UAT, fresh production rebuild, release gate, and final frozen-source verification.

## Overall program progress

Estimated roadmap completion after V7.25: **96%**. The remaining 4% is primarily certification/UAT, manual accessibility closure, translation completion and controlled production integration validation rather than missing core architecture.
