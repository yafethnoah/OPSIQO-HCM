import { processAiGovernance } from '@/lib/ai-intelligence/service';
const orgId=process.env.OPSIQO_JOB_ORG_ID||process.env.OPSIQO_DEMO_ORG_ID;if(!orgId)throw new Error('Set OPSIQO_JOB_ORG_ID.');processAiGovernance(orgId).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exit(1)});
