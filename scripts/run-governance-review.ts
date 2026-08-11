import { processGovernanceControlCenter } from '../src/lib/governance/service';
const orgId=String(process.env.OPSIQO_JOB_ORG_ID||process.env.OPSIQO_DEMO_ORG_ID||'').trim();
if(!orgId){console.error('Set OPSIQO_JOB_ORG_ID (or OPSIQO_DEMO_ORG_ID) before running governance:review.');process.exit(2);}
processGovernanceControlCenter(orgId).then(summary=>{console.log(JSON.stringify(summary,null,2));}).catch(error=>{console.error(error);process.exit(1);});
