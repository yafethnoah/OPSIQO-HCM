import { processCommandCenterGovernance } from '../src/lib/enterprise-command/service';
const orgId=String(process.env.OPSIQO_JOB_ORG_ID||'').trim();if(!orgId)throw new Error('Set OPSIQO_JOB_ORG_ID.');
processCommandCenterGovernance(orgId).then(x=>{console.log(JSON.stringify(x,null,2));process.exit(0)}).catch(e=>{console.error(e);process.exit(1)});
