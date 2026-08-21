# OPSIQO ONE V7.32 — Final Runtime Closure

V7.32 is a narrow closure release built on V7.31. It does not introduce a new HCM architecture layer or broaden AI employment authority.

## Runtime localization closure

The V7.32 inventory scans TSX application/components and counts static visible strings after excluding explicit technical identifiers and obvious source-code fragments. The current snapshot reports:

- supported locales: EN / FR / ES / AR
- catalogued surfaces: 65
- explicit catalog entries: 3,280
- measured visible candidates: 3,521
- reviewed candidates: 3,521
- remaining measured static candidates: **0**

A translation can be considered reviewed either because its surface has an explicit FR/ES/AR entry or because the exact English source has one unambiguous reviewed translation across the catalog. Exact-source conflicts are never globally reused.

## Explicit technical non-translation

V7.32 records technical identifiers such as webhook header names, environment flags, command names and source-code fragments in `docs/OPSIQO_V7_32_NON_TRANSLATABLE_IDENTIFIERS.json`. They are not presented as translated UI and no longer inflate the localization backlog.

## Certification-gate consistency fix

The deployment-readiness evaluator and Windows runner now use the same canonical source gate:

`V7.32 Final Runtime Closure audit`

This prevents an automated source pass from being missed because of a gate-name mismatch.

## Safety boundary

Safe Execute remains limited to `notifications.mark_visible_read`. Consequential employment commands remain intercepted before normal Ask OPSIQO routing, and no Cortex agent has unrestricted Execute authority.

## Production boundary

V7.32 is source-complete/source-audited only until the dependency-backed Windows certification and required human sign-offs actually pass. Automated certification is distinct from production deployment.
