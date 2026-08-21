import type { ActorContext } from '@/domain/security';
import type { NaturalAnalyticsAnswer, NaturalAnalyticsMetric } from '@/domain/opsiqo-one-v7-11';
import { ApiError } from '@/lib/http/errors';
import { peopleAnalyticsDashboard } from '@/lib/people-analytics/service';

const keys=[
  {re:/\bheadcount|employee count|workers?\b/i,key:'headcount'},
  {re:/\bfte\b/i,key:'fte'},
  {re:/\bturnover|attrition\b/i,key:'turnover'},
  {re:/\bvacanc|open position\b/i,key:'vacancies'},
  {re:/\bskill gap|skills?\b/i,key:'skillgaps'},
  {re:/\bcost|employer cost|payroll\b/i,key:'cost'},
];

export async function answerNaturalAnalytics(actor:ActorContext,question:string):Promise<NaturalAnalyticsAnswer>{
  if(!actor.permissions.includes('peopleanalytics.read'))throw new ApiError(403,'People Analytics permission required.','forbidden');
  const d=await peopleAnalyticsDashboard(actor),wanted=keys.filter(x=>x.re.test(question)).map(x=>x.key);
  const selected=d.headline.filter(x=>wanted.length===0||wanted.includes(x.key));
  const previous=d.history.length>1?d.history[d.history.length-2]:undefined,latest=d.latestSnapshot;
  const metrics:NaturalAnalyticsMetric[]=selected.map(item=>{
    const map:Record<string,string>={headcount:'workforce.headcount',fte:'workforce.fte',cost:'workforce.employer_cost',turnover:'lifecycle.turnover_ytd_pct',vacancies:'workforce.vacancies',skillgaps:'talent.verified_skill_gaps'};
    const metricCode=map[item.key],prev=previous?.metrics?.[metricCode],change=typeof prev==='number'?Number((item.value-prev).toFixed(2)):undefined;
    return{key:item.key,label:item.label,value:item.value,unit:item.unit as NaturalAnalyticsMetric['unit'],helper:item.helper,evidenceRef:`analyticsSnapshot:${latest.snapshotDate}:${metricCode}`,change};
  });
  const phrases=metrics.map(m=>`${m.label}: ${m.value}${m.unit==='percent'?'%':''}${m.change!==undefined?` (${m.change>=0?'+':''}${m.change} vs prior snapshot)`:''}`);
  return{question,summary:phrases.length?phrases.join(' · '):'No governed aggregate metric matched the question.',metrics,dataQualityScore:d.quality.score,warnings:[...d.quality.warnings],historyPoints:d.quality.historyPoints,generatedAt:new Date().toISOString(),governanceNotice:d.governanceNotice};
}
