import type { ActorContext } from '@/domain/security';
import type { ContextEvidence, GovernedContextBundle, IntelligenceSensitivity } from '@/domain/intelligence-control-plane';
import { retrieveAiEvidence } from '@/lib/ai-intelligence/evidence';
import { assessUntrustedContent } from './agentic-security';

const rank:{[K in IntelligenceSensitivity]:number}={public:0,internal:1,confidential:2,restricted:3};
function actorCeiling(actor:ActorContext):IntelligenceSensitivity{if(['super_admin','org_admin','hr_admin'].includes(actor.role))return'restricted';if(actor.role==='hr_partner')return'confidential';return'internal';}
function inferSensitivity(source:string):IntelligenceSensitivity{if(/privacy|security|identity|employee relations|medical|accommodation/i.test(source))return'confidential';return'internal';}
export async function buildGovernedContext(actor:ActorContext,input:{purpose:string;question:string;allowedDomains?:string[];maxItems?:number;maxCharacters?:number;sensitivityCeiling?:IntelligenceSensitivity}):Promise<GovernedContextBundle>{
  const maxItems=Math.max(1,Math.min(80,input.maxItems||35)),maxCharacters=Math.max(1000,Math.min(60000,input.maxCharacters||24000)),ceiling=input.sensitivityCeiling||actorCeiling(actor),raw=await retrieveAiEvidence(actor,input.question);let denied=0,used=0;const evidence:ContextEvidence[]=[];
  for(const item of raw){const sensitivity=inferSensitivity(item.source),security=assessUntrustedContent(`${item.title}\n${item.summary}\n${item.dataQuality||''}`);if(rank[sensitivity]>rank[ceiling]||!security.allowed){denied++;continue;}const size=security.sanitizedText.length;if(evidence.length>=maxItems||used+size>maxCharacters)break;used+=size;evidence.push({id:item.id,title:item.title,summary:security.sanitizedText.split('\n')[1]||item.summary,source:item.source,href:item.href,asOf:item.asOf,confidence:Math.max(0,Math.min(100,typeof (item as any).confidence==='number'?(item as any).confidence:85)),verificationStatus:'verified',sensitivity});}
  const completeness=raw.length?Math.round(evidence.length/raw.length*100):0;return{purpose:input.purpose.trim().slice(0,400),organizationId:actor.orgId,actorRole:actor.role,evidence,allowedDomains:(input.allowedDomains||[]).slice(0,30),deniedEvidence:denied,evidenceCompleteness:completeness,generatedAt:new Date().toISOString(),limits:{maxItems,maxCharacters}};
}
