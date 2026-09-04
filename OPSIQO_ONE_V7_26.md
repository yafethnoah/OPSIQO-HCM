# OPSIQO ONE V7.26 — Certification Environment & Translation Closure

## Release intent

V7.26 is a closure release. It does not expand employment-decision authority or introduce a new HCM architecture. It strengthens Windows certification isolation and restores the user's pre-existing shell environment after emulator/browser UAT, while extending reviewed EN/FR/ES/AR coverage to employee lifecycle surfaces.

## Certification environment restoration

V7.25 correctly isolated Firebase emulator data, but its runner removed demo/emulator variables after authenticated UAT rather than restoring any pre-existing values in the caller's PowerShell session. V7.26 snapshots the relevant environment variables before each browser/UAT phase and restores their exact previous existence/value afterward. Secret values are not written to the certification ledger.

The runner continues to use `firebase.test.json`, `demo-opsiqo-local`, locked `firebase-tools`, local emulator ports only, and contains no deployment command.

## Translation evidence

V7.26 adds reviewed exact EN/FR/ES/AR catalogs for:

- Employee Portal
- Employee Profile
- Employee Relations
- Separation / Offboarding

The visible-string inventory also excludes obvious JSX/code fragments such as state initializers and conditional-expression fragments from the heuristic backlog. This improves backlog accuracy; it is not represented as translation work.

Frozen V7.26 inventory target:

- 35 governed surfaces
- 2,277 explicit translation entries
- 2,238 exact reviewed source candidates
- 1,389 remaining heuristic candidates
- 3,627 total candidate visible strings after code-fragment filtering

A reviewed entry remains an engineering/source coverage claim, not a linguistic-quality, full browser-coverage or WCAG conformance claim.

## Accessibility UAT

Authenticated emulator browser UAT adds:

- `/employee`
- `/employee-relations`
- `/separations`
- `/people/worker-001`

with Arabic RTL and reviewed Arabic marker checks alongside the existing 320px reflow, accessible-name, target-size, keyboard-focus, unique-ID, mobile-outcome and accessibility-tree checks.

## AI governance

Safe Execute remains frozen at exactly `notifications.mark_visible_read`. No new Execute authority is granted to Separation, Employee Relations, Employee Profile, Employee Portal or any consequential employment operation. The consequential-action firewall remains ahead of ordinary command routing and custom Cortex agents remain below unrestricted Execute.

## Certification boundary

V7.26 is intended to be source-complete and source-audited. It is not deployment-certified until the included Windows runner completes dependency installation, semantic TypeScript, Vitest, Firestore Rules, security scanning, production builds, public browser accessibility, authenticated emulator UAT and the final release gate.
