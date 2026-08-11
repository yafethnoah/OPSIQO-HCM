import { processSeparationGovernance } from '../src/lib/separation/service';
const orgId=process.env.OPSIQO_JOB_ORG_ID||process.env.OPSIQO_DEMO_ORG_ID;
if(!orgId){console.error('Set OPSIQO_JOB_ORG_ID or OPSIQO_DEMO_ORG_ID.');process.exit(1);}
processSeparationGovernance(orgId).then(r=>{console.log(JSON.stringify(r,null,2));}).catch(e=>{console.error(e);process.exit(1);});
