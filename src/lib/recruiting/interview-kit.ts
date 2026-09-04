import type { Candidate, Requisition } from '@/domain/recruiting';
import type { AtsResumeReview } from '@/domain/ats';

export type InterviewQuestionType = 'core'|'behavioral'|'situational'|'technical'|'verification'|'candidate_questions';
export interface InterviewQuestionDraft {
  id: string;
  type: InterviewQuestionType;
  competency: string;
  question: string;
  probes: string[];
  expectedEvidence: string[];
  anchors: { rating: 1|3|5; description: string }[];
  standardized: boolean;
  source: 'requisition'|'ats_gap'|'system';
}

const clean = (v:string) => v.replace(/\s+/g,' ').trim();
const slug = (v:string) => clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48) || 'question';
const anchors = (competency:string) => ([
  { rating:1 as const, description:`Little or no job-related evidence for ${competency}; answer is vague, hypothetical, or unsupported.` },
  { rating:3 as const, description:`Relevant example with reasonable ownership and sufficient evidence for ${competency}.` },
  { rating:5 as const, description:`Specific, well-evidenced example showing strong judgment, ownership, measurable impact, trade-offs, and learning in ${competency}.` },
]);
function q(index:number,input:Omit<InterviewQuestionDraft,'id'|'anchors'>):InterviewQuestionDraft{return{...input,id:`q${index+1}_${slug(input.competency)}`,anchors:anchors(input.competency)}}

export function buildDeterministicInterviewKit(input:{requisition:Requisition;candidate:Candidate;review?:AtsResumeReview|null;interviewType:string}){
  const reqs=(input.requisition.requirements||[]).map(clean).filter(Boolean).slice(0,6);
  const gaps=(input.review?.gaps||[]).map(clean).filter(Boolean).slice(0,4);
  const missing=(input.review?.missingRequirements||[]).map(clean).filter(Boolean).slice(0,3);
  const questions:InterviewQuestionDraft[]=[];
  questions.push(q(questions.length,{type:'core',competency:'Role motivation and relevance',question:`What interests you about the ${input.requisition.title} role, and which parts of your documented experience are most relevant?`,probes:['Which responsibility would you be able to contribute to fastest?','What would you need to learn first?'],expectedEvidence:['Direct link between prior evidence and the role','Realistic understanding of the work','No unsupported claims'],standardized:true,source:'system'}));
  questions.push(q(questions.length,{type:'behavioral',competency:'Ownership and results',question:'Tell us about a piece of work you personally owned from planning through delivery. What was the objective, what did you do, and what was the result?',probes:['What was specifically your responsibility?','How did you measure success?','What would you do differently now?'],expectedEvidence:['Specific situation','Individual actions','Outcome or measurable result','Reflection and learning'],standardized:true,source:'system'}));
  reqs.forEach((r)=>questions.push(q(questions.length,{type:'core',competency:r.slice(0,100),question:`Please describe a specific example that demonstrates your capability with this role requirement: “${r}”.`,probes:['What did you personally do?','What evidence shows the outcome?'],expectedEvidence:['Job-related example','Candidate ownership','Outcome/evidence'],standardized:true,source:'requisition'})));
  if(!reqs.length) questions.push(q(questions.length,{type:'situational',competency:'Judgment',question:`Imagine you join as ${input.requisition.title} and inherit a priority that is behind schedule with incomplete information. How would you assess the situation and decide what to do first?`,probes:['What information would you seek?','How would you communicate trade-offs?'],expectedEvidence:['Structured problem solving','Risk awareness','Prioritization','Communication'],standardized:true,source:'system'}));
  [...missing,...gaps].slice(0,4).forEach((gap)=>questions.push(q(questions.length,{type:'verification',competency:'Evidence verification',question:`Your application does not yet provide clear evidence for: “${gap}”. What relevant experience, if any, can you describe?`,probes:['Please distinguish direct experience from exposure or training.','What evidence could verify your level of responsibility?'],expectedEvidence:['Truthful clarification','Direct versus indirect experience','No pressure to invent experience'],standardized:false,source:'ats_gap'})));
  if(['technical','structured','panel','final'].includes(input.interviewType)) questions.push(q(questions.length,{type:'technical',competency:'Role-specific problem solving',question:`Walk us through how you would approach a difficult ${input.requisition.title} problem where quality, time, and stakeholder expectations are in tension.`,probes:['What would you prioritize first?','What data or evidence would change your decision?'],expectedEvidence:['Role-relevant method','Trade-off reasoning','Evidence use','Stakeholder judgment'],standardized:true,source:'system'}));
  questions.push(q(questions.length,{type:'candidate_questions',competency:'Candidate questions',question:'What questions do you have for us about the role, team, expectations, or organization?',probes:[],expectedEvidence:['Candidate has a fair opportunity to ask questions'],standardized:true,source:'system'}));
  return questions.slice(0,14);
}
