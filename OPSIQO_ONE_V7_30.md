# OPSIQO ONE V7.30 — Architecture and Release Notes

## Release objective

V7.30 closes the remaining high-impact source/localization and production-attestation gaps without expanding the AI action surface.

## Translation architecture

The runtime now consumes `legacy-surface-translations-v7-30.json`. Surface-local reviewed translations continue to override conflict-safe global exact reuse. V7.30 directly covers additional high-impact surfaces and preserves English source text as the canonical source.

Measured source inventory at build time:

- 51 governed surfaces
- 2,886 explicit catalog strings
- 3,136 reviewed candidate occurrences
- 415 measured candidates remaining

The remaining inventory is heuristic and is not a linguistic-quality or formal accessibility claim.

## Validated human sign-off

`opsiqo85-v7-30-human-signoff-core.mjs` establishes a strict dependency-free validation contract. Approved sections require reviewer identity, ISO timestamp and evidence references. Release/change and production-deployment approvals additionally require governed reference values. Secret-like field names and common private key/token patterns are rejected.

Deployment readiness and final attestation consume only approvals that pass this validator.

## Production governance boundary

Automated certification does not imply production deployment. The V7.30 runner performs no Firebase/App Hosting deployment. Manual accessibility, connector UAT, release/change approval and production deployment remain separately attested.

## AI governance boundary

Safe Execute remains limited to the signed-in user's directly targeted notification-read state. No employment, compensation, approval, workflow activation, security administration or production deployment action is added.
