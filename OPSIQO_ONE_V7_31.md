# OPSIQO ONE V7.31 — Runtime Translation Finalization & External Certification Bridge

V7.31 continues the source-closure discipline established in V7.30.

## Runtime localization completion

V7.31 adds reviewed EN/FR/ES/AR runtime localization to high-use surfaces that still appeared near the top of the measured backlog. Surface-specific translation is used where context could conflict; conflict-safe global exact reuse remains available elsewhere.

Program Portfolio retains its locale-native implementation and extends that dictionary rather than stacking a second DOM translator on top of it.

Technical identifiers such as `/api/internal/automation` are marked `data-opsiqo-no-translate="true"` and are excluded from the translation backlog.

## Measured localization state

- Governed surfaces: **64**
- Explicit translation entries: **3,081**
- Reviewed source candidates: **3,320**
- Remaining measured candidates: **213**
- Total measured candidates: **3,533**

The backlog is heuristic and is not a linguistic-quality or formal accessibility conformance score.

## Accessibility / browser UAT

Authenticated browser UAT expands to Skills Passport, Manager Copilot, Career GPS, Talent Marketplace, Automation Marketplace, Automation Control, Contract Import, Manager Portal, Lifecycle, Organization Launchpad and Employee Concierge. Secure Preboarding is localized but remains token-gated and is not represented as a normal authenticated employee route.

## AI safety

Safe Execute remains exactly one self-scoped operation: `notifications.mark_visible_read`. Consequential employment actions remain blocked before ordinary command routing, and no Cortex agent receives unrestricted Execute authority.

## Release boundary

V7.31 is source-complete/source-audited only until the Windows dependency-backed runner passes and human sign-offs are completed. No production deployment is performed by the certification runner.
