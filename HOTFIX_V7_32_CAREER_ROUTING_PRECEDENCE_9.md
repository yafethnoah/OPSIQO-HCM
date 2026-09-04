# OPSIQO ONE V7.32 - Career Routing Precedence Hotfix 9

Date: 2026-08-20

## Trigger

Windows certification for Hotfix 8 passed PowerShell compatibility, machine preflight, frozen-source verification, clean-release validation, locked dependency installation, V7.32 source audit, translation verification, Semantic TypeScript, and every targeted suite from V7.32 through V7.13.

The first failing gate was V7.12 targeted tests. The command `Open my Career GPS for my next role` incorrectly routed to `/organization` instead of `/career-gps`.

## Root cause

The command router evaluated the generic position-management pattern before the more specific Career GPS pattern. Because the generic rule accepted `open ... role`, it captured `Open my Career GPS for my next role` before Career GPS could evaluate the command.

This was a production routing-precedence defect, not a stale historical assertion.

## Repair

Hotfix 9 applies the specific-before-generic routing rule:

- Career GPS is evaluated before generic position creation.
- Talent Marketplace, Scenario Lab and AI Value remain grouped with specific intelligence/career outcomes before generic creation routes.
- Consequential-employment blocking remains before every normal route.
- Generic position creation remains available and permission-scoped.

V7.32 regression coverage now requires:

- `Open my Career GPS for my next role` -> `/career-gps`, action level `recommend`.
- `Create a new HR Manager position` -> `/organization`, mode/action level `prepare`.

## Safety boundary

No AI authority is expanded. Safe Execute remains exactly `notifications.mark_visible_read`. Consequential employment decisions remain blocked before normal routing. Custom Cortex agents remain below Execute. No production deployment command is added.

## Certification boundary

The packaging environment validates source/audit/static integrity but does not claim the locked Windows Vitest/build/browser stack. The user's Windows certification remains the authoritative dependency-backed executable proof.
