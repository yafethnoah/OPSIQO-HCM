import type { ResilienceRiskLevel } from '@/domain/resilience';
export function boundedFive(v:number){return Math.max(1,Math.min(5,Math.round(v)));}
export function impactRisk(...values:number[]){const score=Math.max(...values.map(boundedFive),1);return {score,level:(score>=5?'critical':score>=4?'high':score>=3?'medium':'low') as ResilienceRiskLevel};}
export function coverageRisk(minimum:number,current:number,successors:number,singlePoint:boolean):ResilienceRiskLevel{if(current<=0||singlePoint&&successors<=0)return'critical';if(current<minimum||successors<=0)return'high';if(current===minimum||successors===1)return'medium';return'low';}
export function readinessLevel(score:number):'fragile'|'developing'|'managed'|'resilient'{return score>=85?'resilient':score>=70?'managed':score>=50?'developing':'fragile';}
