import { systemActor } from '@/lib/automation/system-actor';
import { safeCleanup } from '@/lib/admin-maintenance/service';

async function main(){
  const orgId=String(process.env.OPSIQO_JOB_ORG_ID||'').trim();
  if(!orgId)throw new Error('OPSIQO_JOB_ORG_ID is required.');
  const result=await safeCleanup(systemActor(orgId,'system:admin-housekeeping'));
  console.log(JSON.stringify({status:'PASS',orgId,deletedRecords:result.deletedRecords,deletedFiles:result.deletedFiles,protectedEvidencePreserved:result.protectedEvidencePreserved},null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1});
