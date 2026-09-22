import { listAutomationOrganizationIds } from '../src/lib/automation/service';
import { processAttendanceServerReminders } from '../src/lib/time/attendance-reminder-server';

async function main(){
  const target=String(process.env.OPSIQO_JOB_ORG_ID||'').trim();
  const orgIds=target?[target]:await listAutomationOrganizationIds();
  const rows=[] as Array<Record<string,unknown>>;
  for(const orgId of orgIds){
    try{rows.push({orgId,...await processAttendanceServerReminders(orgId)});}
    catch(error){rows.push({orgId,failed:1,error:error instanceof Error?error.message:'attendance reminder failure'});}
  }
  console.log(JSON.stringify({organizations:rows.length,rows},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
