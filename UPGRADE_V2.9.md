# OPSIQO HCM v2.9 Upgrade Guide

## Upgrade target
Upgrade from v2.8 Human Capital Strategy to **v2.9 Enterprise Organizational Design & Operating Model Intelligence**.

## 1. Install and verify dependencies
Do not reuse an unreviewed lockfile from another project/release.

```powershell
npm install --registry=https://registry.npmjs.org
# Review package-lock.json before committing it.
npm ci
npm run typecheck
npm test
npm run test:rules
npm run build
```

## 2. Deploy security rules before exposing the feature
The following organization-scoped collections/indexes must remain server-only:
- `orgDesignSnapshots`
- `orgDesignSnapshotCodeIndex`
- `orgDesignRoleProfiles`
- `orgDesignRoleProfileCodeIndex`
- `orgDesignDecisionRights`
- `orgDesignDecisionCodeIndex`
- `orgDesignScenarios`
- `orgDesignScenarioCodeIndex`
- `orgDesignRestructuringProposals`
- `orgDesignRestructuringCodeIndex`
- `orgDesignKpis`
- `orgDesignKpiCodeIndex`
- `orgDesignReports`

Deploy/test Firestore and Storage Rules using your normal controlled release process.

## 3. Review RBAC
- Admin roles: `orgdesign.read/manage/approve/audit`
- HR Partner: `orgdesign.read/manage/audit`, **no approve**
- Manager/Employee: no enterprise Org Design permission by default

Confirm custom roles do not accidentally combine incompatible reviewer/approver authority.

## 4. Establish the baseline structure
Open `/org-design` and create a **current-date** snapshot from the existing position hierarchy. Review orphan reporting lines and detected cycles before submitting it for independent approval. Record span/layer thresholds and any cost assumptions explicitly.

## 5. Establish role architecture
Create role profiles and link governed positions. Submit and independently approve role architecture before approving decision-right records that reference those role codes.

## 6. Configure decision rights
Record the decision, accountable role, responsible roles, consulted/informed roles, approval authority, escalation and required evidence. Validate the matrix with operational leaders.

## 7. Create planning scenarios
Scenarios require an approved baseline snapshot. Use aggregate assumptions only. Scenario approval is planning governance; it must not execute hires, terminations, promotions, succession, redeployment or compensation changes.

## 8. Restructuring planning
An aggregate proposal requires an approved scenario. Before independent planning approval, document consultation, employee-relations, legal/labour and privacy review determinations. The actor recording those reviews cannot independently approve the proposal.

## 9. Configure organization-effectiveness KPIs
Add measurable KPIs with baseline, target, direction, tolerance and review date. Use the Lifecycle Command Center and `npm run orgdesign:review` to surface breaches/review work.

## 10. Production acceptance
Run the complete v2.9 acceptance checklist, AI governance checks, preflight and lifecycle UAT before promotion.
