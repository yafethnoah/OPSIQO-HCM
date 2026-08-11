import type { ActorContext } from '@/domain/security';
import type { AiEvidenceItem } from '@/domain/ai-intelligence';
import type { DiagnosticAssessment, DiagnosticControl, DiagnosticControlResult, DiagnosticFinding } from '@/domain/hr-diagnostic';
import { adminDb } from '@/lib/firebase/admin';

const now=()=>new Date().toISOString();
export async function retrieveDiagnosticEvidence(actor:ActorContext,question:string):Promise<AiEvidenceItem[]>{
  if(!actor.permissions.includes('diagnostic.read'))return[];
  const q=question.toLowerCase(); if(!/(diagnostic|compliance|control|maturity|assessmentid=)/.test(q))return[];
  const db=adminDb(),out:AiEvidenceItem[]=[];
  const aid=question.match(/assessmentId=([a-zA-Z0-9_-]+)/)?.[1],cid=question.match(/controlId=([a-zA-Z0-9_-]+)/)?.[1];
  let assessments:any;
  if(aid){const s=await db.doc(`organizations/${actor.orgId}/diagnosticAssessments/${aid}`).get();assessments=s.exists?[s]:[];}else assessments=(await db.collection(`organizations/${actor.orgId}/diagnosticAssessments`).orderBy('updatedAt','desc').limit(3).get()).docs;
  for(const d of assessments){const a=d.data() as DiagnosticAssessment;out.push({id:`diagnostic:assessment:${a.id}`,kind:'diagnostic',title:`Diagnostic assessment · ${a.name}`,summary:`Status ${a.status}; score ${a.score}/100; maturity level ${a.maturityLevel}/5; evidence coverage ${a.evidenceCoverage}%; open critical ${a.counts.critical}; high ${a.counts.high}.`,source:`HR Diagnostic assessment ${a.id}`,asOf:a.updatedAt,href:'/hr-diagnostic',dataQuality:'Human-reviewed diagnostic score based on applicable controls and linked evidence. It is not a legal compliance certification.',sensitivity:'aggregate'});}
  if(aid&&cid){const [c,r,f]=await Promise.all([db.doc(`organizations/${actor.orgId}/diagnosticControls/${cid}`).get(),db.collection(`organizations/${actor.orgId}/diagnosticControlResults`).where('assessmentId','==',aid).where('controlId','==',cid).limit(1).get(),db.collection(`organizations/${actor.orgId}/diagnosticFindings`).where('assessmentId','==',aid).where('controlId','==',cid).limit(1).get()]);if(c.exists){const control=c.data() as DiagnosticControl;const result=!r.empty?r.docs[0]!.data() as DiagnosticControlResult:undefined;const finding=!f.empty?f.docs[0]!.data() as DiagnosticFinding:undefined;out.push({id:`diagnostic:control:${cid}`,kind:'diagnostic',title:`Control ${control.code} · ${control.title}`,summary:`Objective: ${control.objective}. Applicability ${result?.applicability||'pending'}; status ${result?.status||'not assessed'}; evidence quality ${result?.evidenceQuality||'none'}; risk ${result?.riskSeverity||control.riskIfMissing}. Required evidence: ${control.evidenceRequirements.join('; ')}. Linked evidence: ${(result?.evidenceRefs||[]).map(x=>`${x.label} (${x.sourceType}:${x.sourceId})`).join('; ')||'none'}. Assessor note: ${result?.assessorNote||'none'}. ${finding?`Open finding: ${finding.title}. Recommendation: ${finding.recommendation}`:''}`,source:control.sourceTitle,asOf:result?.updatedAt||control.updatedAt,href:'/hr-diagnostic',dataQuality:'Control-level evidence linkage is validated for record existence where possible; legal applicability and compliance conclusions require qualified human review.',sensitivity:'aggregate'});}}
  return out.slice(0,8);
}
