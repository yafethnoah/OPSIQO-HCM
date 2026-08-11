import { processDocumentGovernance, processPolicyGovernance } from '../src/lib/compliance/service';
const orgId=process.env.OPSIQO_JOB_ORG_ID||process.env.OPSIQO_DEMO_ORG_ID;
if(!orgId)throw new Error('OPSIQO_JOB_ORG_ID is required.');
Promise.all([processDocumentGovernance(orgId,500),processPolicyGovernance(orgId,500)]).then(([documents,policies])=>{console.log(JSON.stringify({orgId,documents,policies},null,2));}).catch(e=>{console.error(e);process.exit(1);});
