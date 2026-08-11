import { createHash, randomUUID } from 'crypto';
import type { ActorContext } from '../src/domain/security';
import { adminDb } from '../src/lib/firebase/admin';
import { promotePrehireEvidence } from '../src/lib/compliance/service';

const orgId=process.env.OPSIQO_JOB_ORG_ID||process.env.OPSIQO_DEMO_ORG_ID;
if(!orgId)throw new Error('OPSIQO_JOB_ORG_ID is required.');
const db=adminDb(),timestamp=new Date().toISOString(),sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const migrationActor:ActorContext={uid:'system:migration',orgId,role:'org_admin',permissions:[]};

async function migrateLegacyPolicies(){
  const legacy=await db.collection(`organizations/${orgId}/onboardingPolicies`).where('status','==','published').get();let policies=0;
  for(const d of legacy.docs){
    const row=d.data() as any;const marker=db.doc(`organizations/${orgId}/legacyPolicyMigration/${d.id}`);if((await marker.get()).exists)continue;
    const policyId=`migrated-${d.id}`,versionId=randomUUID(),content=String(row.content||'');const batch=db.batch();
    batch.set(db.doc(`organizations/${orgId}/policies/${policyId}`),{id:policyId,code:`LEGACY-${String(d.id).slice(0,12).toUpperCase()}`,title:row.title||'Migrated onboarding policy',ownerUid:'system:migration',currentPublishedVersionId:versionId,latestVersionNumber:1,status:'published',acknowledgementRequired:true,onboardingRequired:Boolean(row.onboardingRequired),audience:'all_employees',createdAt:row.createdAt||timestamp,updatedAt:timestamp},{merge:false});
    batch.set(db.doc(`organizations/${orgId}/policyVersions/${versionId}`),{id:versionId,policyId,versionNumber:1,versionLabel:row.version||'1.0',content,contentSha256:sha(content),status:'published',effectiveDate:row.effectiveDate||timestamp.slice(0,10),createdBy:'system:migration',createdAt:row.createdAt||timestamp,publishedBy:'system:migration',publishedAt:timestamp},{merge:false});
    batch.create(marker,{legacyPolicyId:d.id,policyId,migratedAt:timestamp});await batch.commit();policies++;
  }
  return policies;
}

async function promoteActivatedPrehireEvidence(){
  const cases=await db.collection(`organizations/${orgId}/onboardingCases`).where('status','==','activated').get();let casesScanned=0,documentsPromoted=0,acknowledgementsPromoted=0,skipped=0;
  for(const c of cases.docs){
    casesScanned++;const row=c.data() as any;const workerId=String(row.workerId||'');if(!workerId){skipped++;continue;}
    const result=await promotePrehireEvidence(migrationActor,c.id,workerId);documentsPromoted+=result.documentsPromoted;acknowledgementsPromoted+=result.acknowledgementsPromoted;
  }
  return{casesScanned,documentsPromoted,acknowledgementsPromoted,skipped};
}

async function run(){
  const legacyPoliciesMigrated=await migrateLegacyPolicies();
  const prehireEvidence=await promoteActivatedPrehireEvidence();
  console.log(JSON.stringify({orgId,legacyPoliciesMigrated,prehireEvidence},null,2));
}
run().catch(e=>{console.error(e);process.exit(1);});
