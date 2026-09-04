# OPSIQO ONE v7.18 — Validation Report

## Release status

**Source-complete and source-audited; dependency-backed certification pending.**

Full deployment certification must not be claimed until `RUN_OPSIQO_ONE_V7_18_VALIDATION.ps1` completes successfully in a dependency-capable Windows/CI environment.

## Dedicated V7.18 source contract

Latest pre-freeze result: **78/78 PASS**.

The audit verifies the V7.18 domain, exact translation catalogue and runtime mechanism, inventory snapshot consistency, Translation Readiness service/API/UI/navigation, Program Portfolio CSV/JSON export security and provenance, AI Execute UAT gates, unchanged one-action Safe Execute allowlist, consequential-firewall ordering, authenticated browser-smoke architecture, V7.18 product identity and continued absence of unrestricted Cortex Execute authority.

## Historical source-contract regression

Latest pre-freeze results:

- V7.17: **90/90 PASS**
- V7.16: **108/108 PASS**
- V7.15: **86/86 PASS**
- V7.14: **58/58 PASS**
- V7.13: **56/56 PASS**
- V7.12: **36/36 PASS**
- V7.11: **30/30 PASS**
- V7.10: **21/21 PASS**
- MFA: **23/23 PASS**
- V7.9.3 UX closure: **25/25 PASS**
- HCM 8.5 completion: **28/28 PASS**
- ATS/Universal Import: **29/29 PASS**
- Enterprise Self Service: historical **15/15 PASS**
- Automation V7.7: historical **21/21 PASS**

## Language/config parsing

Latest pre-freeze static parser evidence:

- TS/TSX: **1,094 files / 0 parse errors**
- JS/MJS/CJS: **48 files / 0 syntax errors**
- JSON: **26 files / 0 parse errors**
- YAML: **10 files / 0 parse errors**

These parser results do not replace semantic TypeScript with installed dependencies.

## Translation inventory

Latest packaged inventory target:

- scanned TSX files: **184**
- heuristic candidate visible-source strings: **3,775**
- exact reviewed source candidates matched by inventory: **88**
- remaining candidates: **3,687**
- selected catalogued surfaces: **4**
- explicit catalogue entries: **127**
- required translated locales per catalogue entry: French, Spanish, Arabic

The inventory is heuristic. It is an auditable engineering backlog, not a linguistic certification percentage.

## Accessibility evidence boundary

V7.18 includes an authenticated real-browser accessibility harness that uses only local Firebase emulators and seeded demo data. The Windows runner builds the demo/emulator runtime, runs the harness on eight representative authenticated routes, clears demo environment variables, rebuilds the production application and reruns the release gate.

The harness is **not a WCAG 2.2 AA conformance certificate**. Manual/assistive-technology evidence remains required.

## Safe Execute boundary

V7.18 adds no second Safe Execute operation. The allowlist remains exactly:

`notifications.mark_visible_read`

It changes only unread notifications directly targeted to the signed-in actor. Shared role notifications remain unchanged. Consequential actions continue to block before low-risk matching.

## Dependency-backed gates still required

The included Windows runner must prove:

1. locked `npm ci`;
2. semantic TypeScript;
3. V7.18 and historical targeted tests;
4. full OPSIQO/Vitest suites;
5. Firestore Rules isolation;
6. security static scan;
7. production Next.js build;
8. release gate;
9. public built-app browser accessibility smoke;
10. authenticated emulator-backed browser accessibility UAT;
11. final production rebuild and release gate;
12. final frozen-source verification.

No Firebase/App Hosting production deployment is performed by the runner.

## Final package integrity

Final source-release evidence before packaging:

- clean-release audit: **PASS**
- frozen source manifest: **1,405 / 1,405 PASS**
- TypeScript/TSX parser: **1,094 / 0 errors**
- JS/MJS/CJS syntax: **48 / 0 errors**
- JSON parse: **26 / 0 errors**
- YAML parse: **10 / 0 errors**

ZIP entry count, ZIP integrity and SHA-256 are verified after archive creation and recorded in the final handoff and `.zip.sha256` file.
