import { processRegulatoryGovernance } from '../src/lib/regulatory/service';
const orgId=process.env.OPSIQO_JOB_ORG_ID||process.argv[2];if(!orgId)throw new Error('Set OPSIQO_JOB_ORG_ID or pass organization ID as the first argument.');
processRegulatoryGovernance(orgId).then(r=>{console.log(JSON.stringify(r,null,2));}).catch(e=>{console.error(e);process.exitCode=1;});
