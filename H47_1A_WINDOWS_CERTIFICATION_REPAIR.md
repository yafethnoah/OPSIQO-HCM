# OPSIQO H47.1A — Windows Certification Repair

H47.1A is a narrow certification/stability patch on top of H47.1. It does not remove or bypass any H47/H47.1 mobile governance controls.

## Root cause from Windows validation

The H47.1 validation runner executed the root Next.js TypeScript project before installing the independent Expo mobile workspace. The root `tsconfig.json` included `**/*.ts` and `**/*.tsx`, so it incorrectly compiled `mobile/**` with the web application's path alias (`@/* -> ./src/*`) and without Expo/React Native dependencies. This caused the large `Cannot find module 'expo-router'`, `react-native`, and mobile alias error set.

The same validation exposed real source defects that are fixed rather than hidden:

1. H46 shift and expense domain events were emitted with values that were absent from the authoritative `WorkflowTrigger` / `DomainEventType` catalog.
2. Expense event emission used action names directly, and the submit-state condition contained `submitted` while the action is `submit`; this could skip the submitted domain event.
3. The mobile shared UI module exported `styles` before the block-scoped declaration.
4. One React Native font weight used an unsupported intermediate value (`750`).

## H47.1A repair

- Root TypeScript explicitly excludes the independent `mobile` workspace.
- Mobile TypeScript remains strict and is validated from `mobile/tsconfig.json` after mobile dependencies are installed.
- H46 shift events are registered as authoritative workflow/domain-event types.
- Expense transitions map to stable, past-tense domain events:
  - `expense.submitted`
  - `expense.manager_approved`
  - `expense.finance_approved`
  - `expense.rejected`
  - `expense.paid`
  - `expense.cancelled`
- Every successful expense state transition writes its domain event in the same batch as the claim/audit update.
- Mobile UI style declaration order is repaired.
- Mobile typography uses supported React Native font weights.
- Certification uses `expo install --check`, not `--fix`, so validation cannot silently mutate source.
- Mobile dependency installation uses `--no-package-lock` for this package because H47.1 did not ship an independent mobile lockfile; the validation run therefore does not create a new unmanifested source file.
- Source-manifest verification is immutable during certification; the runner verifies rather than regenerates it.
- Generated `.expo` and `web-build` directories are excluded from the source-manifest contract.

## Governance preserved

- Mobile clients do not write directly to Firestore.
- GPS capture remains explicit attendance-event only.
- Biometric templates remain device-local.
- Offline attendance remains bounded, secure, and server-authoritative on replay.
- ATS/recruiting human-decision boundaries remain unchanged.
- Manager mobile mode remains visibility-only in H47.1.

## Required Windows gate

Run `RUN_OPSIQO_H47_1A_VALIDATION.ps1`. The authoritative success line is:

`H47.1A OPSIQO EMPLOYEE MOBILE CERTIFICATION REPAIR: PASS`
