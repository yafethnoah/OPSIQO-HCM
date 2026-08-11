import { runPhase1Automation } from '../src/lib/automation/service';

async function main() {
  const orgId = process.env.OPSIQO_JOB_ORG_ID || process.env.OPSIQO_DEMO_ORG_ID;
  if (!orgId) throw new Error('Set OPSIQO_JOB_ORG_ID (or OPSIQO_DEMO_ORG_ID) before running automation jobs.');
  const summary = await runPhase1Automation(orgId);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
