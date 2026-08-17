import { listAutomationOrganizationIds, runPhase1Automation } from '../src/lib/automation/service';

async function main() {
  const scope = (process.env.OPSIQO_AUTOMATION_SCOPE || 'organization').toLowerCase();
  if (scope === 'all') {
    const orgIds = await listAutomationOrganizationIds();
    const results = [] as Array<Record<string, unknown>>;
    for (const orgId of orgIds) {
      try {
        const summary = await runPhase1Automation(orgId, 'system:cli-scheduler:all-organizations');
        results.push({ orgId, runId: summary.runId, failedLanes: summary.coverage.failedLanes, status: summary.coverage.failedLanes ? 'partial' : 'completed' });
      } catch (error) {
        results.push({ orgId, status: 'failed', error: error instanceof Error ? error.message : 'Automation failed' });
      }
    }
    console.log(JSON.stringify({ scope: 'all', organizations: results.length, results }, null, 2));
    return;
  }

  const orgId = process.env.OPSIQO_JOB_ORG_ID || process.env.OPSIQO_DEMO_ORG_ID;
  if (!orgId) throw new Error('Set OPSIQO_JOB_ORG_ID (or OPSIQO_DEMO_ORG_ID), or set OPSIQO_AUTOMATION_SCOPE=all.');
  const summary = await runPhase1Automation(orgId, 'system:cli-scheduler');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
