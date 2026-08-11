import { processPerformanceGovernance } from '../src/lib/performance/service';
async function main(){const orgId=process.env.OPSIQO_JOB_ORG_ID||process.env.OPSIQO_DEMO_ORG_ID;if(!orgId)throw new Error('Set OPSIQO_JOB_ORG_ID (or OPSIQO_DEMO_ORG_ID).');const summary=await processPerformanceGovernance(orgId);console.log(JSON.stringify(summary,null,2));}
main().catch(e=>{console.error(e);process.exit(1);});
