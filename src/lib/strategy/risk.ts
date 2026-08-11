import type { StrategyRiskLevel } from '@/domain/strategy';
export function boundedFive(v:number){return Math.max(1,Math.min(5,Math.round(v)));}
export function capabilityRisk(impact:number,scarcity:number,current:number,required:number){const gap=Math.max(0,required-current),score=Math.min(5,Math.max(boundedFive(impact),boundedFive(scarcity),gap>=4?5:gap>=3?4:gap>=2?3:gap>=1?2:1));return{score,level:(score>=5?'critical':score>=4?'high':score>=3?'medium':'low') as StrategyRiskLevel};}
export function scenarioScore(benefit:number,risk:number,capability:number){return Math.max(0,Math.min(100,Math.round(50+benefit*7+capability*.25-risk*8)));}
export function readinessLevel(score:number):'emerging'|'developing'|'aligned'|'strategic'{return score>=85?'strategic':score>=70?'aligned':score>=50?'developing':'emerging';}
