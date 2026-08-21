import type { ActorContext } from '@/domain/security';
import type { KnowledgeGraphEdge, KnowledgeGraphNode, KnowledgeGraphSnapshot } from '@/domain/opsiqo-one';
import { adminDb } from '@/lib/firebase/admin';

const now=()=>new Date().toISOString();
const today=()=>new Date().toISOString().slice(0,10);
const MAX_NODES=250;
const MAX_EDGES=500;

function unique<T>(values:T[]):T[]{return [...new Set(values)]}
function nodeId(kind:KnowledgeGraphNode['kind'],id:string){return `${kind}:${id}`}
function edgeId(kind:KnowledgeGraphEdge['kind'],from:string,to:string){return `${kind}:${from}:${to}`}

async function scopedAssignments(actor:ActorContext){
  const db=adminDb();
  const organizationScope=['super_admin','org_admin','hr_admin','hr_partner'].includes(actor.role)&&actor.permissions.includes('people.read.directory')&&actor.permissions.includes('positions.read');
  if(organizationScope){
    const snap=await db.collection(`organizations/${actor.orgId}/assignments`).limit(500).get();
    return{scope:'organization' as const,assignments:snap.docs.map(d=>d.data() as any),truncated:snap.size>=500};
  }
  if(actor.role==='manager'&&actor.workerId&&actor.permissions.includes('team.read')){
    const [team,self]=await Promise.all([
      db.collection(`organizations/${actor.orgId}/assignments`).where('managerWorkerId','==',actor.workerId).limit(250).get(),
      db.collection(`organizations/${actor.orgId}/assignments`).where('workerId','==',actor.workerId).limit(20).get(),
    ]);
    const byId=new Map<string,any>();for(const d of [...team.docs,...self.docs])byId.set(d.id,d.data());
    return{scope:'team' as const,assignments:[...byId.values()],truncated:team.size>=250};
  }
  if(actor.workerId){
    const snap=await db.collection(`organizations/${actor.orgId}/assignments`).where('workerId','==',actor.workerId).limit(20).get();
    return{scope:'self' as const,assignments:snap.docs.map(d=>d.data() as any),truncated:false};
  }
  return{scope:'self' as const,assignments:[] as any[],truncated:false};
}

async function docsByIds(orgId:string,collection:string,ids:string[]){
  const db=adminDb(),rows:any[]=[],bounded=unique(ids).slice(0,MAX_NODES);
  for(let i=0;i<bounded.length;i+=100){
    const refs=bounded.slice(i,i+100).map(id=>db.doc(`organizations/${orgId}/${collection}/${id}`));
    if(!refs.length)continue;
    const snaps=await db.getAll(...refs);for(const snap of snaps)if(snap.exists)rows.push(snap.data());
  }
  return rows;
}

export async function buildKnowledgeGraphSnapshot(actor:ActorContext):Promise<KnowledgeGraphSnapshot>{
  const scoped=await scopedAssignments(actor),assignments=scoped.assignments.filter(a=>!a.startDate||(String(a.startDate)<=today()&&(!a.endDate||String(a.endDate)>=today())));
  const workerIds=unique(assignments.map(a=>String(a.workerId||'')).filter(Boolean).concat(actor.workerId?[actor.workerId]:[]));
  const positionIds=unique(assignments.map(a=>String(a.positionId||'')).filter(Boolean));
  const unitIds=unique(assignments.map(a=>String(a.orgUnitId||'')).filter(Boolean));
  const managerIds=unique(assignments.map(a=>String(a.managerWorkerId||'')).filter(Boolean));
  const [workers,managers,positions,units]=await Promise.all([
    docsByIds(actor.orgId,'workers',workerIds),docsByIds(actor.orgId,'workers',managerIds),docsByIds(actor.orgId,'positions',positionIds),docsByIds(actor.orgId,'orgUnits',unitIds),
  ]);
  const nodes:KnowledgeGraphNode[]=[],edges:KnowledgeGraphEdge[]=[];const seenNodes=new Set<string>(),seenEdges=new Set<string>();
  const addNode=(node:KnowledgeGraphNode)=>{if(nodes.length>=MAX_NODES||seenNodes.has(node.id))return;seenNodes.add(node.id);nodes.push(node)};
  const addEdge=(edge:KnowledgeGraphEdge)=>{if(edges.length>=MAX_EDGES||seenEdges.has(edge.id))return;seenEdges.add(edge.id);edges.push(edge)};
  for(const w of [...workers,...managers]){if(!w?.id)continue;addNode({id:nodeId('worker',String(w.id)),kind:'worker',label:String(w.displayName||w.employeeNumber||'Worker'),status:w.status?String(w.status):undefined})}
  for(const p of positions){if(!p?.id)continue;addNode({id:nodeId('position',String(p.id)),kind:'position',label:String(p.title||p.positionCode||'Position'),status:p.status?String(p.status):undefined})}
  for(const u of units){if(!u?.id)continue;addNode({id:nodeId('org_unit',String(u.id)),kind:'org_unit',label:String(u.name||u.code||'Organization unit'),status:u.status?String(u.status):undefined})}
  for(const a of assignments){
    const worker=String(a.workerId||''),position=String(a.positionId||''),unit=String(a.orgUnitId||''),manager=String(a.managerWorkerId||'');
    if(worker&&position)addEdge({id:edgeId('worker_position',worker,position),kind:'worker_position',from:nodeId('worker',worker),to:nodeId('position',position),label:a.primary===false?'secondary assignment':'assignment'});
    if(worker&&manager)addEdge({id:edgeId('worker_manager',worker,manager),kind:'worker_manager',from:nodeId('worker',worker),to:nodeId('worker',manager),label:'reports to'});
    if(position&&unit)addEdge({id:edgeId('position_org_unit',position,unit),kind:'position_org_unit',from:nodeId('position',position),to:nodeId('org_unit',unit),label:'belongs to'});
  }

  let skillGraphTruncated=false;
  if(actor.permissions.includes('learning.read')&&positionIds.length){
    const db=adminDb(),requirements:any[]=[],skillPositionIds=positionIds.slice(0,30);
    skillGraphTruncated=positionIds.length>skillPositionIds.length;
    for(let i=0;i<skillPositionIds.length;i+=30){
      const ids=skillPositionIds.slice(i,i+30);
      if(!ids.length)continue;
      const snap=await db.collection(`organizations/${actor.orgId}/positionSkillRequirements`).where('positionId','in',ids).limit(1500).get();
      requirements.push(...snap.docs.map(d=>d.data()));
    }
    const skillIds=unique(requirements.map(r=>String(r.skillId||'')).filter(Boolean));
    const skills=await docsByIds(actor.orgId,'skills',skillIds);
    for(const s of skills){if(!s?.id)continue;addNode({id:nodeId('skill',String(s.id)),kind:'skill',label:String(s.name||s.code||'Skill'),status:s.enabled===false?'disabled':'active'})}
    for(const r of requirements){const position=String(r.positionId||''),skill=String(r.skillId||'');if(position&&skill)addEdge({id:edgeId('position_skill',position,skill),kind:'position_skill',from:nodeId('position',position),to:nodeId('skill',skill),label:`requires level ${Number(r.requiredLevel||0)}`})}
  }

  let programGraphTruncated=false;
  if(actor.permissions.includes('workforce.read')&&workerIds.length){
    const db=adminDb();
    const allocationSnap=await db.collection(`organizations/${actor.orgId}/grantWorkforceAllocations`).limit(5000).get();
    const workerSet=new Set(workerIds);
    const scopedAllocations=allocationSnap.docs.map(d=>d.data() as any).filter(a=>scoped.scope==='organization'||workerSet.has(String(a.workerId||'')));
    programGraphTruncated=allocationSnap.size>=5000;
    const projectIds=unique(scopedAllocations.map(a=>String(a.projectId||'')).filter(Boolean));
    const fundingIds=unique(scopedAllocations.map(a=>String(a.fundingSourceId||'')).filter(Boolean));
    const [projects,fundingSources]=await Promise.all([docsByIds(actor.orgId,'grantProjects',projectIds),docsByIds(actor.orgId,'grantFundingSources',fundingIds)]);
    const projectUnitIds=unique(projects.map(p=>String(p.orgUnitId||'')).filter(Boolean));
    const projectUnits=await docsByIds(actor.orgId,'orgUnits',projectUnitIds);
    for(const u of projectUnits){if(!u?.id)continue;addNode({id:nodeId('org_unit',String(u.id)),kind:'org_unit',label:String(u.name||u.code||'Organization unit'),status:u.status?String(u.status):undefined})}
    for(const p of projects){if(!p?.id)continue;addNode({id:nodeId('project',String(p.id)),kind:'project',label:String(p.name||p.code||'Project'),status:p.status?String(p.status):undefined});const funding=String(p.fundingSourceId||'');if(funding)addEdge({id:edgeId('project_funding',String(p.id),funding),kind:'project_funding',from:nodeId('project',String(p.id)),to:nodeId('funding_source',funding),label:'funded by'});const unit=String(p.orgUnitId||'');if(unit)addEdge({id:edgeId('project_org_unit',String(p.id),unit),kind:'project_org_unit',from:nodeId('project',String(p.id)),to:nodeId('org_unit',unit),label:'owned by'})}
    for(const f of fundingSources){if(!f?.id)continue;addNode({id:nodeId('funding_source',String(f.id)),kind:'funding_source',label:String(f.name||f.code||'Funding source'),status:f.status?String(f.status):undefined})}
    for(const a of scopedAllocations){const worker=String(a.workerId||''),project=String(a.projectId||''),funding=String(a.fundingSourceId||'');if(worker&&project)addEdge({id:edgeId('worker_project',worker,project),kind:'worker_project',from:nodeId('worker',worker),to:nodeId('project',project),label:`allocated ${Number(a.allocationPct||0)}%`});if(worker&&funding)addEdge({id:edgeId('worker_funding',worker,funding),kind:'worker_funding',from:nodeId('worker',worker),to:nodeId('funding_source',funding),label:`funded ${Number(a.allocationPct||0)}%`})}
  }

  let knowledgeGraphTruncated=false;
  const db=adminDb();
  if(actor.permissions.includes('policies.read')||actor.permissions.includes('compliance.read')){
    const [policySnap,requirementSnap]=await Promise.all([
      db.collection(`organizations/${actor.orgId}/policies`).limit(250).get(),
      actor.permissions.includes('compliance.read')?db.collection(`organizations/${actor.orgId}/complianceRequirements`).limit(500).get():Promise.resolve({docs:[],size:0} as any),
    ]);
    knowledgeGraphTruncated=knowledgeGraphTruncated||policySnap.size>=250||Number((requirementSnap as any).size||0)>=500;
    const policies=policySnap.docs.map(d=>d.data() as any).filter(p=>p.status!=='archived'&&Boolean(p.currentPublishedVersionId));
    const visiblePolicyIds=new Set(policies.map(p=>String(p.id)));
    const explicitPolicyIds=[...visiblePolicyIds];
    for(const policy of policies){
      const id=String(policy.id||'');if(!id)continue;
      addNode({id:nodeId('policy',id),kind:'policy',label:`${String(policy.code||'POLICY')} · ${String(policy.title||'Policy')}`,status:String(policy.status||'published')});
      for(const unit of (policy.audienceOrgUnitIds||[]).map(String).filter(Boolean))addEdge({id:edgeId('policy_org_unit',id,unit),kind:'policy_org_unit',from:nodeId('policy',id),to:nodeId('org_unit',unit),label:'audience includes'});
    }
    for(const d of (requirementSnap as any).docs||[]){const r=d.data() as any,id=String(r.id||d.id||'');if(!id)continue;addNode({id:nodeId('compliance_requirement',id),kind:'compliance_requirement',label:String(r.name||'Compliance requirement'),status:r.required===false?'optional':'required'});const policy=String(r.policyId||'');if(policy&&visiblePolicyIds.has(policy))addEdge({id:edgeId('requirement_policy',id,policy),kind:'requirement_policy',from:nodeId('compliance_requirement',id),to:nodeId('policy',policy),label:'requires acknowledgement'});for(const unit of (r.orgUnitIds||[]).map(String).filter(Boolean))addEdge({id:edgeId('requirement_org_unit',id,unit),kind:'requirement_org_unit',from:nodeId('compliance_requirement',id),to:nodeId('org_unit',unit),label:'applies to'});}
  }
  if(actor.permissions.includes('service.read')||actor.permissions.includes('experience.read')){
    const articles=await db.collection(`organizations/${actor.orgId}/knowledgeArticles`).where('status','==','published').limit(250).get();knowledgeGraphTruncated=knowledgeGraphTruncated||articles.size>=250;
    for(const d of articles.docs){const a=d.data() as any,id=String(a.id||d.id||'');if(id)addNode({id:nodeId('knowledge_article',id),kind:'knowledge_article',label:String(a.title||'Knowledge article'),status:'published'})}
  }
  if(actor.permissions.includes('workflow.read')){
    const ws=await db.collection(`organizations/${actor.orgId}/workflowDefinitions`).limit(250).get();knowledgeGraphTruncated=knowledgeGraphTruncated||ws.size>=250;
    const visiblePolicies=new Set(nodes.filter(n=>n.kind==='policy').map(n=>n.id.slice('policy:'.length)));
    for(const d of ws.docs){const w=d.data() as any,id=String(w.id||d.id||'');if(!id)continue;addNode({id:nodeId('workflow',id),kind:'workflow',label:String(w.name||'Workflow'),status:w.enabled===false?'disabled':'enabled'});for(const c of w.conditions||[]){const field=String(c.field||'').toLowerCase();const values=Array.isArray(c.value)?c.value:[c.value];if(field.endsWith('policyid')||field==='policy.id'){for(const value of values.map(String).filter(Boolean))if(visiblePolicies.has(value))addEdge({id:edgeId('policy_workflow',value,id),kind:'policy_workflow',from:nodeId('policy',value),to:nodeId('workflow',id),label:'explicit workflow condition'})}}}
  }
  if(actor.permissions.includes('onboarding.read')){
    const taskSnap=await db.collection(`organizations/${actor.orgId}/onboardingTasks`).limit(1000).get();knowledgeGraphTruncated=knowledgeGraphTruncated||taskSnap.size>=1000;
    const visiblePolicies=new Set(nodes.filter(n=>n.kind==='policy').map(n=>n.id.slice('policy:'.length)));
    for(const d of taskSnap.docs){const t=d.data() as any,id=String(t.id||d.id||''),policy=String(t.policyId||'');if(!id||!policy||!visiblePolicies.has(policy)||!['form','training'].includes(String(t.taskType||'')))continue;addNode({id:nodeId('onboarding_task',id),kind:'onboarding_task',label:String(t.title||'Onboarding task'),status:String(t.status||'pending')});const kind=t.taskType==='form'?'policy_onboarding_form':'policy_onboarding_training';addEdge({id:edgeId(kind as any,policy,id),kind:kind as any,from:nodeId('policy',policy),to:nodeId('onboarding_task',id),label:t.taskType==='form'?'explicit onboarding form':'explicit onboarding training'})}
  }
  if(actor.permissions.includes('learning.read')){
    const [courseSnap,pathSnap,assignmentSnap]=await Promise.all([db.collection(`organizations/${actor.orgId}/courses`).where('status','==','published').limit(500).get(),db.collection(`organizations/${actor.orgId}/learningPaths`).where('status','==','published').limit(250).get(),workerIds.length?db.collection(`organizations/${actor.orgId}/learningAssignments`).limit(3000).get():Promise.resolve({docs:[],size:0} as any)]);
    knowledgeGraphTruncated=knowledgeGraphTruncated||courseSnap.size>=500||pathSnap.size>=250||Number((assignmentSnap as any).size||0)>=3000;
    const courseIds=new Set<string>();
    for(const d of courseSnap.docs){const c=d.data() as any,id=String(c.id||d.id||'');if(!id)continue;courseIds.add(id);addNode({id:nodeId('course',id),kind:'course',label:`${String(c.code||'COURSE')} · ${String(c.title||'Course')}`,status:'published'});for(const m of c.skillMappings||[]){const skill=String(m.skillId||'');if(skill)addEdge({id:edgeId('course_skill',id,skill),kind:'course_skill',from:nodeId('course',id),to:nodeId('skill',skill),label:`develops to level ${Number(m.targetLevel||0)}`})}}
    for(const d of pathSnap.docs){const lp=d.data() as any,id=String(lp.id||d.id||'');if(!id)continue;addNode({id:nodeId('learning_path',id),kind:'learning_path',label:`${String(lp.code||'PATH')} · ${String(lp.title||'Learning path')}`,status:'published'});for(const course of (lp.courseIds||[]).map(String).filter(Boolean))if(courseIds.has(course))addEdge({id:edgeId('learning_path_course',id,course),kind:'learning_path_course',from:nodeId('learning_path',id),to:nodeId('course',course),label:'includes course'});for(const position of (lp.targetPositionIds||[]).map(String).filter(Boolean))addEdge({id:edgeId('learning_path_position',id,position),kind:'learning_path_position',from:nodeId('learning_path',id),to:nodeId('position',position),label:'targets position'});for(const skill of (lp.targetSkillIds||[]).map(String).filter(Boolean))addEdge({id:edgeId('learning_path_skill',id,skill),kind:'learning_path_skill',from:nodeId('learning_path',id),to:nodeId('skill',skill),label:'targets skill'})}
    const scopedWorkers=new Set(workerIds);for(const d of (assignmentSnap as any).docs||[]){const a=d.data() as any,worker=String(a.workerId||''),course=String(a.courseId||'');if(worker&&course&&scopedWorkers.has(worker)&&courseIds.has(course))addEdge({id:edgeId('worker_course',worker,course),kind:'worker_course',from:nodeId('worker',worker),to:nodeId('course',course),label:String(a.status||'assigned').replaceAll('_',' ')})}
  }

  const counts={workers:nodes.filter(n=>n.kind==='worker').length,positions:nodes.filter(n=>n.kind==='position').length,orgUnits:nodes.filter(n=>n.kind==='org_unit').length,skills:nodes.filter(n=>n.kind==='skill').length,projects:nodes.filter(n=>n.kind==='project').length,fundingSources:nodes.filter(n=>n.kind==='funding_source').length,policies:nodes.filter(n=>n.kind==='policy').length,knowledgeArticles:nodes.filter(n=>n.kind==='knowledge_article').length,workflows:nodes.filter(n=>n.kind==='workflow').length,courses:nodes.filter(n=>n.kind==='course').length,learningPaths:nodes.filter(n=>n.kind==='learning_path').length,complianceRequirements:nodes.filter(n=>n.kind==='compliance_requirement').length,onboardingTasks:nodes.filter(n=>n.kind==='onboarding_task').length,relationships:edges.length};
  return{scope:scoped.scope,nodes,edges,counts,truncated:scoped.truncated||skillGraphTruncated||programGraphTruncated||knowledgeGraphTruncated||nodes.length>=MAX_NODES||edges.length>=MAX_EDGES,generatedAt:now(),privacyNote:'This graph is permission-scoped and intentionally excludes private contact, compensation, health, case and employee-document contents. V7.22 adds only explicit policy audience, compliance requirement, policy-conditioned workflow, policy-linked onboarding form/training, published knowledge/workflow, course/skill, learning-path and scoped learning-assignment relationships where the corresponding domain permission is present. It does not infer legal applicability, funding eligibility, employee suitability or employment outcomes.'};
}
