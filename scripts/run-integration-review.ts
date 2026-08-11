import { processIntegrationGovernance } from '../src/lib/integration/service';
const orgId=String(process.env.OPSIQO_JOB_ORG_ID||'').trim();if(!orgId)throw new Error('Set OPSIQO_JOB_ORG_ID.');processIntegrationGovernance(orgId).then(x=>{console.log(JSON.stringify(x,null,2));process.exit(0)}).catch(e=>{console.error(e);process.exit(1)});
