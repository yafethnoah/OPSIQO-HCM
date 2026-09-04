# OPSIQO ONE v7.15 Validation Report

## Release state
**Source-complete; dependency-backed Windows/CI certification still required before promotion.**

## Source-level evidence
- Dedicated V7.15 Connected Workforce Operations architecture/governance audit: **86/86 PASS**.
- V7.14 Launchpad/Adaptive/Mobile regression: **58/58 PASS**.
- V7.13 Agent/Memory/Policy/Marketplace regression: **56/56 PASS**.
- V7.12 Talent/Scenario/Value regression: **36/36 PASS**.
- V7.11 Cortex/Concierge/Governance regression: **30/30 PASS**.
- V7.10 OPSIQO ONE foundation regression: **21/21 PASS**.
- MFA source audit: **23 checks, 0 failures**.
- V7.9.3 UX functional closure: **25 checks, 0 failures**.
- Enterprise Self Service V7.9: **15 passed, 0 failed**.
- Automation V7.7: **21 passed, 0 failed**.
- HCM 8.5 completion audit: **28 passed, 0 failed**.
- ATS + Universal Import audit: **29 passed, 0 failed**.

## Static release integrity
- TypeScript/TSX parser: **1,011 files, 0 syntax errors**.
- JavaScript/MJS/CJS syntax: **41 files, 0 errors**.
- JSON validation: **22 files, 0 errors**.
- YAML validation: **10 files, 0 errors**.
- Clean-release audit: **PASS**.
- Frozen source manifest: **1,342 / 1,342 PASS** at the pre-distribution freeze.

## Important V7.15 safeguards proven by the dedicated audit
- Unified Workforce requires `workforce.read`; general employee-directory permission alone is insufficient.
- Human HRIS identities and digital Cortex-agent identities remain separate.
- Digital-agent registry visibility requires AI audit/manage authority.
- Grant writes require `workforce.manage`.
- Funding allocation dates must remain inside the funding-source period.
- Closed sources and terminated workers cannot receive new allocations.
- Overlapping worker allocations above 100% are rejected server-side.
- Grant Intelligence makes no donor-compliance or automatic workforce-reduction conclusion.
- Employee Service Center reuses the existing governed service-ticket/SLA engine.
- Meeting drafts are creator-private by default.
- Meeting audit metadata redacts meeting content.
- Meeting → Action does not write personnel/performance/disciplinary/health/goal records automatically.
- Notification digest is permission scoped and bounded.
- Daily Brief 2.0 makes no hidden employee-risk or individual departure-risk inference.
- Consequential employment commands remain blocked before normal Ask OPSIQO routing.

## Dependency-backed boundary
A registry-dependent dependency installation was attempted in the packaging environment. The packaging runtime became unstable/reset before a complete dependency-backed certification could be established. To avoid packaging a partial dependency tree or claiming unproved results, the release was rebuilt from the preserved V7.14 source and **no further registry-dependent install was used during final packaging**.

Therefore the following remain authoritative Windows/CI gates:
- `npm ci`
- full semantic TypeScript
- V7.15 targeted Vitest
- full Vitest/HCM regression
- Firestore Rules tests
- static security scan
- production Next.js build
- release gate

Use `RUN_OPSIQO_ONE_V7_15_VALIDATION.ps1` to execute them in order.
