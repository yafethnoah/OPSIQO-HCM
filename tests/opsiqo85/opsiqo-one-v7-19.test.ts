import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import type { ProgramPortfolioDashboard } from '@/domain/opsiqo-one-v7-17';
import catalog from '@/lib/opsiqo-one/legacy-surface-translations-v7-19.json';
import { buildProgramPortfolioCsv,buildProgramPortfolioEvidencePack,programPortfolioCsvCell } from '@/lib/opsiqo-one/program-portfolio';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { executionUatDashboard } from '@/lib/opsiqo-one/execution-uat';
import { SAFE_EXECUTION_ALLOWLIST } from '@/lib/opsiqo-one/safe-execution';
import { translationReadinessDashboard } from '@/lib/opsiqo-one/translation-readiness';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}
const dashboard:ProgramPortfolioDashboard={
 rows:[{projectId:'p1',projectCode:'=SUM(A1:A2)',projectName:'Demo Project',fundingSourceId:'f1',fundingCode:'G1',fundingName:'Grant One',currency:'CAD',workerCount:2,allocationCount:2,plannedWorkforceAmount:100,approvedBudget:1000,actual:200,commitment:100,forecast:850,budgetVariance:700,budgetUtilizationPct:30,evidenceCount:2,evidenceFreshThrough:'2026-08-19',evidenceState:'complete'}],
 currencySummaries:[{currency:'CAD',approvedBudget:1000,actual:200,commitment:100,forecast:850,plannedWorkforceAmount:100,projectCount:1}],
 evidence:[{id:'e1',projectId:'p1',fundingSourceId:'f1',kind:'actual',amount:200,currency:'CAD',evidenceDate:'2026-08-19',sourceType:'ledger_extract',sourceReference:'ledger:2026-08-19',createdBy:'u1',createdAt:'2026-08-19T00:00:00.000Z'}],
 metrics:{projects:1,projectsWithBudgetEvidence:1,projectsWithActualEvidence:1,projectsWithCompleteEvidence:1,projectsMissingFinancialEvidence:0},signals:[],generatedAt:'2026-08-19T00:00:00.000Z',methodologyNotice:'Explicit evidence only. Currencies remain separate.'
};
describe('OPSIQO ONE v7.19 operational UAT translation hardening',()=>{
 it('extends reviewed exact-string translation to operational Time and Learning surfaces',()=>{expect(Object.keys(catalog).sort()).toEqual(['learning','notifications','settings','setup','signin','time']);for(const key of ['time','learning'] as const){expect(Object.keys(catalog[key].translations).length).toBeGreaterThan(40);for(const t of Object.values(catalog[key].translations))expect(Boolean(t.fr&&t.es&&t.ar)).toBe(true)}});
 it('preserves the V7.19 reviewed-coverage floor while later releases may close the backlog',()=>{const d=translationReadinessDashboard(actor('employee',['self.read']));expect(d.reviewedSourceCandidates).toBeGreaterThanOrEqual(240);expect(d.remainingCandidates).toBeGreaterThanOrEqual(0);expect(d.reviewedSourceCandidates+d.remainingCandidates).toBe(d.totalSourceCandidates);expect(d.boundary).toContain('browser and human review')});
 it('keeps Execute expansion on hold without browser UAT proof',()=>{expect(SAFE_EXECUTION_ALLOWLIST).toHaveLength(1);expect(SAFE_EXECUTION_ALLOWLIST[0]?.id).toBe('notifications.mark_visible_read');expect(executionUatDashboard().expansionStatus).toBe('hold')});
 it('keeps consequential employment commands ahead of safe Execute',()=>{const r=routeOpsiQoCommand(actor('org_admin',['self.read','notifications.read']),'Mark my notifications read and terminate Ahmed');expect(r.mode).toBe('blocked');expect(r.risk).toBe('consequential')});
 it('escapes spreadsheet formula prefixes in Program Portfolio CSV',()=>{expect(programPortfolioCsvCell('=1+1')).toBe('"\'=1+1"');const csv=buildProgramPortfolioCsv(dashboard);expect(csv).toContain("'=SUM(A1:A2)");expect(csv).toContain('Explicit evidence only. Currencies remain separate.')});
 it('builds a provenance-preserving V7.19 Program Portfolio evidence pack',()=>{const pack=buildProgramPortfolioEvidencePack(dashboard,'o1');expect(pack.schemaVersion).toBe('OPSIQO_ONE_V7_19_PROGRAM_PORTFOLIO_EXPORT');expect(pack.organizationId).toBe('o1');expect(pack.evidence[0]?.sourceReference).toBe('ledger:2026-08-19');expect(pack.currencySummaries).toEqual(dashboard.currencySummaries)});
});
