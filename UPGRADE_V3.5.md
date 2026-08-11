# OPSIQO HCM v3.5 Upgrade Guide

## Purpose
v3.5 adds a governed Platform Reliability & Software Supply Chain layer above v3.4 Security Operations. It centralizes software-supply-chain evidence, backup/recovery governance, DR exercises, configuration drift, platform incidents and SRE objectives without changing the authority boundaries of the underlying HCM domains.

## Upgrade sequence
1. Back up the current Firestore configuration/rules and application release evidence.
2. Review/commit a trusted `package-lock.json` in an approved network/CI environment.
3. Run the protected software-supply-chain workflow and retain npm audit, static scan, CycloneDX SBOM, build artifact and provenance evidence.
4. Deploy the v3.5 Firestore Rules containing server-only Platform Reliability collections.
5. Configure `OPSIQO_ENABLE_PLATFORM_RELIABILITY=true` in production.
6. Set `OPSIQO_BACKUP_EVIDENCE_MODE` to the organization's actual approved evidence model.
7. Set `OPSIQO_PLATFORM_MONITORING_SOURCE` to the authoritative platform monitoring/evidence source.
8. Create and independently approve backup policies, DR plans, configuration baselines and SLOs.
9. Import/record independently reviewable cloud backup/restore and supply-chain evidence. Do not convert configuration claims into verified evidence automatically.
10. Run `npm run platform:review` for the production organization and integrate its job schedule with the existing automation process.
11. Complete the v3.5 acceptance checklist and integrated UAT before production promotion.

## New permissions
- `platform.read`
- `platform.manage`
- `platform.approve`
- `platform.audit`

HR Partner receives read/manage/audit but not approval authority. Employee and manager roles do not receive the enterprise Platform Reliability workspace.

## New operational commands
```powershell
npm run security:static-scan
npm run supplychain:sbom
npm run supplychain:provenance -- opsiqo-build.tgz
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run platform:review
```

## Important limitations
- The SBOM generator inventories the reviewed npm lockfile and labels the output as evidence; it is not a claim of exhaustive runtime/component discovery.
- The provenance generator creates provenance metadata with `slsaLevelClaimed=false`; production provenance should be generated and retained by the protected CI workflow.
- `security:static-scan` is a bounded deterministic pattern scan, not a replacement for a dedicated SAST/secret-scanning product.
- Cloud backup/PITR capability is not inferred automatically. Verified evidence must come from the actual cloud/provider environment and independent review.
