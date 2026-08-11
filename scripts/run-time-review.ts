import { processLeaveAccruals, processTimeGovernance } from '../src/lib/time/service';
async function main(){const orgId=process.env.OPSIQO_JOB_ORG_ID||process.env.OPSIQO_DEMO_ORG_ID;if(!orgId)throw new Error('Set OPSIQO_JOB_ORG_ID (or OPSIQO_DEMO_ORG_ID).');const [leaveAccruals,timeGovernance]=await Promise.all([processLeaveAccruals(orgId),processTimeGovernance(orgId)]);console.log(JSON.stringify({orgId,leaveAccruals,timeGovernance},null,2));}
main().catch(e=>{console.error(e);process.exitCode=1;});
