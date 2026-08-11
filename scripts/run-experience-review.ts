import { processExperienceGovernance } from '@/lib/experience/service';
const orgId=process.env.OPSIQO_JOB_ORG_ID||process.env.NEXT_PUBLIC_OPSIQO_ORG_ID||process.env.NEXT_PUBLIC_OPSIQO_DEMO_ORG_ID;
if(!orgId)throw new Error('Set OPSIQO_JOB_ORG_ID.');
processExperienceGovernance(orgId).then(r=>{console.log(JSON.stringify(r,null,2));process.exit(0);}).catch(e=>{console.error(e);process.exit(1);});
