# Phase 4 v2.2 Production Readiness Acceptance

## Release engineering
- [ ] `package-lock.json` is generated from the approved registry and committed.
- [ ] `npm ci` succeeds on a clean runner.
- [ ] `npm run release:gate` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes, including production-readiness tests.
- [ ] `npm run test:rules` passes.
- [ ] `npm run build` passes.

## Runtime readiness
- [ ] `/api/health` returns the current OPSIQO HCM service/version identity.
- [ ] `/api/health/ready` returns 200 only when mandatory production configuration is ready.
- [ ] Readiness output contains no secret values.
- [ ] Server/client Firebase project IDs match.
- [ ] Server/client storage bucket IDs match.
- [ ] Production demo mode is disabled.
- [ ] App Check, privileged MFA and document-scan enforcement are enabled.
- [ ] Automation and survey-anonymity secrets meet the configured minimum length.
- [ ] Production AI provider is non-demo and governed configuration is required.

## Governance continuity
- [ ] v2.1 diagnostic independent approval remains intact.
- [ ] AI consequential-use guardrails remain intact.
- [ ] No employee/manager browser access is added to server-only diagnostic/AI collections.
- [ ] HR Diagnostic remains a maturity/evidence system, not a legal compliance certification engine.

## Operations
- [ ] Production runbook is reviewed by the release owner.
- [ ] Rollback artifact and Rules version are identified before deployment.
- [ ] Release evidence is retained with commit SHA, lockfile hash, test/build outputs and approver.
