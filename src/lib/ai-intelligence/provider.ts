import type { AiCopilotAnswer, AiEvidenceItem, AiProvider, AiModelProfile } from '@/domain/ai-intelligence';
import { ApiError } from '@/lib/http/errors';
import { getAdminApp } from '@/lib/firebase/admin';
import { aiCopilotAnswerSchema } from './schemas';

export interface AiProviderRequest { question:string; systemInstruction:string; evidence:AiEvidenceItem[]; }
export interface AiProviderResult { answer:AiCopilotAnswer; provider:AiProvider; model:string; }
const schema={type:'object',additionalProperties:false,properties:{summary:{type:'string'},findings:{type:'array',items:{type:'string'},maxItems:8},citations:{type:'array',items:{type:'object',additionalProperties:false,properties:{evidenceId:{type:'string'},claim:{type:'string'}},required:['evidenceId','claim']},maxItems:16},recommendations:{type:'array',items:{type:'object',additionalProperties:false,properties:{id:{type:'string'},type:{type:'string',enum:['investigate','review','analyze','communicate','plan','monitor']},title:{type:'string'},rationale:{type:'string'},evidenceIds:{type:'array',items:{type:'string'}},priority:{type:'string',enum:['low','medium','high']},suggestedOwnerRole:{anyOf:[{type:'string'},{type:'null'}]},suggestedDueDays:{anyOf:[{type:'integer',minimum:1,maximum:365},{type:'null'}]}},required:['id','type','title','rationale','evidenceIds','priority','suggestedOwnerRole','suggestedDueDays']},maxItems:6},limitations:{type:'array',items:{type:'string'},maxItems:8},confidence:{type:'integer',minimum:0,maximum:100},evidenceCompleteness:{type:'integer',minimum:0,maximum:100},requiresHumanDecision:{type:'boolean'}},required:['summary','findings','citations','recommendations','limitations','confidence','evidenceCompleteness','requiresHumanDecision']};
function prompt(req:AiProviderRequest){return `${req.systemInstruction}\n\nUSER QUESTION:\n${req.question}\n\nRETRIEVED OPSIQO EVIDENCE (cite ONLY these evidenceId values):\n${JSON.stringify(req.evidence,null,2)}\n\nRules: Never invent evidence. If evidence is insufficient, say so. Recommendations must be non-consequential analysis/review/planning actions only. Never choose a person for hiring, firing, promotion, compensation, discipline, accommodation or succession. Never declare legal compliance or non-compliance; distinguish evidence-backed control status from qualified legal conclusions.`;}
function parseAnswer(text:string):AiCopilotAnswer{try{return aiCopilotAnswerSchema.parse(JSON.parse(text)) as AiCopilotAnswer}catch{throw new ApiError(502,'AI provider returned invalid structured output.','ai_invalid_output')}}
function sanitizeGeminiError(raw:string){
  let message=raw;
  try{const parsed=JSON.parse(raw);message=String(parsed?.error?.message||parsed?.error?.status||raw);}catch{}
  return message
    .replace(/AIza[A-Za-z0-9_-]{20,}/g,'[REDACTED_GOOGLE_KEY]')
    .replace(/Bearer\s+[^\s"']+/gi,'Bearer [REDACTED]')
    .replace(/[?&]key=[^&\s"']+/gi,'?key=[REDACTED]')
    .slice(0,500);
}
async function geminiFailure(response:Response){return sanitizeGeminiError(await response.text().catch(()=>''));}
function reportGeminiFailure(status:number,model:string,phase:'schema'|'fallback',detail:string){
  console.error('OPSIQO_AI_PROVIDER_FAILURE',JSON.stringify({provider:'gemini',status,model,phase,detail}));
}
async function openai(req:AiProviderRequest,profile:AiModelProfile):Promise<AiProviderResult>{const key=process.env.OPENAI_API_KEY;if(!key)throw new ApiError(503,'OPENAI_API_KEY is not configured.','ai_provider_not_configured');const model=profile.model;const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,store:false,input:prompt(req),text:{format:{type:'json_schema',name:'opsiqo_hr_copilot_answer',strict:true,schema}}})});if(!r.ok)throw new ApiError(502,`OpenAI request failed (${r.status}).`,'ai_provider_failed');const j:any=await r.json();const text=String(j.output_text||j.output?.flatMap((x:any)=>x.content||[]).find((x:any)=>x.type==='output_text')?.text||'');return{answer:parseAnswer(text),provider:'openai',model};}
let cachedVertexToken:{accessToken:string;expiresAt:number}|undefined;
async function vertexAccessToken(){
  if(cachedVertexToken&&cachedVertexToken.expiresAt>Date.now()+60000)return cachedVertexToken.accessToken;
  const credential=getAdminApp().options.credential;
  if(!credential)throw new ApiError(503,'Google Cloud credentials are unavailable for AI enhancement.','ai_provider_not_configured');
  const token=await credential.getAccessToken();
  const accessToken=String(token?.access_token||'');
  if(!accessToken)throw new ApiError(503,'Google Cloud access token could not be obtained for AI enhancement.','ai_provider_not_configured');
  cachedVertexToken={accessToken,expiresAt:Date.now()+Math.max(60,Number(token?.expires_in||3600)-120)*1000};
  return accessToken;
}
async function geminiApiKey(req:AiProviderRequest,profile:AiModelProfile):Promise<AiProviderResult>{
  const key=process.env.GEMINI_API_KEY;
  if(!key)throw new ApiError(503,'Gemini API-key transport is not configured.','ai_provider_not_configured');
  const model=profile.model,url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const contents=[{role:'user',parts:[{text:prompt(req)}]}];
  const request=(generationConfig:Record<string,unknown>)=>fetch(url,{method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({contents,generationConfig})});
  let r=await request({responseMimeType:'application/json',responseSchema:schema});
  if(!r.ok&&r.status===400){
    const detail=await geminiFailure(r);
    console.warn('OPSIQO_AI_SCHEMA_FALLBACK',JSON.stringify({provider:'gemini',transport:'api_key',status:r.status,model,phase:'schema',detail}));
    r=await request({responseMimeType:'application/json'});
  }
  if(!r.ok){
    const detail=await geminiFailure(r);
    reportGeminiFailure(r.status,model,'fallback',detail);
    const safeCode=r.status===402?'ai_provider_billing_unavailable':r.status===429?'ai_provider_rate_limited':'ai_provider_failed';
    throw new ApiError(503,'AI enhancement is temporarily unavailable.',safeCode);
  }
  const j:any=await r.json();
  const text=String(j.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||'').join('')||'');
  return{answer:parseAnswer(text),provider:'gemini',model};
}
async function geminiVertex(req:AiProviderRequest,profile:AiModelProfile):Promise<AiProviderResult>{
  const project=String(process.env.GOOGLE_CLOUD_PROJECT||process.env.FIREBASE_PROJECT_ID||process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||'').trim();
  if(!project)throw new ApiError(503,'Google Cloud project configuration is unavailable for AI enhancement.','ai_provider_not_configured');
  const location=String(process.env.OPSIQO_VERTEX_AI_LOCATION||'global').trim();
  const token=await vertexAccessToken();
  const model=profile.model;
  const url=`https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
  const contents=[{role:'user',parts:[{text:prompt(req)}]}];
  const request=(generationConfig:Record<string,unknown>)=>fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({contents,generationConfig})});
  let r=await request({responseMimeType:'application/json',responseSchema:schema,maxOutputTokens:32768});
  if(!r.ok&&r.status===400){
    const detail=await geminiFailure(r);
    console.warn('OPSIQO_AI_SCHEMA_FALLBACK',JSON.stringify({provider:'gemini',transport:'vertex',status:r.status,model,phase:'schema',detail}));
    r=await request({responseMimeType:'application/json',maxOutputTokens:32768});
  }
  if(!r.ok){
    const detail=await geminiFailure(r);
    reportGeminiFailure(r.status,model,'fallback',detail);
    throw new ApiError(503,'AI enhancement is temporarily unavailable.','ai_provider_failed');
  }
  const j:any=await r.json();
  const text=String(j.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||'').join('')||'');
  return{answer:parseAnswer(text),provider:'gemini',model};
}
async function gemini(req:AiProviderRequest,profile:AiModelProfile):Promise<AiProviderResult>{
  const transport=String(process.env.OPSIQO_GEMINI_TRANSPORT||process.env.OPSIQO_RECRUITING_GEMINI_TRANSPORT||'auto').trim().toLowerCase();
  if(transport==='vertex')return geminiVertex(req,profile);
  if(transport==='google_api_key'||transport==='api_key')return geminiApiKey(req,profile);
  if(transport!=='auto')throw new ApiError(503,'Unsupported Gemini transport configuration.','ai_provider_not_configured');
  try{
    return await geminiVertex(req,profile);
  }catch(vertexError){
    console.warn('OPSIQO_AI_VERTEX_FALLBACK',JSON.stringify({provider:'gemini',model:profile.model,code:String((vertexError as any)?.code||'vertex_failed')}));
    if(!process.env.GEMINI_API_KEY)throw vertexError;
    return geminiApiKey(req,profile);
  }
}
function demo(req:AiProviderRequest,profile:AiModelProfile):AiProviderResult{const first=req.evidence.slice(0,5);const findings=first.map(e=>e.summary);return{provider:'demo',model:profile.model,answer:{summary:first.length?`OPSIQO found ${first.length} relevant governed evidence item(s). This demo response summarizes evidence without calling an external model.`:'OPSIQO does not have enough governed evidence to answer this question.',findings,citations:first.map(e=>({evidenceId:e.id,claim:e.summary})),recommendations:first.length?[{id:'rec-1',type:'review',title:'Review the cited workforce evidence',rationale:'A human review should confirm context and determine any consequential next step.',evidenceIds:first.map(e=>e.id),priority:'medium',suggestedOwnerRole:'hr_admin',suggestedDueDays:14}]:[],limitations:['Demo provider: no external model was called.','Any consequential employment decision requires independent human review.'],confidence:first.length?70:10,evidenceCompleteness:first.length?70:0,requiresHumanDecision:true}};}
export async function generateAiAnswer(req:AiProviderRequest,profile:AiModelProfile):Promise<AiProviderResult>{if(profile.provider==='openai')return openai(req,profile);if(profile.provider==='gemini')return gemini(req,profile);return demo(req,profile);}
