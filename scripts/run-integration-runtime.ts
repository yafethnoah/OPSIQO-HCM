import { processIntegrationSchedules } from '../src/lib/integration/runtime-service';
const orgId=String(process.env.OPSIQO_JOB_ORG_ID||'').trim();if(!orgId){console.error('OPSIQO_JOB_ORG_ID is required.');process.exit(2)}
processIntegrationSchedules(orgId).then(x=>{console.log(JSON.stringify(x,null,2))}).catch(e=>{console.error(e);process.exit(1)});
