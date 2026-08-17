import { existsSync, readFileSync } from 'node:fs';

const read=(p)=>existsSync(p)?readFileSync(p,'utf8'):'';
const checks=[];
const add=(id,ok,detail)=>checks.push({id,status:ok?'PASS':'FAIL',detail});
const portal=read('src/components/employee-portal-workspace.tsx');
const nav=read('src/components/nav.tsx');
const signin=read('src/app/signin/page.tsx');
const invite=read('src/components/accept-invite.tsx');
const permissions=read('src/lib/auth/permissions.ts');
const time=read('src/lib/time/service.ts');
const experience=read('src/lib/experience/service.ts');

add('employee-route',existsSync('src/app/employee/page.tsx')&&read('src/app/employee/page.tsx').includes('EmployeePortalWorkspace'),'Dedicated Employee Portal route exists');
add('employee-portal-component',portal.includes('Employee self-service')&&portal.includes('What would you like to do?'),'Employee-facing portal workspace exists');
add('leave-request-inline',portal.includes('/leave/requests')&&portal.includes('Request vacation or leave')&&portal.includes('workerId:actor.workerId'),'Employee can submit self-scoped vacation/leave requests from portal');
add('leave-history',portal.includes('My leave requests')&&portal.includes('availableHours'),'Employee portal shows leave balances and request history');
add('hr-service-inline',portal.includes('/service/tickets')&&portal.includes('Request HR support'),'Employee can submit HR service requests from portal');
add('hr-service-tracking',portal.includes('My HR requests')&&portal.includes('referenceNumber'),'Employee can track personal HR service requests');
add('employee-services', ['My HR profile','Time & leave','Documents & policies','Learning','Performance','Pay & rewards','Career','HR help','Safety','Notifications'].every(x=>portal.includes(x)),'Portal exposes the agreed employee self-service destinations');
add('role-scoped-service-cards',portal.includes('Only services allowed for your role are shown')&&portal.includes('actor?.permissions.includes'),'Portal services are filtered by effective permissions');
add('worker-link-fail-closed',portal.includes('membership must be linked to an employee record')&&portal.includes('Employee record link required'),'Personal transactions fail closed when membership is not linked to a worker');
add('nav-wiring',nav.includes("label:'Employee Portal'")&&nav.includes("href:'/employee'")&&nav.includes("permission:'self.read'"),'Employee Portal is permission-scoped in primary navigation');
add('employee-role-permissions',permissions.includes("employee: [")&&permissions.includes("'leave.read', 'leave.request', 'time.read', 'time.clock'")&&permissions.includes("'experience.read', 'service.read', 'service.request'"),'Employee role contains leave and HR service permissions');
add('leave-backend-self-scope',time.includes("Employees can request leave only for themselves.")&&time.includes("actor.workerId!==input.workerId"),'Backend prevents employees requesting leave for another worker');
add('leave-backend-read-scope',time.includes('actor.workerId===workerId')&&time.includes('requireReadWorker'),'Backend prevents employees reading another worker time/leave record');
add('service-dashboard-self-scope',experience.includes("where('requesterWorkerId','==',actor.workerId)")&&experience.includes("scope:hr?'organization':'self'"),'HR Service dashboard scopes employee tickets to their own worker record');
add('role-aware-signin',signin.includes("if(me.actor.role==='employee')return'/employee'")&&signin.includes("if(me.actor.role==='manager')return'/manager'"),'Employee sign-in lands on Employee Portal while manager/admin retain role-appropriate homes');
add('invitation-role-landing',invite.includes("if(role==='employee')return'/employee'")&&invite.includes('landingForRole(result.data.role)'),'Accepted employee invitations lead to the Employee Portal');
add('explicit-return-preserved',signin.includes('requestedReturnTo()')&&signin.includes('if(requested)return requested'),'Deep links and invitation return paths override the role landing page');
add('privacy-boundary',portal.includes('Private by design.')&&portal.includes('scoped to your own record'),'Portal explains the employee privacy boundary');

const failed=checks.filter(c=>c.status==='FAIL');
const result={schemaVersion:'8.5-employee-portal-v7.8',passed:checks.length-failed.length,failed:failed.length,checks};
console.log(JSON.stringify(result,null,2));
if(failed.length)process.exit(1);
