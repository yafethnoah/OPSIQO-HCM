# OPSIQO ONE V7.32 — Production Promotion Governance Hotfix 10

## Trigger
The Windows V7.32 certification runner passed targeted tests, Firestore Rules, the security static scan, and the production Next.js build, then failed the v3.6.1 Release Gate at the production-promotion workflow contract.

## Root cause
`.github/workflows/production-promotion.yml` identified release 3.6.1 and exposed production evidence reference variables, but it did not execute the committed lockfile review or the production preflight required by `scripts/release-gate.ts`. It also did not fail closed when approved evidence-reference variables were empty.

## Repair
The production-promotion workflow now:
1. requires non-empty production evidence, cloud DR evidence, DR exercise evidence, and App Hosting framework evidence references;
2. verifies the frozen source manifest before dependency installation;
3. runs `scripts/review-lockfile.mjs` before `npm ci`;
4. runs `npm run preflight:production` after dependency installation and before production certification;
5. preserves the existing protected certification-ref, OIDC/WIF authentication, production environment, UAT, and evidence artifact boundaries.

## Safety boundary
This hotfix does not deploy production from the V7.32 local certification runner. It strengthens the protected production-promotion workflow and keeps promotion human/evidence gated.
