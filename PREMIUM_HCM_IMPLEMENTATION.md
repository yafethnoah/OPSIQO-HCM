# OPSIQO Premium HCM — Full Implementation Workstream

Parent: `b70e0907b8ff0caf2359fe67732df24247413dea` (`h50.5j/parsing-accuracy`)

This package closes the missing runtime surfaces identified against the September 2026 Premium HCM plan while preserving existing enterprise capabilities.

## Added
- Benefits Administration: plan catalogue, tiers, eligibility metadata, dependents, enrollment, life events, effective dates, contributions, audit/domain event evidence and provider-neutral carrier adapter.
- Payroll Integration Layer: provider-neutral adapter, secret-reference-only configuration, synchronization/reconciliation evidence, exception model and governed dashboard.
- Native Canadian Payroll: versioned 2026 reference engine with CPP/CPP2, EI, QPP/QPP2, QPIP and federal/provincial/territorial rate tables. It is fail-closed from production certification until independent authoritative reconciliation passes.
- E-Signatures: provider adapter contract, envelopes, immutable document hashes, signer state and audit evidence.
- Premium HCM certification registry and 100-point evidence weighting.
- New UI/API surfaces and navigation entries.
- Targeted tests and source-surface audit.

## Preserved / certified rather than duplicated
Enterprise foundation; positions/workforce planning; compensation; skills/career; succession/talent; time/scheduling; SSO/identity provisioning; integration runtime; documents; expenses; security; governed AI; analytics; audit; workflow; release evidence.

## Mandatory release sequence
Apply -> targeted test -> TypeScript -> full regression -> Firestore rules -> build -> static security scan -> source manifest -> UAT -> independent regulated payroll reference validation -> module certification.

Production promotion is not part of this package.
