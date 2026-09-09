import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('H51.1 agent system of record',()=>{
  it('defines canonical ownership, stewardship, autonomy and immutable version evidence',()=>{
    const domain=read('src/domain/opsiqo-one-v7-13.ts');
    for(const marker of ['ownerUid','stewardUid','autonomyLevel','currentVersion','currentVersionId','CustomAgentVersion','CustomAgentSimulationRecord','CustomAgentExecutionRecord'])expect(domain).toContain(marker);
    expect(domain).toContain("executionAuthority:'none'");
    expect(domain).toContain('requiresHumanApprovalForConsequentialActions:true');
  });

  it('creates immutable configuration versions and never overwrites version documents',()=>{
    const source=read('src/lib/opsiqo-one/agent-builder.ts');
    expect(source).toContain("/versions/${version.id}`),version");
    expect(source).toContain("action:z.literal('revise')");
    expect(source).toContain("agent_registered','versioning'");
    expect(source).toContain('batch.create');
    expect(source).not.toContain("collection('versions').doc");
  });

  it('requires a current passing dry-run before review and activation',()=>{
    const source=read('src/lib/opsiqo-one/agent-builder.ts');
    expect(source).toContain("action:z.literal('simulate')");
    expect(source).toContain('custom_agent_simulation_required');
    expect(source).toContain('latestSimulationVersion!==before.currentVersion');
    expect(source).toContain('authoritativeWritesPerformed:false');
    expect(source).toContain('authoritativeHrWritesPerformed:false');
  });

  it('uses fixed tool/action allowlists and keeps consequential decisions human controlled',()=>{
    const source=read('src/lib/opsiqo-one/agent-builder.ts');
    expect(source).toContain("const toolIds=['organizational_memory.search'");
    expect(source).toContain("const actionTypes=['observe','recommend','prepare_document'");
    expect(source).toContain('assertCustomAgentRuntimeBoundary');
    expect(source).toContain('custom_agent_tool_not_allowed');
    expect(source).toContain('custom_agent_action_not_allowed');
    expect(source).toContain('custom_agent_human_approval_required');
    expect(source).toContain("hardMaxActionLevel:'prepare'");
  });

  it('records tenant-scoped history and exposes it through the governed API',()=>{
    const service=read('src/lib/opsiqo-one/agent-builder.ts');
    const route=read('src/app/api/organizations/[orgId]/opsiqo-one/agent-builder/[agentId]/history/route.ts');
    expect(service).toContain("ref.collection('simulations')");
    expect(service).toContain("ref.collection('executions')");
    expect(service).toContain('getCustomAgentHistory');
    expect(route).toContain('actorFromRequest');
    expect(route).toContain('getCustomAgentHistory');
  });

  it('integrates the system of record into Agent Builder and therefore AI Governance',()=>{
    const ui=read('src/components/agent-builder-workspace.tsx');
    const governance=read('src/components/ai-governance-center.tsx');
    const governanceService=read('src/lib/opsiqo-one/agent-governance.ts');
    expect(ui).toContain('H51 Agent System of Record');
    expect(ui).toContain('Register agent · immutable v1');
    expect(ui).toContain('Dry-run simulation');
    expect(ui).toContain('Evidence history');
    expect(ui).toContain('Create new immutable version');
    expect(ui).toContain('no Execute option exists');
    expect(governance).toContain('href="/agent-builder"');
    expect(governance).toContain('Agent Builder');
    expect(governanceService).toContain("import { activeCustomCortexAgents } from './agent-builder';");
    expect(governanceService).toContain('...await activeCustomCortexAgents(actor)');
  });

  it('keeps agent records server-only and advances certified release lineage',()=>{
    const rules=read('firestore.rules');
    const identity=read('src/lib/release/identity.ts');
    expect(rules).toContain('H51.1 Agent System of Record');
    expect(rules).toContain('match /aiAgentDefinitions/{agentId}');
    expect(rules).toContain('match /versions/{versionId} { allow read, write: if false; }');
    expect(rules).toContain('match /simulations/{simulationId} { allow read, write: if false; }');
    expect(rules).toContain('match /executions/{executionId} { allow read, write: if false; }');
    const activePatch = identity.match(/OPSIQO_PATCH_RELEASE\s*=\s*process\.env\.OPSIQO_PATCH_RELEASE\s*\|\|\s*'([^']+)'/)?.[1] || null;
    const activeH511 = activePatch === 'H51.1';
    const certifiedSuccessorWithH511Lineage =
      Boolean(activePatch && /^H51\.(?:[2-9]|[1-9]\d+)$/.test(activePatch)) &&
      identity.includes("'H51.1'");
    expect(activeH511 || certifiedSuccessorWithH511Lineage).toBe(true);
    for(const marker of ["'H50.6I'","'H50.6J'","'H50.6K'","'H50.6L'","'H51.1'"])expect(identity).toContain(marker);
  });
});
