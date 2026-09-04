# OPSIQO HCM 8.5 V7.9.3.3 — Production Workflow Closure Hotfix

## Scope
Workflow-only production-certification closure repair. Application runtime behavior is unchanged from the code-certified V7.9.3.2 tree.

## Root cause
The protected `OPSIQO v3.6.1 Production Evidence Closure` workflow still declared product release `8.5-v7.9.1` and did not export the two production-readiness inputs introduced by V7.9.2:

- `OPSIQO_DEPLOYMENT_PLATFORM=firebase_app_hosting`
- `OPSIQO_APP_HOSTING_FRAMEWORK_EVIDENCE_REF=${{ vars.OPSIQO_APP_HOSTING_FRAMEWORK_EVIDENCE_REF }}`

Because `npm run preflight:production` now fails closed on those controls, the evidence-closure workflow would have stopped before generating a valid release evidence bundle.

## Repair
- Updated production evidence closure product metadata to `8.5-v7.9.3`, consistent with `apphosting.yaml` and the production promotion workflow.
- Added the approved Firebase App Hosting deployment-platform declaration.
- Added the controlled App Hosting staging/UAT compatibility evidence reference.
- Extended the V7.9.2 certification-repair audit with three regression checks so the production evidence workflow cannot silently regress.

## Certification consequence
The frozen source tree changed, so this package has a new source manifest and must receive one fresh code-certification run before production evidence closure/promotion. Do not reuse the V7.9.3.2 code-certification evidence as evidence for this exact source tree.
