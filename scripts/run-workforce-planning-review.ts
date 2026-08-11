import { processWorkforcePlanningGovernance } from '@/lib/workforce-planning/service';
const orgId=process.env.OPSIQO_JOB_ORG_ID;if(!orgId)throw new Error('Set OPSIQO_JOB_ORG_ID before running workforce:review.');
processWorkforcePlanningGovernance(orgId).then(r=>{console.log(JSON.stringify(r,null,2));}).catch(e=>{console.error(e);process.exitCode=1;});
