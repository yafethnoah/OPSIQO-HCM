import { createHash, randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { AiEvidenceItem } from '@/domain/ai-intelligence';
import type { EmployeeSurvey, HrServiceTicket, KnowledgeArticle, Recognition, EmployeeIdea, ServiceSatisfaction, SurveyResponse } from '@/domain/experience';
import { adminDb } from '@/lib/firebase/admin';
import { buildDomainEvent } from '@/lib/events/build';
import { systemActor } from '@/lib/automation/system-actor';

const now=()=>new Date().toISOString();
const round=(n:number,d=1)=>Number(n.toFixed(d));
const dayMs=86400_000;

export type ExperienceSignal={
  id:string;
  severity:'watch'|'high';
  title:string;
  summary:string;
  recommendation:string;
  evidenceIds:string[];
};

export type ExperienceSignalSnapshot={
  generatedAt:string;
  metrics:{
    openTickets:number;
    tickets30d:number;
    ticketsPrevious30d:number;
    ticketGrowthPct:number;
    slaBreachPct:number;
    csat:number;
    selfServiceSessions30d:number;
    selfServiceDeflectionPct:number;
    recognitions30d:number;
    openIdeas:number;
    publishedKnowledge:number;
    latestSurveyResponses:number;
    latestSurveyParticipationPct:number;
    latestRecommendationScore:number|null;
  };
  topTicketCategories:Array<{category:string;count:number}>;
  surveyDrivers:Array<{driver:string;average:number;responses:number}>;
  signals:ExperienceSignal[];
};

function within(iso:string|undefined,since:number,until=Date.now()){
  if(!iso)return false;
  const time=new Date(iso).getTime();
  return Number.isFinite(time)&&time>=since&&time<until;
}

async function aggregate(orgId:string):Promise<ExperienceSignalSnapshot>{
  const db=adminDb();
  const [ticketSnap,satisfactionSnap,surveySnap,recognitionSnap,ideaSnap,knowledgeSnap,sessionSnap]=await Promise.all([
    db.collection(`organizations/${orgId}/hrServiceTickets`).limit(2500).get(),
    db.collection(`organizations/${orgId}/serviceSatisfaction`).limit(2500).get(),
    db.collection(`organizations/${orgId}/employeeSurveys`).limit(150).get(),
    db.collection(`organizations/${orgId}/recognitions`).limit(2000).get(),
    db.collection(`organizations/${orgId}/employeeIdeas`).limit(2000).get(),
    db.collection(`organizations/${orgId}/knowledgeArticles`).where('status','==','published').limit(500).get(),
    db.collection(`organizations/${orgId}/serviceSelfServiceSessions`).limit(2500).get(),
  ]);

  const tickets=ticketSnap.docs.map(d=>d.data() as HrServiceTicket);
  const satisfaction=satisfactionSnap.docs.map(d=>d.data() as ServiceSatisfaction);
  const surveys=surveySnap.docs.map(d=>d.data() as EmployeeSurvey);
  const recognition=recognitionSnap.docs.map(d=>d.data() as Recognition);
  const ideas=ideaSnap.docs.map(d=>d.data() as EmployeeIdea);
  const knowledge=knowledgeSnap.docs.map(d=>d.data() as KnowledgeArticle);
  const sessions=sessionSnap.docs.map(d=>d.data() as any);

  const nowMs=Date.now(),since30=nowMs-30*dayMs,since60=nowMs-60*dayMs,since90=nowMs-90*dayMs;
  const tickets30=tickets.filter(t=>within(t.createdAt,since30));
  const ticketsPrev=tickets.filter(t=>within(t.createdAt,since60,since30));
  const ticketGrowthPct=ticketsPrev.length?round((tickets30.length-ticketsPrev.length)/ticketsPrev.length*100,0):tickets30.length?100:0;
  const breached30=tickets30.filter(t=>t.slaFirstResponseBreached||t.slaResolutionBreached).length;
  const slaBreachPct=tickets30.length?round(breached30/tickets30.length*100,1):0;
  const sat90=satisfaction.filter(x=>within(x.createdAt,since90));
  const csat=sat90.length?round(sat90.reduce((sum,x)=>sum+x.rating,0)/sat90.length,2):0;
  const sessions30=sessions.filter(x=>within(String(x.createdAt||''),since30));
  const deflected=sessions30.filter(x=>x.outcome==='resolved_without_ticket').length;
  const selfServiceDeflectionPct=sessions30.length?round(deflected/sessions30.length*100,1):0;
  const recognitions30=recognition.filter(x=>within(x.createdAt,since30)).length;
  const openIdeas=ideas.filter(x=>['submitted','under_review','planned'].includes(x.status)).length;
  const openTickets=tickets.filter(t=>!['resolved','closed','cancelled'].includes(t.status)).length;

  const categoryCounts=new Map<string,number>();
  for(const ticket of tickets30)categoryCounts.set(ticket.category,(categoryCounts.get(ticket.category)||0)+1);
  const topTicketCategories=[...categoryCounts.entries()].map(([category,count])=>({category,count})).sort((a,b)=>b.count-a.count).slice(0,6);

  const latestSurvey=surveys
    .filter(s=>['published','closed'].includes(s.status))
    .sort((a,b)=>(b.updatedAt||b.createdAt).localeCompare(a.updatedAt||a.createdAt))[0];

  let latestSurveyResponses=0;
  let latestSurveyParticipationPct=0;
  let latestRecommendationScore:number|null=null;
  const surveyDrivers:Array<{driver:string;average:number;responses:number}>=[];

  if(latestSurvey){
    const responseSnap=await db.collection(`organizations/${orgId}/surveyResponses`).where('surveyId','==',latestSurvey.id).limit(10000).get();
    const responses=responseSnap.docs.map(d=>d.data() as SurveyResponse);
    latestSurveyResponses=responses.length;
    const eligible=Number(latestSurvey.eligibleCountAtPublish||0);
    latestSurveyParticipationPct=eligible?round(responses.length/eligible*100,1):0;
    const released=latestSurvey.responseMode==='identified'||responses.length>=latestSurvey.anonymityThreshold;
    if(released){
      for(const question of latestSurvey.questions){
        if(!['likert5','enps'].includes(question.type))continue;
        const values=responses.flatMap(r=>r.answers.filter(a=>a.questionId===question.id).map(a=>a.numberValue).filter((n):n is number=>typeof n==='number'));
        if(question.type==='enps'&&values.length){
          latestRecommendationScore=round(((values.filter(v=>v>=9).length/values.length)-(values.filter(v=>v<=6).length/values.length))*100,0);
        }
        if(question.type==='likert5'&&question.driver&&values.length){
          surveyDrivers.push({driver:question.driver,average:round(values.reduce((a,b)=>a+b,0)/values.length,2),responses:values.length});
        }
      }
    }
  }

  const metrics={
    openTickets,tickets30d:tickets30.length,ticketsPrevious30d:ticketsPrev.length,ticketGrowthPct,slaBreachPct,csat,
    selfServiceSessions30d:sessions30.length,selfServiceDeflectionPct,recognitions30d:recognitions30,openIdeas,
    publishedKnowledge:knowledge.length,latestSurveyResponses,latestSurveyParticipationPct,latestRecommendationScore,
  };

  const signals:ExperienceSignal[]=[];
  if(tickets30.length>=5&&ticketGrowthPct>=50)signals.push({id:'service-demand-growth',severity:'high',title:'HR service demand is rising quickly',summary:`HR requests increased ${ticketGrowthPct}% versus the previous 30-day period.`,recommendation:'Review the fastest-growing service categories, root causes and knowledge coverage before changing policy or staffing.',evidenceIds:['experience:service-demand']});
  else if(tickets30.length>=5&&ticketGrowthPct>=25)signals.push({id:'service-demand-growth',severity:'watch',title:'HR service demand is trending upward',summary:`HR requests increased ${ticketGrowthPct}% versus the previous 30-day period.`,recommendation:'Monitor category-level demand and identify repeatable employee questions that can be resolved through clearer knowledge or process changes.',evidenceIds:['experience:service-demand']});

  if(tickets30.length>=5&&slaBreachPct>=15)signals.push({id:'service-sla',severity:'high',title:'HR service SLA performance needs attention',summary:`${slaBreachPct}% of requests created in the last 30 days show a first-response or resolution breach.`,recommendation:'Review queue capacity, routing and the highest-volume service categories; keep individual employment decisions outside this analysis.',evidenceIds:['experience:service-health']});
  else if(tickets30.length>=5&&slaBreachPct>=5)signals.push({id:'service-sla',severity:'watch',title:'HR service SLA breaches are emerging',summary:`${slaBreachPct}% of recent requests show an SLA breach.`,recommendation:'Review routing and aging requests before breaches become systemic.',evidenceIds:['experience:service-health']});

  if(sat90.length>=5&&csat<3.5)signals.push({id:'service-csat',severity:'high',title:'Employee service satisfaction is low',summary:`Recent HR service CSAT is ${csat}/5 across ${sat90.length} ratings.`,recommendation:'Review recurring resolution issues and requester feedback at an aggregate level, then create a governed service-improvement plan.',evidenceIds:['experience:service-health']});
  else if(sat90.length>=5&&csat<4)signals.push({id:'service-csat',severity:'watch',title:'Employee service satisfaction has room to improve',summary:`Recent HR service CSAT is ${csat}/5.`,recommendation:'Identify the service categories contributing most to lower satisfaction and test targeted improvements.',evidenceIds:['experience:service-health']});

  if(latestRecommendationScore!==null&&latestRecommendationScore<0)signals.push({id:'employee-advocacy',severity:'high',title:'Employee advocacy signal is weak',summary:`The latest released recommendation score is ${latestRecommendationScore}.`,recommendation:'Review released aggregate survey drivers and corroborate them with service and idea trends before choosing interventions.',evidenceIds:['experience:listening']});
  else if(latestRecommendationScore!==null&&latestRecommendationScore<20)signals.push({id:'employee-advocacy',severity:'watch',title:'Employee advocacy should be monitored',summary:`The latest released recommendation score is ${latestRecommendationScore}.`,recommendation:'Review aggregate survey drivers and track whether planned improvements change the next pulse result.',evidenceIds:['experience:listening']});

  for(const driver of surveyDrivers.filter(x=>x.responses>=Math.max(3,latestSurvey?.anonymityThreshold||3))){
    if(driver.average<3)signals.push({id:`survey-driver-${driver.driver}`,severity:'high',title:`Survey driver needs attention: ${driver.driver}`,summary:`Released aggregate average is ${driver.average}/5 across ${driver.responses} responses.`,recommendation:'Review the driver with other aggregate experience evidence and create a non-consequential improvement action for human approval.',evidenceIds:['experience:listening']});
    else if(driver.average<3.5)signals.push({id:`survey-driver-${driver.driver}`,severity:'watch',title:`Survey driver is below target: ${driver.driver}`,summary:`Released aggregate average is ${driver.average}/5.`,recommendation:'Monitor this driver and compare it with service-demand and idea patterns.',evidenceIds:['experience:listening']});
  }

  const topCategory=topTicketCategories[0];
  if(topCategory&&topCategory.count>=3&&!knowledge.some(k=>k.category===topCategory.category)){
    signals.push({id:'knowledge-gap',severity:'watch',title:'Knowledge coverage gap detected',summary:`The highest-volume recent HR service category is “${topCategory.category}” (${topCategory.count} requests), but no published knowledge article uses that category.`,recommendation:'Create or review a knowledge article for repeatable questions in this category while preserving individualized HR review where needed.',evidenceIds:['experience:knowledge-self-service','experience:service-demand']});
  }

  if(sessions30.length>=5&&selfServiceDeflectionPct<25){
    signals.push({id:'self-service-deflection',severity:'watch',title:'Knowledge-first self-service is not resolving enough requests',summary:`Only ${selfServiceDeflectionPct}% of recent guided self-service sessions were marked resolved without a ticket.`,recommendation:'Review search relevance, knowledge gaps and wording of the most-used service categories.',evidenceIds:['experience:knowledge-self-service']});
  }

  return{generatedAt:now(),metrics,topTicketCategories,surveyDrivers,signals:signals.slice(0,10)};
}

export async function buildExperienceSignalSnapshot(orgId:string){
  return aggregate(orgId);
}

export async function retrieveExperienceAiEvidence(actor:ActorContext):Promise<AiEvidenceItem[]>{
  const allowed=actor.permissions.includes('experience.manage')||actor.permissions.includes('experience.survey')||actor.permissions.includes('service.manage');
  if(!allowed)return[];
  const snapshot=await aggregate(actor.orgId);
  const m=snapshot.metrics;
  const categorySummary=snapshot.topTicketCategories.length?snapshot.topTicketCategories.map(x=>`${x.category}=${x.count}`).join(', '):'no recent category volume';
  const driverSummary=snapshot.surveyDrivers.length?snapshot.surveyDrivers.map(x=>`${x.driver}=${x.average}/5 (${x.responses})`).join(', '):'no released aggregate driver values';

  // Privacy boundary: no raw ticket descriptions, idea text, recognition text, survey comments,
  // worker identifiers or individual satisfaction records are exposed to the AI evidence pack.
  return[
    {id:'experience:service-health',kind:'metric',title:'HR service health',summary:`Open requests ${m.openTickets}; requests last 30d ${m.tickets30d}; SLA breach rate ${m.slaBreachPct}%; recent CSAT ${m.csat||'not enough ratings'}/5.`,source:'Employee Experience & HR Service Center aggregate',asOf:snapshot.generatedAt,href:'/experience',dataQuality:'Aggregate service metrics only. No requester identity or ticket description is exposed.',sensitivity:'aggregate'},
    {id:'experience:service-demand',kind:'metric',title:'HR service demand trend',summary:`30-day requests ${m.tickets30d} versus ${m.ticketsPrevious30d} in the prior period; change ${m.ticketGrowthPct}%. Top categories: ${categorySummary}.`,source:'Employee Experience & HR Service Center aggregate',asOf:snapshot.generatedAt,href:'/experience',dataQuality:'Category-level demand only; individual cases and descriptions are excluded.',sensitivity:'aggregate'},
    {id:'experience:listening',kind:'metric',title:'Employee listening signals',summary:`Latest released survey responses ${m.latestSurveyResponses}; participation ${m.latestSurveyParticipationPct}%; recommendation score ${m.latestRecommendationScore??'not released'}; released drivers: ${driverSummary}.`,source:'Threshold-protected employee survey aggregates',asOf:snapshot.generatedAt,href:'/experience',dataQuality:'Only released aggregate survey metrics are included. Anonymous respondent identity and free text are excluded.',sensitivity:'aggregate'},
    {id:'experience:knowledge-self-service',kind:'metric',title:'Knowledge and self-service effectiveness',summary:`Published knowledge articles ${m.publishedKnowledge}; guided self-service sessions last 30d ${m.selfServiceSessions30d}; resolved without ticket ${m.selfServiceDeflectionPct}%.`,source:'Employee Service Center aggregate',asOf:snapshot.generatedAt,href:'/employee-service-center',dataQuality:'Aggregate self-service outcomes only; submitted request text is not exposed.',sensitivity:'aggregate'},
    {id:'experience:voice-recognition',kind:'metric',title:'Employee voice and recognition',summary:`Open employee ideas ${m.openIdeas}; organization recognition events last 30d ${m.recognitions30d}.`,source:'Employee Experience aggregate',asOf:snapshot.generatedAt,href:'/experience',dataQuality:'Counts only; idea text, recognition message text and worker identities are excluded.',sensitivity:'aggregate'},
    ...snapshot.signals.slice(0,6).map(signal=>({id:`experience:signal:${signal.id}`,kind:'metric' as const,title:signal.title,summary:`${signal.summary} Recommended review: ${signal.recommendation}`,source:'OPSIQO deterministic experience signal engine',asOf:snapshot.generatedAt,href:'/experience',dataQuality:'Deterministic aggregate signal; human review required before organizational action.',sensitivity:'aggregate' as const})),
  ];
}

async function notifySignal(orgId:string,key:string,title:string,message:string,priority:'normal'|'high'){
  const db=adminDb(),dedupe=db.doc(`organizations/${orgId}/notificationDedupe/${createHash('sha256').update(key).digest('hex')}`);
  try{
    await dedupe.create({key,createdAt:now()});
    const id=randomUUID(),timestamp=now();
    await db.doc(`organizations/${orgId}/notifications/${id}`).create({
      id,type:'employee_experience',category:'employee_experience',priority,title,message,
      targetRole:'hr_admin',entityType:'experienceSignal',entityId:key,status:'unread',
      inAppVisible:true,emailStatus:'disabled',emailAttempts:0,createdAt:timestamp,updatedAt:timestamp,
    });
    return true;
  }catch{return false;}
}

export async function processExperienceSignalGovernance(orgId:string){
  const snapshot=await aggregate(orgId);
  const db=adminDb(),actor=systemActor(orgId,'system:experience-intelligence'),day=snapshot.generatedAt.slice(0,10);
  let created=0,notifications=0;
  for(const signal of snapshot.signals){
    const key=`${signal.id}:${day}`;
    const id=createHash('sha256').update(key).digest('hex');
    const ref=db.doc(`organizations/${orgId}/experienceSignals/${id}`);
    try{
      await ref.create({id,key,signalId:signal.id,severity:signal.severity,title:signal.title,summary:signal.summary,recommendation:signal.recommendation,evidenceIds:signal.evidenceIds,generatedAt:snapshot.generatedAt,status:'open'});
      created++;
      const ev=buildDomainEvent(actor,'experience.signal_detected' as any,'experienceSignal',id,{signalId:signal.id,severity:signal.severity});
      await db.doc(`organizations/${orgId}/domainEvents/${ev.id}`).create(ev);
      if(await notifySignal(orgId,`experience-signal:${key}`,signal.title,signal.summary,signal.severity==='high'?'high':'normal'))notifications++;
    }catch{}
  }
  return{signalsDetected:snapshot.signals.length,signalsCreated:created,notifications};
}
