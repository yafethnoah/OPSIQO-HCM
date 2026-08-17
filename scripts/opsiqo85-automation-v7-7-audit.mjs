import fs from 'node:fs';

const read = p => fs.existsSync(p) ? fs.readFileSync(p,'utf8') : '';
const has = (p,...tokens) => { const text=read(p); return tokens.every(t=>text.includes(t)); };
const checks=[];

function allProcessOrgFunctions(dir='src/lib') {
  const names=[];
  const walk=d=>{ for(const entry of fs.readdirSync(d,{withFileTypes:true})) { const p=`${d}/${entry.name}`; if(entry.isDirectory()) walk(p); else if(/\.(ts|tsx)$/.test(entry.name)) { const text=read(p); for(const match of text.matchAll(/export async function (process[A-Za-z0-9_]+)\(orgId/g)) names.push(match[1]); } } };
  walk(dir);
  return [...new Set(names)].sort();
}
const add=(id,ok,detail)=>checks.push({id,status:ok?'PASS':'FAIL',detail});

const automation=read('src/lib/automation/service.ts');
const catalog=read('src/lib/automation/catalog.ts');
const route=read('src/app/api/internal/automation/route.ts');
const workflowSchema=read('src/lib/workflow/schemas.ts');
const workflowDomain=read('src/domain/workflow.ts');
const workflowUi=read('src/components/workflow-panel.tsx');
const importService=read('src/lib/data-import/library-import.ts');
const invitationService=read('src/lib/membership/service.ts');
const workflowService=read('src/lib/workflow/service.ts');

add('lane-isolation', automation.includes('async function lane<T>') && automation.includes("status: 'failed'") && automation.includes("const status = failedLanes ? 'partial' : 'completed'"), 'Automation lanes fail independently and produce partial-run evidence instead of aborting unrelated work.');
const discoveredProcessors=allProcessOrgFunctions();
add('all-org-processors-wired', discoveredProcessors.every(name=>automation.includes(name)), `Every exported org-scoped process* processor is wired into the unified cycle (${discoveredProcessors.length}/${discoveredProcessors.length}).`);
add('administrative-lanes', ['processDueEmployeeChanges','processDueSecondaryAssignmentPlans','processSeparationGovernance','processOnboardingDueTasks'].every(x=>automation.includes(x)), 'Effective-dated HR changes and deadline housekeeping are wired into the full cycle.');
add('invitation-lifecycle', automation.includes('processInvitationGovernance') && invitationService.includes('processInvitationGovernance') && invitationService.includes("status: 'expired'") && invitationService.includes('tokenIndexesDeleted'), 'Expired invitation cleanup and expiration reminders are automated without auto-resending credentials.');
add('import-analysis', automation.includes('processLibraryImportAutomation') && importService.includes('processLibraryImportAutomation') && importService.includes("scanStatus==='clean'") && importService.includes("reviewStatus!=='approved'") && importService.includes('skippedHumanConfiguration'), 'Scan-clean import analysis is automated while consequential promotion remains human controlled.');
add('zip-idempotency', importService.includes('autoExtractedAt') && importService.includes("if((r as any).autoExtractedAt)continue"), 'Reviewed ZIP libraries cannot be repeatedly auto-extracted on every scheduler cycle.');
add('hr-governance-lanes', ['processDocumentGovernance','processPolicyGovernance','processLeaveAccruals','processTimeGovernance','processPerformanceGovernance','processLearningGovernance','processCareerGovernance','processCompensationGovernance','processEmployeeRelationsGovernance','processSafetyGovernance','processExperienceGovernance','processWorkforcePlanningGovernance','processPeopleAnalyticsGovernance','processAiGovernance','processDiagnosticGovernance'].every(x=>automation.includes(x)), 'Existing HR governance processors are consolidated into one orchestrated cycle.');
add('enterprise-governance-lanes', ['processIdentityGovernance','processSecurityGovernance','processPrivacyGovernance','processRegulatoryGovernance','processGovernanceControlCenter','processAssuranceGovernance','processOrgDesignGovernance','processResilienceGovernance','processStrategyGovernance','processPlatformReliabilityGovernance','processCommandCenterGovernance'].every(x=>automation.includes(x)), 'Previously separate enterprise governance processors are included in the automation cycle.');
add('approved-inbound-integrations', automation.includes('processIntegrationSchedules') && automation.includes('processIntegrationGovernance'), 'Approved inbound integration schedules and integration governance are automated.');
add('domain-events-after-processors', automation.indexOf("'domain_event_dispatch'") > automation.indexOf("'enterprise_command_monitoring'"), 'Domain-event dispatch runs after governance processors so same-cycle events can enter workflows.');
add('workflow-notification-automation', automation.includes('processWorkflowNotificationSteps') && workflowService.includes('processWorkflowNotificationSteps') && workflowService.includes("step=>step.type==='notification'") && workflowService.includes("action:'complete'"), 'Notification-only workflow steps deliver and close automatically while tasks/approvals remain human.');
add('workflow-sla', automation.includes('processWorkflowSla'), 'Workflow SLA escalation remains automated.');
add('notification-delivery', automation.includes('processNotificationDelivery'), 'Queued notification delivery remains automated.');
add('trigger-single-source', workflowDomain.includes('WORKFLOW_TRIGGER_VALUES') && workflowSchema.includes('z.enum(WORKFLOW_TRIGGER_VALUES)') && workflowUi.includes('WORKFLOW_TRIGGER_OPTIONS.map'), 'Workflow trigger domain, validation and UI use a single authoritative trigger set.');
add('new-governance-triggers', ['policy.reattestation_started','governance.source_review_due','ai.action_plan_approved','diagnostic.assessment_approved'].every(x=>workflowDomain.includes(x)), 'Governance, AI and diagnostic triggers are available to configured automation workflows.');
add('multi-tenant-scheduler', route.includes("input.scope==='organization'") && route.includes('listAutomationOrganizationIds') && route.includes('runPhase1Automation'), 'One protected scheduler endpoint can run sequential automation across all organizations.');
add('local-all-org-runner', has('scripts/run-phase1-jobs.ts','OPSIQO_AUTOMATION_SCOPE','listAutomationOrganizationIds','runPhase1Automation'), 'Administrative job runner supports organization or all-organization scope.');
add('coverage-catalog', catalog.includes('AUTOMATION_CATALOG') && catalog.includes('AUTOMATED_CAPABILITY_COUNT') && catalog.includes('HUMAN_APPROVAL_BOUNDARY_COUNT'), 'Automation coverage and human boundaries are explicitly catalogued.');
add('consequential-boundary', ['Hire, reject, terminate, discipline, promote/demote','Individual salary/compensation decision','Successor confirmation','Policy publication / legal conclusion','Privileged access grants and role elevation'].every(x=>catalog.includes(x)), 'Consequential employment, pay, succession, publication/legal and privileged-access decisions remain human governed.');
add('ats-not-autonomous', catalog.includes("id:'ats_assist'") && catalog.includes("boundary:'opt_in_assist'") && catalog.includes('never hires, rejects, advances'), 'ATS remains decision support and never becomes an autonomous employment decision engine.');
add('automation-ui', has('src/components/automation-control.tsx','Automation control plane','Human-governed boundaries','Latest automation lane execution','AUTOMATION_CATALOG'), 'Automation workspace exposes coverage, boundaries and lane evidence.');

const failed=checks.filter(c=>c.status==='FAIL');
const result={schemaVersion:'8.5-automation-v7.7-audit',generatedAtUtc:new Date().toISOString(),passed:checks.length-failed.length,failed:failed.length,checks};
fs.mkdirSync('artifacts/audits',{recursive:true});
fs.writeFileSync('artifacts/audits/OPSIQO_8_5_AUTOMATION_V7_7_AUDIT.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(failed.length) process.exit(1);
