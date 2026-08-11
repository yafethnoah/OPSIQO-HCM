import { processEmployeeRelationsGovernance } from '../src/lib/employee-relations/service';
const orgId=process.env.OPSIQO_JOB_ORG_ID;if(!orgId)throw new Error('OPSIQO_JOB_ORG_ID is required.');processEmployeeRelationsGovernance(orgId).then(r=>{console.log(JSON.stringify(r,null,2));process.exit(0);}).catch(e=>{console.error(e);process.exit(1);});
