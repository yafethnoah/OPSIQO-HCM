import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import type { IntegrationDashboard } from '@/domain/integration';
import catalog from '@/lib/opsiqo-one/legacy-surface-translations-v7-22.json';
import { integrationProductionReadiness } from '@/lib/integration/production-readiness';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { SAFE_EXECUTION_ALLOWLIST } from '@/lib/opsiqo-one/safe-execution';
import { translationReadinessDashboard } from '@/lib/opsiqo-one/translation-readiness';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}
function dashboard(overrides:Partial<IntegrationDashboard>={}):IntegrationDashboard{return{connectors:[],contracts:[],runs:[],stagingRecords:[],deadLetters:[],reconciliations:[],events:[],metrics:{approvedConnectors:0,activeConnectors:0,degradedFailingConnectors:0,approvedContracts:0,failedRuns24h:0,successRate30d:100,averageLatencyMs:0,stagedRecords:0,rejectedStagingRecords:0,openDeadLetters:0,reconciliationVariances:0,activeRuntimeProfiles:0,openRuntimeCircuits:0,overdueRuntimeSchedules:0,rejectedWebhookReceipts24h:0,readinessScore:100,readinessLevel:'resilient'},standards:[],operatingNotice:'',generatedAt:new Date().toISOString(),...overrides}}

describe('OPSIQO ONE v7.22 integration and connected-knowledge hardening',()=>{
 it('extends reviewed translation to nineteen governed surfaces',()=>{
   for(const key of ['onboarding','workforce_planning','integrations','integration_runtime'] as const){expect(Object.keys(catalog[key].translations).length).toBeGreaterThan(30);for(const t of Object.values(catalog[key].translations))expect(Boolean(t.fr&&t.es&&t.ar)).toBe(true)}
 });
 it('preserves the V7.22 reviewed-coverage floor while later releases may close the backlog',()=>{const d=translationReadinessDashboard(actor('employee',['self.read']));expect(d.reviewedSourceCandidates).toBeGreaterThanOrEqual(850);expect(d.remainingCandidates).toBeGreaterThanOrEqual(0);expect(d.reviewedSourceCandidates+d.remainingCandidates).toBe(d.totalSourceCandidates);expect(d.boundary).toContain('browser and human review')});
 it('does not call sparse integration evidence production ready',()=>{const r=integrationProductionReadiness(dashboard());expect(r.status).toBe('not_assessed');expect(r.score).toBeNull();expect(r.evidenceCoverage).toBeLessThan(50)});
 it('flags failing connector and exception evidence',()=>{const d=dashboard({connectors:[{id:'c1',code:'PAY',name:'Payroll',category:'payroll',protocol:'rest_json',direction:'inbound',baseUrl:'https://pay.example',authMode:'oauth2_client_credentials',secretRef:'secret-manager/pay',ownerRole:'hr_admin',dataClassification:'restricted',systemOfRecordFor:[],standardProfile:'none',timeoutMs:15000,maxBatchSize:100,idempotencyRequired:true,reconciliationRequired:true,mutationMode:'staging_only',status:'active',health:'failing',consequentialWorkerMutationProhibited:true,createdBy:'u2',createdAt:'x',updatedAt:'x'}],contracts:[{} as any],runs:[{} as any],metrics:{...dashboard().metrics,activeConnectors:1,approvedConnectors:1,approvedContracts:1,activeRuntimeProfiles:1,openDeadLetters:1,readinessScore:40,readinessLevel:'fragile'}});const r=integrationProductionReadiness(d);expect(r.status).toBe('review_required');expect(r.signals.some(x=>x.id==='dead-letters')).toBe(true);expect(r.signals.some(x=>x.id==='health-c1')).toBe(true)});
 it('keeps Safe Execute frozen at the single notification action',()=>{expect(SAFE_EXECUTION_ALLOWLIST).toHaveLength(1);expect(SAFE_EXECUTION_ALLOWLIST[0]?.id).toBe('notifications.mark_visible_read')});
 it('keeps consequential employment commands ahead of safe Execute',()=>{const r=routeOpsiQoCommand(actor('org_admin',['self.read','notifications.read']),'Mark my notifications read and terminate Ahmed');expect(r.mode).toBe('blocked');expect(r.risk).toBe('consequential')});
});
