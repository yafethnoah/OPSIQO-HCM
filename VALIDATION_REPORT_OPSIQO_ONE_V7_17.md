# OPSIQO ONE v7.17 Validation Report

**Release:** OPSIQO ONE v7.17 · HCM v8.5 — Accessibility Translation Portfolio Execution
**Date:** 2026-08-19

## Source-level results completed in the packaging environment

| Gate | Result |
|---|---:|
| V7.17 dedicated architecture/governance audit | 90/90 PASS |
| V7.16 regression | 108/108 PASS |
| V7.15 regression | 86/86 PASS |
| V7.14 regression | 58/58 PASS |
| V7.13 regression | 56/56 PASS |
| V7.12 regression | 36/36 PASS |
| V7.11 regression | 30/30 PASS |
| V7.10 regression | 21/21 PASS |
| MFA source audit | 23/23 PASS |
| V7.9.3 UX closure | 25/25 PASS |
| HCM 8.5 completion | 28/28 PASS |
| ATS + Universal Import | 29/29 PASS |
| Enterprise Self Service | 15/15 PASS |
| Automation V7.7 | 21/21 PASS |
| TS/TSX parser | 1,034 files / 0 parse errors |
| JS/MJS/CJS syntax | 44 files / 0 errors |
| JSON parse | 22 files / 0 errors |
| YAML parse | 10 files / 0 errors |
| Translation source inventory | 182 TSX files scanned; 3,770 candidate legacy strings requiring review |
| Clean-release audit | PASS |
| Frozen source manifest | 1,383 / 1,383 PASS |

## Translation evidence boundary

The source inventory found **3,770 candidate legacy strings** across 182 TSX files. This is intentionally reported as remaining review work, not as a translation-completeness percentage. The inventory can contain false positives and every supported locale still requires browser review.

## Accessibility evidence boundary

V7.17 includes a real Chrome/Chromium/Edge CDP smoke that checks public authentication routes for semantic landmarks, accessible names, keyboard focus entry, a 24px target-size floor and 320px horizontal reflow. The packaging environment did not have the dependency-backed built local application running, so this browser gate remains part of the supplied Windows/CI certification runner.

Passing that smoke still does not constitute WCAG 2.2 AA conformance. Authenticated journeys, contrast, zoom, assistive technology, language-of-parts, validation/error handling and broader device/browser coverage remain required.

## Safe Execute boundary

V7.17 intentionally leaves the safe Execute allowlist unchanged from v7.16. Only the direct-user notification-read action is enabled. Locale and appearance updates remain `hold_for_uat`. Consequential employment, compensation, approval, personnel, workflow activation, security and tenant administration operations remain outside generic AI Execute.

## Dependency-backed certification

The release is source-complete and source-regression-clean. Full dependency-backed certification is intentionally delegated to `RUN_OPSIQO_ONE_V7_17_VALIDATION.ps1`, which performs the exact locked install, semantic TypeScript, targeted and full tests, Firestore Rules, security scan, production build, release gate, translation inventory and browser accessibility smoke.

No production deployment is performed by that runner.

## Final source freeze

The final source tree was cleaned of `node_modules`, `.next`, `artifacts`, build outputs, logs and transient TypeScript build information before the source manifest was regenerated. The frozen manifest contains **1,383 entries**, and verification returned **1,383 expected / 1,383 actual / 0 errors**.
