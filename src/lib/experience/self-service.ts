import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import type { ActorContext } from '@/domain/security';
import type { KnowledgeArticle, ServiceCatalogItem, ServiceTicketPriority } from '@/domain/experience';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';

const now=()=>new Date().toISOString();

const assistSchema=z.object({
  catalogItemId:z.string().min(1).max(160).optional(),
  subject:z.string().trim().min(4).max(200),
  description:z.string().trim().min(10).max(10000),
});

const sessionActionSchema=z.object({
  sessionId:z.string().min(1).max(160),
  action:z.literal('resolved'),
});

const stopWords=new Set([
  'about','after','again','also','because','been','being','could','does','from','have','help',
  'into','need','please','that','their','there','these','they','this','what','when','where',
  'which','with','would','your','request','issue','question'
]);

const priorityRank:Record<ServiceTicketPriority,number>={low:0,normal:1,high:2,urgent:3};
const priorities:ServiceTicketPriority[]=['low','normal','high','urgent'];

export type ServiceSelfServiceSuggestion={
  id:string;
  title:string;
  summary:string;
  body:string;
  category:string;
  relevance:number;
};

export type ServiceRequestTriage={
  suggestedPriority:ServiceTicketPriority;
  suggestedConfidentiality:'standard'|'restricted';
  routingRole:string;
  confidence:number;
  reasons:string[];
  knowledgeArticleIds:string[];
  targetFirstResponseHours:number;
  targetResolutionHours:number;
  directHumanReviewRecommended:boolean;
};

function tokenize(value:string){
  return [...new Set(
    value.toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s_-]/gu,' ')
      .split(/\s+/)
      .map(x=>x.trim())
      .filter(x=>x.length>=3&&!stopWords.has(x))
  )].slice(0,80);
}

function textContains(text:string,token:string){
  return text.toLowerCase().includes(token.toLowerCase());
}

export function scoreKnowledgeArticles(query:string,articles:KnowledgeArticle[],category?:string):ServiceSelfServiceSuggestion[]{
  const tokens=tokenize(query);
  return articles.map(article=>{
    let points=0;
    const title=article.title.toLowerCase();
    const summary=article.summary.toLowerCase();
    const body=article.body.toLowerCase();
    const keywords=article.keywords.map(x=>x.toLowerCase());
    for(const token of tokens){
      if(title.includes(token))points+=8;
      if(summary.includes(token))points+=4;
      if(keywords.some(k=>k.includes(token)||token.includes(k)))points+=6;
      if(body.includes(token))points+=1;
    }
    if(category&&article.category===category)points+=12;
    const relevance=Math.min(100,Math.round(points));
    return{id:article.id,title:article.title,summary:article.summary,body:article.body,category:article.category,relevance};
  }).filter(x=>x.relevance>=12).sort((a,b)=>b.relevance-a.relevance||a.title.localeCompare(b.title)).slice(0,3);
}

export function urgencyFromText(value:string):'normal'|'high'|'urgent'{
  const text=value.toLowerCase();
  if(/\b(emergency|urgent|immediate danger|immediate safety|threat|violence)\b/i.test(text))return'urgent';
  if(/\b(today|deadline|locked out|cannot access|can't access|not paid|missing pay|pay missing|payroll missing|time[- ]sensitive)\b/i.test(text))return'high';
  return'normal';
}

export function higherPriority(a:ServiceTicketPriority,b:ServiceTicketPriority):ServiceTicketPriority{
  return priorities[Math.max(priorityRank[a],priorityRank[b])]!;
}

function catalogScore(query:string,item:ServiceCatalogItem){
  const tokens=tokenize(query);
  const haystack=`${item.code} ${item.name} ${item.description} ${item.category}`.toLowerCase();
  return tokens.reduce((score,token)=>score+(textContains(haystack,token)?1:0),0);
}

async function publishedKnowledge(orgId:string){
  const snap=await adminDb().collection(`organizations/${orgId}/knowledgeArticles`).where('status','==','published').limit(300).get();
  return snap.docs.map(d=>d.data() as KnowledgeArticle);
}

async function enabledCatalog(orgId:string){
  const snap=await adminDb().collection(`organizations/${orgId}/serviceCatalogItems`).where('enabled','==',true).limit(200).get();
  return snap.docs.map(d=>d.data() as ServiceCatalogItem);
}

export async function computeServiceTriage(
  orgId:string,
  subject:string,
  description:string,
  catalog:ServiceCatalogItem,
):Promise<ServiceRequestTriage>{
  const text=`${subject} ${description}`;
  const articles=await publishedKnowledge(orgId);
  const suggestions=scoreKnowledgeArticles(text,articles,catalog.category);
  const urgency=urgencyFromText(text);
  const suggestedPriority=higherPriority(catalog.defaultPriority,urgency);
  const restricted=catalog.category==='employee_relations'||/\b(harass|discriminat|retaliat|violence|confidential|privacy|medical|accommodation)\b/i.test(text);
  const targetFirstResponseHours=suggestedPriority==='urgent'?Math.min(catalog.firstResponseHours,1):suggestedPriority==='high'?Math.min(catalog.firstResponseHours,4):catalog.firstResponseHours;
  const targetResolutionHours=suggestedPriority==='urgent'?Math.min(catalog.resolutionHours,24):suggestedPriority==='high'?Math.min(catalog.resolutionHours,48):catalog.resolutionHours;
  const reasons=[
    `Catalog baseline: ${catalog.name} (${catalog.defaultPriority} priority).`,
    urgency!=='normal'?`Time/urgency language elevated review to ${suggestedPriority}.`:'No additional urgency elevation was detected.',
    restricted?'Restricted handling is suggested because the request may contain sensitive workplace or personal information.':'Standard confidentiality is suggested from the submitted request.',
    suggestions.length?`${suggestions.length} published knowledge article(s) matched the request.`:'No sufficiently relevant published knowledge article was found.',
  ];
  const confidence=Math.min(95,Math.max(45,(suggestions[0]?.relevance||0)+35));
  return{
    suggestedPriority,
    suggestedConfidentiality:restricted?'restricted':'standard',
    routingRole:'hr_admin',
    confidence,
    reasons,
    knowledgeArticleIds:suggestions.map(x=>x.id),
    targetFirstResponseHours,
    targetResolutionHours,
    directHumanReviewRecommended:suggestedPriority==='urgent'||restricted,
  };
}

export async function prepareServiceSelfService(actor:ActorContext,raw:unknown){
  if(!actor.permissions.includes('service.request'))throw new ApiError(403,'HR service request permission required.','forbidden');
  const input=assistSchema.parse(raw);
  const db=adminDb();
  const [catalog,articles]=await Promise.all([enabledCatalog(actor.orgId),publishedKnowledge(actor.orgId)]);
  if(!catalog.length)throw new ApiError(409,'No enabled HR service catalog is available.','service_catalog_empty');

  let selected=input.catalogItemId?catalog.find(x=>x.id===input.catalogItemId):undefined;
  if(input.catalogItemId&&!selected)throw new ApiError(400,'Selected HR service is unavailable.','service_catalog_not_found');
  if(!selected){
    selected=[...catalog].sort((a,b)=>catalogScore(`${input.subject} ${input.description}`,b)-catalogScore(`${input.subject} ${input.description}`,a))[0];
  }
  if(!selected)throw new ApiError(409,'No service category could be resolved.','service_catalog_empty');

  const suggestions=scoreKnowledgeArticles(`${input.subject} ${input.description}`,articles,selected.category);
  const triage=await computeServiceTriage(actor.orgId,input.subject,input.description,selected);
  const sessionId=randomUUID();
  const timestamp=now();
  const session={
    id:sessionId,
    requesterUid:actor.uid,
    requesterWorkerId:actor.workerId||null,
    catalogItemId:selected.id,
    catalogCode:selected.code,
    category:selected.category,
    subjectHash:createHash('sha256').update(input.subject.trim().toLowerCase()).digest('hex'),
    queryWordCount:tokenize(`${input.subject} ${input.description}`).length,
    knowledgeArticleIds:suggestions.map(x=>x.id),
    suggestedPriority:triage.suggestedPriority,
    suggestedConfidentiality:triage.suggestedConfidentiality,
    routingRole:triage.routingRole,
    triageConfidence:triage.confidence,
    outcome:'suggested',
    createdAt:timestamp,
    updatedAt:timestamp,
  };
  const audit=buildAudit(actor,{
    action:'service.self_service.prepare',
    entityType:'serviceSelfServiceSession',
    entityId:sessionId,
    after:{
      catalogItemId:selected.id,
      category:selected.category,
      knowledgeArticleIds:session.knowledgeArticleIds,
      suggestedPriority:session.suggestedPriority,
      outcome:session.outcome,
    },
  });
  const batch=db.batch();
  batch.create(db.doc(`organizations/${actor.orgId}/serviceSelfServiceSessions/${sessionId}`),session);
  batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
  await batch.commit();

  return{
    sessionId,
    recommendedCatalogItem:{id:selected.id,code:selected.code,name:selected.name,category:selected.category},
    suggestions,
    triage,
    promptWrittenBy:'OPSIQO',
    note:'Knowledge suggestions and triage are advisory. Employees can still submit a governed HR request for individualized help.',
  };
}

export async function resolveServiceSelfService(actor:ActorContext,raw:unknown){
  if(!actor.permissions.includes('service.request'))throw new ApiError(403,'HR service request permission required.','forbidden');
  const input=sessionActionSchema.parse(raw);
  const db=adminDb();
  const ref=db.doc(`organizations/${actor.orgId}/serviceSelfServiceSessions/${input.sessionId}`);
  const snap=await ref.get();
  if(!snap.exists)throw new ApiError(404,'Self-service session not found.','self_service_session_not_found');
  const row=snap.data() as any;
  if(row.requesterUid!==actor.uid)throw new ApiError(403,'Self-service session is outside your access scope.','forbidden');
  const timestamp=now();
  await ref.set({outcome:'resolved_without_ticket',resolvedAt:timestamp,updatedAt:timestamp},{merge:true});
  return{id:input.sessionId,outcome:'resolved_without_ticket',resolvedAt:timestamp};
}

export async function linkSelfServiceSessionToTicket(actor:ActorContext,sessionId:string,ticketId:string){
  const db=adminDb();
  const ref=db.doc(`organizations/${actor.orgId}/serviceSelfServiceSessions/${sessionId}`);
  const snap=await ref.get();
  if(!snap.exists)return false;
  const row=snap.data() as any;
  if(row.requesterUid!==actor.uid)return false;
  const timestamp=now();
  await ref.set({outcome:'escalated_to_ticket',ticketId,escalatedAt:timestamp,updatedAt:timestamp},{merge:true});
  return true;
}
