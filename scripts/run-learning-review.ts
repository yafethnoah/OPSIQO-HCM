import { processLearningGovernance } from '../src/lib/learning/service';
async function main(){const orgId=process.env.OPSIQO_JOB_ORG_ID||process.env.OPSIQO_DEMO_ORG_ID;if(!orgId)throw new Error('Set OPSIQO_JOB_ORG_ID (or OPSIQO_DEMO_ORG_ID).');console.log(JSON.stringify(await processLearningGovernance(orgId),null,2));}
main().catch(e=>{console.error(e);process.exitCode=1;});
