# OPSIQO ONE V7.28 — Deployment Readiness & Translation Closure

## Purpose

V7.28 is a final-closure release. It does not widen AI employment authority or add another broad HCM architecture layer. It strengthens deployment-readiness evidence, corrects stale certification metadata inherited by V7.27, expands reviewed multilingual coverage on four high-value OPSIQO ONE surfaces, and expands authenticated browser UAT.

Overall roadmap/source progress: **99.5%**.

## Certification metadata correction

The inherited V7.27 PowerShell runner still wrote `version = '7.26'` into its sanitized certification ledger and printed a stale `v7.26 local certification` banner. V7.28 corrects both to V7.28 so certification evidence identifies the release being tested.

## Deployment readiness separation

V7.28 adds `scripts/opsiqo85-v7-28-deployment-readiness-summary.mjs`. It separates:

1. source certification;
2. dependency/toolchain certification;
3. authenticated/public browser UAT;
4. manual accessibility sign-off;
5. approved connector UAT;
6. production-candidate status;
7. readiness for human production sign-off;
8. explicit production-deployment sign-off.

Automated tests never manufacture the last three human evidence files. The report performs no deployment operation and reads no `.env` values.

## Reviewed multilingual expansion

V7.28 adds exact English/French/Spanish/Arabic coverage for:

- Universal Data & Document Import Center;
- Intelligence Hub;
- AI Governance Center;
- Agent Builder.

The catalog now has **44 governed surfaces**, **2,666 explicit entries**, and **2,650 exact source candidates reviewed**. The corrected heuristic inventory has **904 remaining candidates** from **3,554 measured candidates**.

The inventory also excludes additional identifier-like code artifacts such as `apiFetch` or `order[l]` from the visible-text backlog. This remains a source inventory, not a linguistic-quality certification.

## Authenticated accessibility UAT expansion

The browser matrix adds/reinforces:

- `/import-center`
- `/intelligence`
- `/ai-governance`
- `/agent-builder`

Each uses reviewed Arabic markers and participates in the existing 320px reflow, accessible-name, keyboard-entry, target-size, five-outcome navigation, accessibility-tree and RTL evidence checks.

## AI safety boundary

Safe Execute remains exactly `notifications.mark_visible_read` and remains self-scoped. No new Execute authority is added. Custom agents remain below unrestricted Execute, and the consequential employment firewall remains ahead of normal Ask OPSIQO routing.

## Certification boundary

V7.28 source audit and package-integrity success are not the same as deployment certification. Dependency-backed Windows certification, manual assistive-technology accessibility sign-off, approved real connector UAT, and controlled production deployment evidence remain separate final gates.
