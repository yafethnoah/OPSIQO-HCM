# Validation Report - OPSIQO ONE V7.32 Career Routing Precedence Hotfix 9

Date: 2026-08-20

## Scope

This hotfix repairs a production command-router precedence defect exposed by the Hotfix 8 Windows certification at the V7.12 targeted-test gate.

## Verified source results

- V7.32 source audit: 98/98 PASS.
- V7.31 through V7.10 source-audit lineage: PASS.
- V7.12 source audit: 36/36 PASS.
- MFA flow source audit: PASS (23/23).
- UX functional closure source audit: PASS (25/25; 72 nav routes).
- Enterprise Self Service, Automation V7.7, HCM completion and ATS/import source audits: PASS.
- Translation inventory remains 3,521 reviewed / 0 remaining.
- Dependency-free execution of the actual transpiled command router: Career GPS, explicit position creation, Talent Marketplace, Scenario Lab, AI Value, consequential termination, and AI Value permission-denial cases all PASS.
- Dependency-free execution of V7.11/V7.10 route samples: analytics, permission denial, termination, leave preparation, governed AI fallback and guided fallback all PASS.
- TypeScript/TSX syntax parse: 1,114 files / 0 parse errors.
- JavaScript/MJS/CJS syntax parse: 121 files / 0 errors.
- JSON parse: 86 files / 0 errors.
- YAML parse: 10 files / 0 errors.
- Windows PowerShell encoding compatibility: 38 scripts PASS (native parser remains a Windows-only gate).
- Career GPS specific route appears before generic position route.
- V7.32 regression protects Career GPS precedence and explicit position creation behavior.
- Consequential firewall remains before normal routing.
- Safe Execute remains exactly `notifications.mark_visible_read`.

## Windows evidence entering Hotfix 9

The Hotfix 8 Windows run already proved:

- locked npm installation succeeds;
- Semantic TypeScript passes;
- V7.32 through V7.13 targeted tests pass;
- V7.12 is the first failing targeted suite;
- the failing assertion was Career GPS routing (`/organization` received instead of `/career-gps`).

## Expected next Windows milestone

V7.12 targeted tests should now pass, after which certification should continue to V7.11/V7.10 targeted tests and then the later full certification gates.
