# OPSIQO HCM 8.5 — V7.9.4.2 Firebase App Hosting Multi-Environment Configuration Closure

## Purpose
Repair the App Hosting configuration boundary after Cloud Build rejected the legacy shared configuration with `fah/invalid-apphosting-yaml` and prevent UAT from inheriting production-specific Firebase identifiers or production secret references.

## Required baseline
- Exact base SHA: `b0947156b2563e32d7f45e0c691ee3b4efc9b821`
- V7.9.4.1 multi-organization and Compensation Center source remains unchanged.

## Resulting configuration model
- `apphosting.yaml` — shared, environment-neutral App Hosting defaults only.
- `apphosting.uat.yaml` — UAT Firebase identifiers, UAT URL and UAT Secret Manager references.
- `apphosting.production.yaml` — exact preservation of the previously certified production-specific `apphosting.yaml`; not deployed by this change.

## UAT backend requirement
The Firebase App Hosting backend Environment name must be exactly `uat`. Firebase then merges `apphosting.uat.yaml` over `apphosting.yaml`. Firebase Console backend environment overrides remain higher precedence.

## Secret handling
The UAT configuration references Secret Manager names only. Secret values are never written to Git, the installer output, screenshots or source files.

## Deployment guardrail
This package performs source repair and local certification only. It does not create an App Hosting build or rollout, alter UAT traffic, or change production.
