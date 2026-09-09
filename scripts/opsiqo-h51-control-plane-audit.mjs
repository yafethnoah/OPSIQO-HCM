import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const checks=[
 ['H51.2 AI Control Tower','src/components/ai-control-tower-workspace.tsx',['AI Control Tower','AI inventory & governance','Value & cost']],
 ['H51.3 Organizational Work Graph','src/lib/intelligence-control-plane/work-graph.ts',['provenance','validFrom','verificationStatus','readPermissions']],
 ['H51.4 Governed Context Engine','src/lib/intelligence-control-plane/context-engine.ts',['purpose','maxCharacters','deniedEvidence','retrieveAiEvidence']],
 ['H51.5 Universal Next Best Action','src/lib/intelligence-control-plane/next-best-action.ts',['evidenceRefs','responsibleRole','autonomyLevel','approvalRequired']],
 ['H51.6 Autonomy Policy Engine','src/lib/intelligence-control-plane/autonomy-policy.ts',['humanDecisionRequired','Consequential employment','preauthorized']],
 ['H51.7 Durable Saga','src/lib/orchestrator/durable-saga.ts',['correlationId','retryCount','nextAttemptAt','reconciliation_required','GovernedOrchestrator']],
 ['H51.8 Zero-Entry HR','src/lib/intelligence-control-plane/zero-entry.ts',['requires_attestation','conflicting','canAdvanceZeroEntry']],
 ['H51.9 Parsing Assurance','src/lib/intelligence-control-plane/parsing-assurance.ts',['REQUIRED_FIELD_MISSING','HIGH_RISK_FIELD_REQUIRES_CROSS_VERIFICATION','confidenceDelta']],
 ['H51.9 Tenant-safe Learning','src/lib/intelligence-control-plane/learning-memory.ts',['independent_approval_required','unsafe_learning_prohibited','column_mapping']],
 ['H51.10 Role Today','src/lib/intelligence-control-plane/today-engine.ts',['manager','employee','recruiter','it_identity']],
 ['H51.11 Proactive Compliance','src/lib/intelligence-control-plane/proactive-compliance.ts',['human/legal review required','evidenceRefs']],
 ['H51.12 Analytics-to-Action','src/lib/intelligence-control-plane/analytics-to-action.ts',['adverse_individual_automation_prohibited','evidence_required']],
 ['H51.13 Workforce Digital Twin','src/lib/intelligence-control-plane/digital-twin.ts',['namedWorkerDecisionsProhibited','modelVersion','assumptions']],
 ['H51.14 Integration Intelligence','src/lib/intelligence-control-plane/integration-intelligence.ts',['integrationDashboard','credentialsExposed:false','openDeadLetters']],
 ['H51.15 Marketplace','src/lib/intelligence-control-plane/automation-packs.ts',['H51 Manager Excellence Pack','H51 Recruiting Operations Pack','H51 Offboarding Control Pack']],
 ['H51.16 AI TEVV','src/lib/intelligence-control-plane/tevv.ts',['cross_tenant_leak','protected_trait_scoring','ai_tevv_gate_failed']],
 ['H51.17 Agentic Security','src/lib/intelligence-control-plane/agentic-security.ts',['UNTRUSTED_INSTRUCTION_PATTERN','TOOL_NOT_ALLOWLISTED','PRIVATE_OR_LOCAL_DESTINATION_BLOCKED']],
 ['H51.18 Guided UX','src/components/intelligence-primitives.tsx',['Human review required','Review evidence','Confidence']],
 ['Automatic event detection','src/lib/events/service.ts',['recordNextBestActionsForEvent','system:workflow-dispatcher']],
 ['Universal Next Action','src/components/contextual-ai-assist.tsx',['data-h51-next-action','Review evidence in AI Control Tower']],
 ['Role Today integrated','src/components/daily-brief-workspace.tsx',['RoleTodayPanel']],
 ['Parsing UI integrated','src/components/import-center-workspace.tsx',['ParsingAssurancePanel','previousAnalysis']],
 ['Server-only control plane','firestore.rules',['workGraphRelationships','nextBestActions','orchestrationSagas','agentSecurityEvents']],
 ['Release identity','src/lib/release/identity.ts',['H51.18','H50.6L','H51.1']],
];
let failed=0;for(const [name,file,needles] of checks){const p=path.join(root,file);if(!fs.existsSync(p)){console.error(`FAIL ${name}: missing ${file}`);failed++;continue;}const s=fs.readFileSync(p,'utf8'),missing=needles.filter(n=>!s.includes(n));if(missing.length){console.error(`FAIL ${name}: ${missing.join(', ')}`);failed++;}else console.log(`PASS ${name}`);}if(failed){console.error(`H51 CONTROL PLANE AUDIT: FAIL (${failed})`);process.exit(1)}console.log(`H51 CONTROL PLANE AUDIT: PASS (${checks.length}/${checks.length})`);
