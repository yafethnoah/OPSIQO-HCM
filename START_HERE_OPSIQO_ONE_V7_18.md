# Start Here — OPSIQO ONE v7.18

## Release

**OPSIQO ONE v7.18 · HCM v8.5 — UAT Accessibility Translation Certification**

This is the complete source package. V7.18 focuses on measurable translation completion, authenticated browser accessibility evidence, Program Portfolio evidence export, and UAT gating for future low-risk AI Execute actions.

## Important status

The source package is **source-complete and source-audited, pending dependency-backed certification**.

Do not call the release deployment-certified until the included Windows runner reaches:

`OPSIQO ONE V7.18 CERTIFICATION PASS`

The runner does not deploy Firebase or App Hosting and does not intentionally print `.env` values, API keys, tokens, cookies or private keys.

## Windows certification

Open PowerShell in the extracted project folder and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_18_VALIDATION.ps1
```

The runner performs frozen-source verification before installation, `npm ci`, the V7.18 and historical audit/test chain, semantic TypeScript, Firestore Rules, security scanning, production build/release gates, the V7.17 public browser accessibility smoke, and a V7.18 authenticated browser pass using local Firebase emulators and seeded demo data.

## V7.18 UAT focus

After certification, review these flows first:

1. Sign-in in English/French/Spanish/Arabic.
2. First-organization setup translations.
3. Settings and Notifications translated labels and Arabic RTL.
4. Translation Readiness inventory/backlog.
5. Program Portfolio CSV export.
6. Program Portfolio JSON evidence pack and source references.
7. Existing Safe Execute action: mark directly targeted unread notifications read.
8. Two-user/shared-role notification isolation.
9. Mixed consequential command, e.g. a safe notification request plus a termination request — consequential blocking must win.
10. Authenticated mobile/keyboard accessibility across Home, My Work, People, Settings, Notifications, Program Portfolio, Meeting → Action and AI Governance.
11. MFA and tenant-isolation regression.

## Translation truth boundary

The packaged V7.18 inventory reports 3,775 heuristic candidate visible-source strings, 88 exact reviewed source candidates matched by the inventory, and 3,687 remaining candidates. The exact catalogue contains 127 EN/FR/ES/AR entries across four selected surfaces. These are engineering coverage signals, not a claim that every legacy screen is linguistically certified.

## Accessibility truth boundary

The browser tooling produces real accessibility evidence but does not independently establish WCAG 2.2 AA conformance. Manual and assistive-technology certification remains required.

## AI Execute boundary

V7.18 does **not** expand the Safe Execute allowlist. The only enabled low-risk action remains `notifications.mark_visible_read`, scoped to the signed-in user's directly targeted notifications.
