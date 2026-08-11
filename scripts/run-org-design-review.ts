import { processOrgDesignGovernance } from '@/lib/org-design/service';
const orgId=process.env.OPSIQO_JOB_ORG_ID;if(!orgId)throw new Error('OPSIQO_JOB_ORG_ID is required.');processOrgDesignGovernance(orgId).then(x=>{console.log(JSON.stringify(x,null,2));process.exit(0)}).catch(e=>{console.error(e);process.exit(1)});
