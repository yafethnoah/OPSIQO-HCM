import { processPeopleAnalyticsGovernance } from '../src/lib/people-analytics/service';
const orgId=process.env.OPSIQO_JOB_ORG_ID||process.env.OPSIQO_DEMO_ORG_ID||'demo-org';
processPeopleAnalyticsGovernance(orgId).then(r=>{console.log(JSON.stringify(r,null,2));}).catch(e=>{console.error(e);process.exit(1);});
