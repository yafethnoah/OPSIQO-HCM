# OPSIQO HCM 8.5 V7.32 — Hotfix 12 Validation Report

Date: 2026-08-20

## Trigger

Windows certification reached `V7.32 Hotfix 11 targeted tests` with all preceding gates green, then failed one assertion in `tests/production-readiness.test.ts`: the serialized readiness summary contained the literal text `private-key` inside the human-readable Firebase Admin check message. The configured secret value itself was not returned.

## Root cause

`src/lib/operations/readiness.ts` emitted this explanatory control message:

`Firebase Admin must use ADC workload identity or a structurally valid injected service-account email/private-key pair; placeholders are rejected.`

The secrecy regression intentionally rejects the token `private-key` anywhere in the public serialized readiness summary. The check therefore failed on descriptive terminology, not on leaked credential data.

## Repair

1. Public readiness wording now uses `service-account credential pair` and does not name the secret field.
2. Firebase Admin validation still reads and structurally validates the configured key internally and never returns its value.
3. The production-readiness regression now additionally asserts that the exact configured Firebase key, App Check key, automation secret, survey anonymity secret, and AI provider credential are absent from serialized output.
4. Existing `test-key` and `private-key` sentinel assertions remain fail-closed.
5. Hotfix 12 adds an explicit static audit and targeted production-readiness test gate to the canonical Windows runner.

## Validation completed in packaging environment

- Hotfix 11 static audit: 22/22 PASS
- Hotfix 12 static audit: 14/14 PASS
- V7.32 audit: 101/101 PASS
- Translation inventory verification: 3528/3528 reviewed, 0 remaining
- Production-readiness functional reproduction: PASS
  - complete baseline reports `ok=true`
  - no `test-key` token in summary
  - no `private-key` token in summary
  - no exact configured secret values in summary
  - neutral credential-pair wording present
- Windows PowerShell 5.1 encoding audit: 38 scripts PASS; native parser not run because packaging host is non-Windows
- Modified TypeScript files parse without diagnostics using the available TypeScript parser

## Dependency-backed boundary

A clean `npm ci` could not complete within the packaging environment. Therefore this report does not claim a fresh local Vitest/TypeScript 7/Next.js build for Hotfix 12. The user's Windows run already proved all preceding dependency-backed gates through Semantic TypeScript and V7.32 targeted tests; it failed only the single readiness-summary assertion repaired here. The included canonical Windows runner remains the authoritative final certification path.

## Safety

No Firebase project, App Hosting setting, production secret, `.env.local`, Firestore data, or deployment resource was modified. No secret values are packaged or printed.
