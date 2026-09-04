# OPSIQO ONE V7.27 — Final Certification & Translation Closure

## Purpose

V7.27 is a closure release. It does not add broad new HCM architecture or widen autonomous AI authority. It hardens certification diagnosis, removes translation-inventory noise, expands reviewed multilingual coverage across high-value intelligence/security surfaces, and expands authenticated browser UAT.

Overall roadmap/source progress: **99%**.

## Reviewed multilingual expansion

V7.27 adds explicit English/French/Spanish/Arabic source-string coverage for:

- AI Copilot
- People Analytics
- Scenario Lab
- AI Value
- MFA Setup

The catalog now contains 40 governed surfaces and 2,498 explicit catalog entries. The exact-source inventory counts 2,479 reviewed candidates and 1,082 remaining candidates from 3,561 measured visible-source candidates.

The inventory filter is stricter than V7.26 and excludes additional obvious TypeScript/JSX fragments such as comparison expressions, array/type fragments and inline return fragments. The remaining count is still heuristic and does not replace browser/human linguistic review.

## Authenticated browser UAT expansion

The V7.27 browser matrix adds:

- `/ai-copilot`
- `/people-analytics`
- `/scenario-lab`
- `/ai-value`
- `/mfa/setup`

Each route participates in the existing 320px reflow, accessible-name, target-size, keyboard-entry, accessibility-tree, five-outcome mobile navigation and Arabic RTL/reviewed-marker checks.

## Certification diagnostics

V7.27 adds a dependency-free certification summary that can read the sanitized gate ledger before or after `npm ci`. On a failing generic gate or browser gate, the runner records the failure and prints the first failing gate plus the safe ledger location.

The preflight also reports only the safe npm registry host and warns about URL-encoded Windows extraction paths or OneDrive-synced paths that can interfere with npm/build behavior. It does not print registry credentials.

The V7.27 runner also removes a duplicated historical V7.21 targeted-test gate that existed in the inherited sequence.

## AI safety boundary

Safe Execute remains exactly:

`notifications.mark_visible_read`

No new Execute capability is added. Custom agents remain below unrestricted Execute, and the consequential employment firewall still executes before normal Ask OPSIQO command patterns.

## Certification boundary

Source audits, static parsing and package-integrity evidence are not equivalent to dependency-backed certification. V7.27 remains pending the Windows runner, manual accessibility sign-off, approved real connector UAT and controlled production deployment certification.
