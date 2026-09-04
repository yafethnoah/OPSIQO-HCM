import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBoundedProcess } from './opsiqo85-v7-32-bounded-process.mjs';

const base=(process.env.OPSIQO_A11Y_BASE_URL||'http://127.0.0.1:31718').replace(/\/$/,'');
const boundedInt=(raw,fallback,min,max)=>{const n=Number(raw);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback};
const routeWorkerTimeoutMs=boundedInt(process.env.OPSIQO_A11Y_WORKER_TIMEOUT_MS,12000,6000,60000);
const httpProbeTimeoutMs=boundedInt(process.env.OPSIQO_A11Y_HTTP_PROBE_TIMEOUT_MS,3000,1000,15000);
const routes=['/home','/ai-copilot','/people-analytics','/scenario-lab','/ai-value','/mfa/setup','/my-work','/people','/settings','/notifications','/time','/learning','/recruiting','/performance','/compensation','/compliance','/compliance-radar','/policy-intelligence','/experience','/employee-service-center','/workflows','/program-portfolio','/meeting-actions','/ai-governance','/onboarding','/workforce-planning','/integrations','/security-operations','/privacy','/assurance','/platform-reliability','/safety','/career','/hr-diagnostic','/regulatory','/resilience','/identity','/governance','/dashboard','/employee','/employee-relations','/separations','/people/worker-001','/import-center','/intelligence','/agent-builder','/org-design','/organization','/program-workforce','/strategy','/skills-passport','/manager-copilot','/career-gps','/talent-marketplace','/automation-marketplace','/automation','/contract-import','/manager','/lifecycle','/organization-launchpad','/concierge','/organizational-memory','/grant-workforce','/workforce-registry','/daily-brief','/experience-readiness','/operations-cockpit','/operations-orchestrator','/evidence-center'];
const operationalArabicMarkers={'/ai-copilot':'ذكاء تحويل الأدلة إلى إجراءات','/people-analytics':'استوديو تحليلات الأفراد','/scenario-lab':'OPSIQO Pulse · مختبر السيناريوهات','/ai-value':'OPSIQO Guard + Pulse · قيمة الذكاء الاصطناعي','/mfa/setup':'المصادقة متعددة العوامل','/time':'وقت الموظفين والإجازات','/learning':'ذكاء المهارات','/recruiting':'إنشاء طلب توظيف','/performance':'المرحلة 3 · أداء المواهب','/compensation':'المرحلة 3 · ذكاء التعويضات','/compliance':'خزنة مستندات الموظفين','/compliance-radar':'رادار الامتثال','/policy-intelligence':'ذكاء السياسات','/experience':'تجربة الموظف','/employee-service-center':'مركز خدمات الموظفين','/workflows':'مصمم الأتمتة 2.0','/onboarding':'بدء ما قبل الانضمام من عرض مقبول','/workforce-planning':'المرحلة 4 · ذكاء القوى العاملة','/integrations':'حدود حوكمة التكاملات','/security-operations':'مركز قيادة أمن HCM','/privacy':'حدود القرار المحكوم','/assurance':'حدود الضمان التشغيلي','/platform-reliability':'موثوقية المنصة وأدلة الإنتاج','/safety':'أولويات ضوابط السلامة','/career':'المرحلة 3 · ذكاء المسار المهني والخلافة','/hr-diagnostic':'نموذج تشغيل التشخيص','/regulatory':'حدود القرار','/resilience':'حدود المرونة المحكومة','/identity':'مركز هوية المؤسسة وتسجيل الدخول الموحد والتزويد','/governance':'حدود تشغيل الحوكمة','/dashboard':'حدود حوكمة المؤسسة','/employee':'الخدمة الذاتية للموظف','/employee-relations':'استقبال سري','/separations':'إنشاء طلب إنهاء خدمة','/people/worker-001':'سجل الموظف','/import-center':'مركز الاستيراد الشامل للبيانات والمستندات','/intelligence':'OPSIQO ONE · الذكاء','/ai-governance':'OPSIQO Guard · مركز حوكمة الذكاء الاصطناعي','/agent-builder':'OPSIQO Cortex · منشئ الوكلاء','/org-design':'حدود تصميم المؤسسة الخاضعة للحوكمة','/organization':'الوحدات التنظيمية','/program-workforce':'OPSIQO ONE · ذكاء القوى العاملة للبرامج','/strategy':'حدود الاستراتيجية الخاضعة للحوكمة','/skills-passport':'OPSIQO Cortex · جواز المهارات','/manager-copilot':'OPSIQO Cortex · مساعد المدير','/career-gps':'OPSIQO Cortex · نظام توجيه المسار المهني','/talent-marketplace':'OPSIQO ONE · سوق المواهب الداخلي','/automation-marketplace':'OPSIQO Flow · سوق الأتمتة','/automation':'مستوى التحكم بالأتمتة','/contract-import':'استيراد العقد','/manager':'مركز قيادة فريقي','/lifecycle':'مسار دورة الحياة','/organization-launchpad':'OPSIQO ONE · منصة إطلاق المؤسسة','/concierge':'OPSIQO Cortex · مساعد الموظف','/organizational-memory':'OPSIQO Cortex · الذاكرة المؤسسية','/grant-workforce':'OPSIQO ONE · القوى العاملة الممولة','/workforce-registry':'OPSIQO ONE · القوى العاملة الموحدة','/daily-brief':'ذكاء استباقي','/experience-readiness':'OPSIQO ONE · جاهزية التجربة','/operations-cockpit':'الحقيقة التشغيلية عبر المجالات','/operations-orchestrator':'حدود التنسيق الخاضعة للحوكمة البشرية','/evidence-center':'أدلة تحتاج إلى مراجعة'};
const workerPath=path.join(path.dirname(fileURLToPath(import.meta.url)),'opsiqo85-v7-32-authenticated-accessibility-worker.mjs');
const artifactDir=path.resolve('artifacts');
const finalArtifact=path.join(artifactDir,'v7-32-authenticated-accessibility.json');
const checkpointArtifact=path.join(artifactDir,'v7-32-authenticated-accessibility.partial.json');
fs.mkdirSync(artifactDir,{recursive:true});

const report={version:'7.32',target:'Authenticated WCAG 2.2 AA browser-backed UAT smoke',baseUrl:base,routes:[],generatedAt:new Date().toISOString(),workerIsolation:true,workerTimeoutMs:routeWorkerTimeoutMs,boundary:'Each route runs in an isolated browser worker with an OS-level watchdog. This emulator-seeded browser pass validates representative authenticated OPSIQO ONE routes at 320px, accessible-name basics, keyboard entry, global mobile navigation and Arabic RTL behavior. It is not a full WCAG conformance claim and does not replace manual screen-reader, contrast, zoom/reflow, error-recovery or complete workflow testing.'};
let failed=0;

function writeCheckpoint(complete=false){
  const target=complete?finalArtifact:checkpointArtifact;
  fs.writeFileSync(target,JSON.stringify({...report,complete,completedAt:complete?new Date().toISOString():null,failedChecks:failed,routesCompleted:report.routes.length,routesTotal:routes.length},null,2));
}

async function probeRoute(route){
  try{
    const response=await fetch(base+route,{redirect:'manual',signal:AbortSignal.timeout(httpProbeTimeoutMs),headers:{'cache-control':'no-cache'}});
    return {status:response.status,error:null};
  }catch(error){
    return {status:0,error:error instanceof Error?error.message:String(error)};
  }
}

async function runWorker(route,routeIndex,httpStatus){
  const resultPath=path.join(artifactDir,`v7-32-route-${String(routeIndex).padStart(2,'0')}.json`);
  try{fs.rmSync(resultPath,{force:true})}catch{}
  const heartbeat=setInterval(()=>console.log(`WAIT ROUTE ${routeIndex}/${routes.length} ${route} — isolated worker still active`),3000);
  try{
    const outcome=await runBoundedProcess({
      command:process.execPath,
      args:[workerPath],
      env:{...process.env,OPSIQO_A11Y_ROUTE:route,OPSIQO_A11Y_ROUTE_INDEX:String(routeIndex),OPSIQO_A11Y_ROUTE_TOTAL:String(routes.length),OPSIQO_A11Y_ROUTE_RESULT:resultPath,OPSIQO_A11Y_ROUTE_MARKER:operationalArabicMarkers[route]||'',OPSIQO_A11Y_HTTP_STATUS:String(httpStatus||0)},
      timeoutMs:routeWorkerTimeoutMs,
    });
    return {...outcome,resultPath};
  }finally{clearInterval(heartbeat)}
}

for(let i=0;i<routes.length;i++){
  const route=routes[i],routeIndex=i+1,started=Date.now();
  console.log(`ROUTE ${routeIndex}/${routes.length} ${route}`);
  const probe=await probeRoute(route);
  const worker=await runWorker(route,routeIndex,probe.status);
  let routeResult=null;
  if(fs.existsSync(worker.resultPath)){
    try{routeResult=JSON.parse(fs.readFileSync(worker.resultPath,'utf8'))}catch(error){worker.parseError=error instanceof Error?error.message:String(error)}
  }
  if(!routeResult){
    const detail=worker.timedOut
      ? `Isolated route worker exceeded ${routeWorkerTimeoutMs}ms and its process tree was terminated.`
      : `Isolated route worker ended without valid evidence${worker.error?`: ${worker.error}`:''}${worker.parseError?`: ${worker.parseError}`:''}.`;
    routeResult={route,viewport:'320x800',durationMs:Date.now()-started,checks:[{id:'route-runtime',status:'fail',detail},{id:'http-status',status:probe.status>=200&&probe.status<400?'pass':'fail',detail:probe.error?`HTTP probe failed: ${probe.error}`:`HTTP status=${probe.status}`}]};
  }
  routeResult.durationMs=Date.now()-started;
  if(worker.stderr&&!routeResult.workerStderr)routeResult.workerStderr=worker.stderr;
  if(worker.stdout&&!routeResult.workerStdout)routeResult.workerStdout=worker.stdout;
  const routeFails=(routeResult.checks||[]).filter(c=>c.status==='fail').length;
  failed+=routeFails;
  report.routes.push(routeResult);
  writeCheckpoint(false);
  if(worker.timedOut)console.error(`TIMEOUT ROUTE ${routeIndex}/${routes.length} ${route} — killed isolated worker after ${routeWorkerTimeoutMs}ms; continuing.`);
  console.log(`${routeFails?'FAIL':'PASS'} ROUTE ${routeIndex}/${routes.length} ${route} — ${routeResult.durationMs}ms; ${routeFails} failed check(s)`);
}

writeCheckpoint(true);
try{fs.rmSync(checkpointArtifact,{force:true})}catch{}
for(const r of report.routes)for(const c of r.checks||[])console.log(`${c.status==='pass'?'PASS':'FAIL'} ${r.route} ${c.id} — ${c.detail}`);
console.log(`\nV7.32 authenticated accessibility smoke: ${failed?'FAIL':'PASS'} (${failed} failed check(s); ${report.routes.length}/${routes.length} routes completed).`);
console.log('Evidence: artifacts/v7-32-authenticated-accessibility.json');
if(failed)process.exit(1);
