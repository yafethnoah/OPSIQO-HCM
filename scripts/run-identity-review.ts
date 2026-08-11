import { processIdentityGovernance } from '../src/lib/identity/service';
const orgId=process.env.OPSIQO_JOB_ORG_ID;if(!orgId)throw new Error('OPSIQO_JOB_ORG_ID is required.');processIdentityGovernance(orgId).then(r=>{console.log(JSON.stringify(r,null,2))}).catch(e=>{console.error(e);process.exitCode=1});
