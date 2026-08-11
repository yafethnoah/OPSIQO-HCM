import { bootstrapAnalyticsMetrics, generateAnalyticsSnapshot } from '../src/lib/people-analytics/service';
import { systemActor } from '../src/lib/automation/system-actor';
const orgId=process.env.OPSIQO_JOB_ORG_ID||process.env.OPSIQO_DEMO_ORG_ID||'demo-org';
async function main(){const actor=systemActor(orgId,'system:analytics-bootstrap');const metrics=await bootstrapAnalyticsMetrics(actor);const snapshot=await generateAnalyticsSnapshot(orgId,actor.uid);console.log(JSON.stringify({metrics,snapshotId:snapshot.id,snapshotDate:snapshot.snapshotDate},null,2));}
main().catch(e=>{console.error(e);process.exit(1);});
