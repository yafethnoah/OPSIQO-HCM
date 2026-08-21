# OPSIQO ONE V7.32 — Start Here

> **Hotfix 11 applied:** production document/prehire scan evidence is now fail-closed, activation uses the latest required prehire document scan state, production readiness rejects malformed/trivial credentials, and authenticated browser UAT reports route-level progress with partial failure evidence. See `HOTFIX_V7_32_DOCUMENT_SCAN_AND_UAT_HARDENING_11.md`.

> **TypeScript certification hotfix 2 applied:** the 12 compiler errors exposed by the first dependency-backed Windows run are repaired, the certification ledger is UTF-8/BOM safe, and Semantic TypeScript now runs before historical regressions. See `HOTFIX_V7_32_TYPESCRIPT_CERTIFICATION_2.md`.

> **Windows PowerShell 5.1 hotfix applied:** the certification runner and historical validation runners are ASCII-safe, and V7.32 now runs a native PowerShell parser compatibility audit on Windows before dependency installation. See `HOTFIX_V7_32_WINDOWS_POWERSHELL_5_1.md`.


Release: **V7.32 · Final Runtime Closure**  
HCM: **8.5**  
Source-development progress: **100%**  
Overall project progress reported by this release: **99.99%**

## What V7.32 closes

- The measured static visible-string localization inventory is **0 remaining / 3,528 candidates**.
- 198 newly reviewed UI strings were added to the conflict-safe EN/FR/ES/AR runtime catalog.
- 15 technical identifiers/source-code fragments are explicitly excluded from translation rather than being misreported as UI backlog.
- Authenticated accessibility UAT is expanded to Organizational Memory, Grant Workforce, Workforce Registry, Daily Brief, Experience Readiness, Operations Cockpit, Operations Orchestrator and Evidence Center.
- Deployment-readiness evidence now uses the same canonical V7.32 source-audit gate name as the certification runner.
- AI Execute authority is unchanged.

## Important truth boundary

A zero **static source** translation backlog is not a claim that every dynamic validation message, user-entered value, server response, date/number format, truncation case, accessibility label or linguistic nuance has been manually certified in every locale.

Likewise, this source package is not production-deployed. The Windows dependency-backed runner and required human accessibility, connector UAT, release/change and deployment approvals remain external evidence gates.

## Windows certification

Run from a short clean extraction path:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1
```

A successful automated run ends with:

```text
OPSIQO ONE V7.32 AUTOMATED CERTIFICATION PASS
```

The runner performs no production Firebase/App Hosting deployment.
