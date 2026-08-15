import type { SuperAppAttentionItem,SuperAppAttentionSeverity,SuperAppPreference } from '@/domain/superapp';
const weight:Record<SuperAppAttentionSeverity,number>={critical:400,high:300,medium:200,info:100};
export function attentionScore(severity:SuperAppAttentionSeverity,dueAt?:string,count=1){
 let urgency=0;
 if(dueAt){const delta=new Date(dueAt).getTime()-Date.now();if(delta<0)urgency=80;else if(delta<=24*3600_000)urgency=60;else if(delta<=7*86400_000)urgency=30;}
 return weight[severity]+urgency+Math.min(Math.max(count,1),50);
}
export function sortAttention<T extends SuperAppAttentionItem>(items:T[]){return [...items].sort((a,b)=>b.priorityScore-a.priorityScore||a.title.localeCompare(b.title))}
export function sanitizePinned(ids:string[],allowedIds:Set<string>){return [...new Set(ids)].filter(x=>allowedIds.has(x)).slice(0,8)}
export function mutableSuperAppPreference(p:SuperAppPreference){return{homeMode:p.homeMode,pinnedActionIds:[...p.pinnedActionIds],compactMode:p.compactMode,locale:p.locale,timeZone:p.timeZone}}
export const superAppPrivacy={
 apiOfflineCache:false as const,
 documentOfflineCache:false as const,
 payrollOfflineCache:false as const,
 staticAssetCacheOnly:true as const,
 consequentialApprovalByConcierge:false as const
};
export function assessedTeamCompliance(rows:Array<{workerId?:string;score?:number}>,teamTotal:number){
 const byWorker=new Map<string,number>();for(const row of rows){const id=String(row.workerId||'').trim();if(id)byWorker.set(id,Number(row.score||0))}
 const assessed=byWorker.size,rate=assessed?Math.round([...byWorker.values()].reduce((n,x)=>n+x,0)/assessed):undefined;
 return{rate,assessed,total:teamTotal,state:assessed===0?'not_assessed' as const:assessed<teamTotal?'partial' as const:'available' as const};
}
