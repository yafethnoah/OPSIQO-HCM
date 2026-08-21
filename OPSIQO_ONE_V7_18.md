# OPSIQO ONE v7.18 — UAT Accessibility Translation Certification

OPSIQO ONE v7.18 is an evidence-closure phase built on v7.17. It does not broaden consequential AI authority. Instead it makes translation progress measurable, moves accessibility certification into authenticated emulator-backed browser journeys, adds exportable Program Portfolio evidence, and makes future Safe Execute expansion explicitly UAT-gated.

## 1. Exact translation catalogue on high-friction surfaces

V7.18 introduces a reviewed four-locale exact-string catalogue for selected high-friction inherited surfaces:

- Sign-in
- First-organization setup
- Notifications administration/inbox
- Core Settings labels

The catalogue contains 127 explicit English source strings with explicit French, Spanish and Arabic translations. Runtime translation uses exact catalogue lookup; it does not silently machine-translate arbitrary HR content. Original DOM text and translated attributes are preserved so locale changes can be reversed safely.

The source inventory remains intentionally conservative. The current frozen inventory reports:

- 184 scanned TSX files
- 3,775 heuristic candidate visible-source strings
- 88 exact reviewed source candidates matched by the inventory
- 3,687 remaining candidate strings requiring review
- 4 catalogued surfaces
- 127 explicit catalogue entries

The 88/3,775 figure is an engineering review indicator, **not a linguistic completeness percentage**. Candidate detection is heuristic and can contain false positives or omit dynamic language.

## 2. Translation Readiness

A new `/translation-readiness` workspace reports the packaged inventory rather than asserting that the inherited application is completely translated. It is available to users with `self.read` and exposes:

- supported locales;
- scanned-file count;
- exact reviewed-source count;
- remaining candidate backlog;
- largest source-file backlogs;
- the translation certification boundary.

The supported OPSIQO ONE locale foundation remains English, French, Spanish and Arabic, with Arabic RTL support.

## 3. Authenticated browser accessibility UAT

V7.18 adds a second browser certification harness that runs only against isolated local Firebase emulators and seeded demo data. It exercises representative authenticated routes:

- Home
- My Work
- People
- Settings
- Notifications
- Program Portfolio
- Meeting → Action
- AI Governance

At a 320×800 viewport the harness verifies evidence including:

- authenticated route retention;
- main landmark presence;
- page heading presence;
- labelled form controls;
- named interactive controls;
- unique IDs;
- minimum target-size checks;
- 320px horizontal reflow;
- five-outcome mobile navigation;
- current-page navigation state;
- keyboard focus entry;
- Accessibility Tree names;
- Arabic RTL and localized Home navigation.

This browser smoke is **not a WCAG 2.2 AA conformance claim**. Manual/assistive-technology certification is still required for representative workflows, contrast, zoom/reflow, screen readers, language-of-parts, validation/error behavior, dialogs, MFA and supported browser/device combinations.

## 4. Program Portfolio export

V7.18 extends the authoritative Program Portfolio dashboard with permission-scoped CSV and JSON evidence-pack export.

The CSV export:

- reuses `workforce.read` authorization;
- keeps currencies separate;
- includes project/funding/workforce and recorded financial evidence states;
- includes the methodology boundary;
- prefixes spreadsheet-formula-like cells to reduce formula-injection risk.

The JSON evidence pack:

- carries an explicit V7.18 schema identity;
- includes organization and generation metadata;
- preserves source references/provenance;
- includes currency-separated summaries and portfolio rows;
- preserves the no-inference accounting boundary.

Compensation records are not converted into accounting actuals. Missing financial evidence remains missing/not configured.

## 5. Safe Execute UAT gates

V7.18 deliberately keeps the Safe Self-Service Execute allowlist at exactly one action:

`notifications.mark_visible_read`

That action remains limited to unread notifications explicitly targeted to the signed-in user. Shared role notifications are not mutated.

The AI Governance Center now distinguishes implementation gates from browser-UAT gates. Current implementation gates include exact allowlist matching, permission rechecking, direct-user scope, shared-role isolation, batch limits, consequential-firewall precedence and delegation to the authoritative notification service.

Browser UAT remains required for multi-user isolation, retry/reconciliation, screen-reader completion/error feedback and multilingual execution feedback.

Potential future actions such as locale or appearance preference updates remain **HOLD FOR UAT**. V7.18 adds no second Execute capability.

## 6. Consequential action boundary

The consequential-action detector continues to run before normal routing or low-risk Safe Execute matching. Generic AI execution remains unavailable for employment decisions, compensation changes, approval/denial of another person's request, personnel deletion, workflow activation, security actions and tenant administration.

Custom Cortex agents remain capped below unrestricted Execute.

## 7. Product identity and navigation

**OPSIQO ONE v7.18 · HCM v8.5**

The five primary outcomes remain:

**Home | My Work | People | Intelligence | More**

V7.18 continues the OPSIQO ONE principle that capability growth should not create menu sprawl.

## Certification status

The packaged source is source-complete and source-audited. Full dependency-backed certification must still pass in the included Windows runner before deployment certification is claimed. That runner performs locked dependency installation, semantic TypeScript, tests, Firestore Rules, security scanning, production builds, public browser accessibility smoke, authenticated emulator-backed accessibility UAT and final release gating.
