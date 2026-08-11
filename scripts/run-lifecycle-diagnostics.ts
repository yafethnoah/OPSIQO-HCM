import { persistLifecycleDiagnosticRun } from '@/lib/lifecycle/service';import { systemActor } from '@/lib/automation/system-actor';
async function main(){const orgId=process.env.OPSIQO_JOB_ORG_ID;if(!orgId)throw new Error('OPSIQO_JOB_ORG_ID is required.');const result=await persistLifecycleDiagnosticRun(systemActor(orgId,'system:lifecycle-diagnostics'));console.log(JSON.stringify(result,null,2));if(result.counts.critical>0)process.exitCode=2;}
main().catch(e=>{console.error(e);process.exit(1);});
