# Upgrade to OPSIQO HCM v3.6.1 — Production Closure Bootstrap

v3.6.1 is a patch release over v3.6.0. It does not add a new HCM business module. It adds the missing controlled bootstrap required to obtain and review the trusted npm lockfile before the protected production-evidence closure workflow can run.

## Added
- `scripts/review-lockfile.mjs` — dependency-free structural lockfile reviewer.
- `npm run supplychain:lockfile-review`.
- `.github/workflows/lockfile-bootstrap.yml` — manual artifact-only lockfile generation/review workflow.
- v3.6.1 acceptance, runbook, validation and upgrade documentation.

## Changed
- active release metadata is `3.6.1`.
- production-promotion, software-supply-chain and production-evidence workflows bind to release `3.6.1`.
- release gate now requires the reviewed-lockfile bootstrap workflow and reviewer script.

## Human review requirement
The bootstrap workflow intentionally never commits or pushes `package-lock.json`. A reviewer must inspect the generated lockfile, lockfile-review JSON, npm dependency tree, SHA-256 file and patch before committing the lockfile through the normal repository review process.

## After the lockfile is committed
Run the protected **OPSIQO v3.6.1 Production Evidence Closure** workflow. Production remains blocked unless the real dependency/build/security/UAT/cloud-DR evidence chain completes successfully.
