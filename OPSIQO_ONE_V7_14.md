# OPSIQO ONE v7.14 — Launchpad, Adaptive Navigation & Mobile Intelligence

## Purpose
V7.14 advances OPSIQO ONE from an AI-native HCM foundation into a simpler organization-launch and everyday-use experience. It adds a governed Organization Launchpad, a permission-scoped Daily Brief, adaptive/zero-search navigation foundations, multilingual AI response controls, and a privacy-safe mobile/PWA/low-bandwidth shell.

## Design principle
The five primary outcome destinations remain unchanged:

`Home | My Work | People | Intelligence | More`

V7.14 does not add another primary module hierarchy. New capabilities are surfaced through existing outcome pages and Ask OPSIQO.

## Organization Launchpad
The Organization Launchpad lets authorized administrators describe a new organization and prepare a starter configuration foundation.

It can apply reviewed regional defaults, selected departments, notification-digest settings, and selected Automation Marketplace packs. Marketplace workflows remain disabled until separately reviewed and activated.

Launchpad does **not**:
- create employees or other workforce members;
- create positions;
- grant membership roles or permissions;
- publish policies;
- make legal-compliance determinations;
- enable marketplace workflows automatically;
- overwrite existing MFA/security/registration settings with an unrelated bootstrap configuration.

The applied foundation is auditable and includes a human-controlled implementation checklist covering structure, members, policies, workflows, security and data import.

## Daily Brief
Daily Brief uses the existing OPSIQO ONE overview plus permission-scoped notifications. It intentionally limits the presentation to the most useful items:
- up to 3 items that need action;
- up to 2 approaching-due items;
- one evidence-backed organizational/work insight;
- work-queue summary context.

It does not create hidden individual risk scores and does not read records outside the signed-in user's permissions.

## Adaptive and zero-search navigation
V7.14 adds semantic/fuzzy navigation ranking and a local `For you` experience. The adaptive state stores page-level navigation metadata only:
- known route visit counts;
- recent known routes;
- pinned known routes.

It does not store employee IDs, worker IDs, document IDs, record content, search contents or HR data in adaptive-navigation storage.

## Multilingual intelligence
V7.14 adds an app-level multilingual intelligence foundation for English, French, Spanish and Arabic. Ask OPSIQO uses the signed-in user's locale preference when generating AI answers. Arabic sets RTL page direction.

The AI language instruction explicitly preserves canonical evidence identifiers, codes, names, numbers, dates and source-language quotations. This phase does **not** claim that every legacy screen has been fully human-translated; it establishes the shared response/direction foundation and localized V7.14 surfaces.

## Mobile / PWA / low-bandwidth foundation
V7.14 adds a global mobile outcome bar so the five-outcome model remains available across authenticated pages. It also strengthens the PWA service worker around a privacy-first cache model:
- authenticated navigations are network-only;
- `/api/` traffic is never cached;
- only static shell/assets may be cached;
- offline navigation falls back to a static privacy notice;
- employee records, payroll data, HR documents and authenticated API responses are not cached for offline use.

A connectivity banner reports offline/save-data conditions without exposing sensitive information.

## AI and security continuity
V7.14 preserves the V7.13 Agent Builder, Organizational Memory, Policy Intelligence and Automation Marketplace controls; V7.12 talent/scenario safeguards; V7.11 Cortex/Concierge/Governance controls; V7.10 action safety architecture; MFA; tenant isolation; RBAC; audit and consequential-employment boundaries.

Consequential employment decisions remain human governed and cannot be turned into unrestricted Ask OPSIQO execution.
