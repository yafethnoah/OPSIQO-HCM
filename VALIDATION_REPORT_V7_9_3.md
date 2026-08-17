# OPSIQO HCM 8.5 V7.9.3 — Consolidated Recovery Validation Report

## Source lineage

This project was rebuilt from the user-provided, verified V7.9.1 repaired code-green source package and then consolidated with the V7.9.2 certification/security repair layer and the V7.9.3 UX/functional-closure layer.

The uploaded V7.9.1 baseline SHA-256 was verified before modification:

`df599c78166e8cd68f4b031c55b022d5205fc7b09eefb2dd5a762656c1950d36`

The V7.9.3 UX payload was also checked against its supplied SHA-256 before integration. The official navigation/search/skip-link implementation was retained, and the existing `/employee` Employee Portal destination was preserved in the simplified People navigation.

## Packaging-environment checks completed

- V7.9.2 certification/security repair audit: **25 / 25 PASS**
- Official V7.9.3 UX functional-closure audit: **PASS**, 47 navigation destinations, 4 literal API endpoints checked, 0 warnings, 0 failures
- Extended V7.9.3 route/RBAC/accessibility audit: **25 / 25 PASS**, 47 routes, no missing or duplicate navigation routes
- Clean-release audit: **PASS**
- TypeScript/TSX parser syntax check: **890 files / 0 syntax errors**
- JavaScript/MJS `node --check`: **34 files / 0 syntax errors**
- JSON parse: **18 files / 0 errors**
- YAML parse: **10 files / 0 errors**
- High-risk production CI design check is included in the V7.9.2 audit: WIF/OIDC + ADC, protected certification branch, pre-install source-manifest verification, no long-lived Firebase private key/client-email credentials in production promotion.

## UX/functional closure included

- Home-first navigation
- Start / People / Talent & Work / Insights / More / Admin & Platform information architecture
- `More` and `Admin & Platform` collapsed by default
- Permission-aware page/task/module finder
- Active-page `aria-current`
- Skip-to-main keyboard navigation and focusable main landmark
- Employee Portal remains directly discoverable
- Route-integrity and literal API-route checks
- Dead-control static scan
- End-to-end UAT matrix in `docs/OPSIQO_V7_9_3_UX_FUNCTIONAL_UAT.md`

## Release/security closure included

- Team-scoped manager ATS permission support retained
- Employment-record direct client reads limited to HR or the owning worker
- Workflow definition/run/step-run internals are server-owned in Firestore Rules
- Production promotion uses GitHub OIDC → Google Workload Identity Federation → ADC
- Production branch/ref enforcement and source-manifest verification before dependency installation
- Source commit and Cloud Run deployment revision are distinct provenance values
- Code certification and production certification are separate fail-closed runners
- Scheduler default-branch deployment helper is dry-run by default
- Next.js 16 + Firebase App Hosting requires controlled compatibility evidence before production certification

## What is not claimed in this packaging environment

A fresh dependency installation did not complete within the available packaging execution window. Therefore this report does **not** claim a new semantic TypeScript 7 typecheck, full Vitest run, Firestore emulator execution, Next.js production build, or current npm vulnerability result for the modified V7.9.3 tree.

The recovered V7.9.1 baseline had already passed its Windows code tests before this overlay, but the consolidated V7.9.3 source must be certified again because the source changed.

Run on Windows/CI:

`RUN_CODE_CERTIFICATION.cmd`

Only after that passes and controlled UAT is complete should production certification be run with genuine external evidence:

`RUN_PRODUCTION_CERTIFICATION.cmd`

Production readiness remains fail-closed. **Code-green is not the same as production-certified.**
