# OPSIQO HCM v3.6.1 Validation Report — Reviewed Lockfile Bootstrap & Production Closure

Validation date: **2026-08-11**  
Package version: **3.6.1**

## Release status
**Source/integration validated; production remains blocked only on the real reviewed npm lockfile/dependency-build/cloud execution chain.**

v3.6.1 is a patch release over v3.6.0. It adds a controlled, human-reviewed lockfile bootstrap so the remaining dependency gate can be closed in a network-enabled GitHub runner without weakening the existing v3.6 evidence chain.

## Registry availability in this execution environment
Direct network checks against `registry.npmjs.org` were attempted from the release container:

- DNS lookup: **no address returned**
- `curl -I https://registry.npmjs.org/`: **exit 6 — Could not resolve host**
- `npm ping --registry=https://registry.npmjs.org`: **timed out after 25 seconds (exit 124)**
- npm cache available for project dependencies: **none sufficient to generate an offline lockfile**

Therefore a real npm dependency graph could not be resolved in this environment and no trusted `package-lock.json` or `node_modules` tree was created.

## v3.6.1 closure-bootstrap controls added
- dependency-free `scripts/review-lockfile.mjs`;
- dependency-free exact-tree `scripts/source-manifest.mjs` generator/verifier that rejects hash drift, unlisted files and symbolic links;
- dependency-free positive/negative reviewer self-test `scripts/test-lockfile-review.mjs`;
- `npm run supplychain:lockfile-review` and `npm run supplychain:lockfile-review:test`;
- manual **OPSIQO v3.6.1 Reviewed Lockfile Bootstrap** GitHub workflow;
- bootstrap requires explicit `GENERATE_LOCKFILE` authorization;
- workflow generates the lockfile with lifecycle scripts disabled;
- workflow reruns `npm ci --ignore-scripts` to prove npm can consume the generated graph;
- workflow uploads the generated lockfile, structural review JSON, npm dependency tree, SHA-256 evidence and review patch;
- workflow has `contents: read` only and contains no `git push`/automatic commit path;
- protected production-evidence, production-promotion and software-supply-chain workflows re-run the reviewer against the **committed** lockfile before dependency installation;
- protected production closure binds `artifacts/committed-lockfile-review.json` into the final SHA-256 production-evidence bundle and requires the `lockfile_review` gate to pass.

## Lockfile reviewer runtime tests
Synthetic fixtures were executed directly with Node.js and no project dependencies installed.

### Positive fixture
- package/root name matches package.json: **PASS**
- release version `3.6.1`: **PASS**
- lockfileVersion `3`: **PASS**
- direct dependency/devDependency names/specs match exactly: **PASS**
- exact direct versions: **PASS**
- direct integrity metadata: **PASS**
- direct HTTPS resolution: **PASS**
- reviewer result: **PASS**

### Negative fixture
The locked `next` version was deliberately changed from `16.2.12` to `0.0.0`.

- reviewer result: **REJECTED**
- exit code: **2**
- mismatch reason surfaced: **PASS**

The standalone reviewer self-test likewise reports:

```json
{"status":"PASS","alignedFixture":"accepted","directVersionMismatch":"rejected"}
```

## Production-evidence bundle regression test
A complete synthetic evidence fixture was run through the actual v3.6.1 generator/verifier with the new committed-lockfile-review evidence included.

Required gates included:
- lockfile
- lockfile_review
- source_manifest
- npm_ci
- npm_audit
- static_scan
- secret_scan
- codeql
- sbom
- typecheck
- unit_tests
- rules_tests
- build
- ai_evaluate
- ai_governance
- preflight
- integrated_uat
- provenance

Result under the complete synthetic fixture:
- production evidence generator: **READY**
- production evidence verifier: **ready=true**
- artifact hash mismatch: **false**
- `lockfile_review` artifact present and SHA-256-bound: **PASS**

This is a deterministic regression fixture only; it does not substitute for the real protected CI run.

## Exact source/static validation
- TypeScript / TSX source files parsed under `src`, `scripts` and `tests`: **731**
- TypeScript parser diagnostics: **0**
- Project-local imports inspected: **1,837**
- Unresolved project-local imports: **0**
- GitHub workflow YAML files parsed: **8 / 8 PASS**
- bounded OPSIQO source/secret scan: **PASS**
- exact-tree source-manifest self-test: **PASS** (baseline accepted; hash tamper rejected; unlisted file rejected)
- lockfile reviewer self-test: **PASS** (aligned fixture accepted; direct version mismatch rejected)
- synthetic production readiness with release `3.6.1` and complete required controls: **PASS**
- production readiness checks evaluated: **25**

## Release gate
Final v3.6.1 source release-gate execution: **49 / 50 PASS**.

The only failing gate is the real `package-lock.json` gate; all other release/source/workflow/tooling gates pass.

The missing lockfile is intentional in this handoff. A synthetic/fabricated package lock is not shipped.

## Gates still NOT verified in this environment
Because the npm registry and real cloud/deployed environment are unavailable here, the following remain pending until the protected workflows run:

- reviewed real `package-lock.json` generated from npm registry metadata;
- full real `npm ci` with lifecycle behavior;
- `npm audit` on the resolved graph;
- dedicated Gitleaks execution in protected GitHub CI;
- CodeQL analysis in protected GitHub CI;
- dependency-aware TypeScript compile using the declared TypeScript package;
- complete Vitest unit/integration suite using declared dependencies;
- Firebase Emulator Rules tests;
- Next.js production build;
- AI evaluation/governance against the configured production organization/model profile;
- authenticated deployed Lifecycle UAT;
- real production Firestore PITR/backup capture;
- real temporary-database restore and sentinel verification;
- measured production-project RTO/RPO;
- final ready production-evidence bundle.

## Decision boundary
The reviewed-lockfile artifact validates structure, exact root dependency alignment and basic lockfile resolution/integrity evidence. It does not prove a package is secure, vulnerability-free, trustworthy or buildable. The protected CI build/test/security/cloud evidence chain remains mandatory before production promotion.

## Release integrity
- Source-manifest entries (manifest excludes itself): **844**
- Expected ZIP entries including `SOURCE_MANIFEST.sha256`: **845**
- Final source-manifest and ZIP verification are performed after this report is frozen; any mismatch blocks handoff.
