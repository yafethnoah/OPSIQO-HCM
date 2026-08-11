import { processPrivacyGovernance } from '@/lib/privacy/service';
async function main(){const orgId=String(process.env.OPSIQO_JOB_ORG_ID||'').trim();if(!orgId)throw new Error('OPSIQO_JOB_ORG_ID is required.');const result=await processPrivacyGovernance(orgId);console.log(JSON.stringify({orgId,...result},null,2));}
main().catch(e=>{console.error(e);process.exitCode=1;});
