# OPSIQO ONE V7.19 — Operational UAT & Translation Hardening

V7.19 is an evidence-driven hardening release. It does not add broad new HCM modules and it does not expand generic AI execution authority.

## 1. Operational multilingual completion

The reviewed exact-string EN/FR/ES/AR catalog now covers six surfaces:

- Sign-in
- First-organization setup
- Notification Center
- Core Settings
- Time & Leave
- Learning & Skills

Time & Leave and Learning & Skills use the existing locale-change observer. Original source text and `placeholder`, `title`, and `aria-label` values remain recoverable so changing locale does not permanently rewrite source content.

The V7.19 inventory reports 3,775 heuristic visible-source candidates, 243 exact candidates reviewed/catalogued, and 3,532 remaining. These figures are completion evidence, not a linguistic-quality or full-translation claim.

## 2. Operational authenticated accessibility UAT

The emulator-backed browser matrix is expanded to 11 authenticated routes:

Home, My Work, People, Settings, Notifications, Time & Leave, Learning & Skills, Recruiting, Program Portfolio, Meeting → Action, and AI Governance.

The browser harness checks 320px reflow, accessible names, form labels, target size, keyboard entry, mobile outcome navigation, accessibility-tree names, Arabic RTL, sign-in fallback, and reviewed Arabic translation markers on Time & Leave and Learning & Skills.

This remains certification evidence, not a WCAG 2.2 AA conformance certificate.

## 3. Program Portfolio export hardening

Program Portfolio CSV and evidence-pack construction are now pure/testable functions:

- `programPortfolioCsvCell`
- `buildProgramPortfolioCsv`
- `buildProgramPortfolioEvidencePack`

The V7.19 evidence-pack schema preserves source references and permission-scoped dashboard content. CSV cells still neutralize spreadsheet formula prefixes. Financial methodology remains explicit: OPSIQO does not infer accounting actuals from compensation records and does not combine currencies silently.

## 4. AI Execute remains on hold

The Safe Self-Service Execute allowlist remains exactly one action:

`notifications.mark_visible_read`

V7.19 does not activate locale or appearance preference execution because dependency-backed multi-user/browser UAT evidence has not yet been supplied. Consequential employment commands continue to be evaluated before the safe execution route.

## Certification boundary

The release is source-complete and source-audited. Dependency-backed certification must be completed with `RUN_OPSIQO_ONE_V7_19_VALIDATION.ps1` in the Windows/CI environment before deployment certification is claimed.
