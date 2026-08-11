import type { OrgDesignRiskLevel } from '@/domain/org-design';
export function riskLevel(score:number):OrgDesignRiskLevel{return score>=75?'critical':score>=50?'high':score>=25?'medium':'low'}
export function median(values:number[]){if(!values.length)return 0;const v=[...values].sort((a,b)=>a-b),m=Math.floor(v.length/2);return v.length%2?v[m]!:Number(((v[m-1]!+v[m]!)/2).toFixed(2))}
export function structuralHealth(input:{activePositions:number;managerPositions:number;maxLayers:number;narrowSpanManagers:number;wideSpanManagers:number;orphanReportingLines:number;cycleCount:number;targetMaxLayers:number;targetManagementRatioPct:number}){
  if(input.activePositions<=0)return{score:0,riskLevel:'critical' as OrgDesignRiskLevel};
  const ratio=input.managerPositions/input.activePositions*100;let penalty=0;
  penalty+=Math.max(0,input.maxLayers-input.targetMaxLayers)*6;
  penalty+=input.narrowSpanManagers*3+input.wideSpanManagers*2;
  penalty+=input.orphanReportingLines*5+input.cycleCount*15;
  penalty+=Math.max(0,ratio-input.targetManagementRatioPct)*1.2;
  const score=Math.max(0,Math.min(100,Math.round(100-penalty)));
  return{score,riskLevel:riskLevel(100-score)};
}
export function scenarioScore(benefit:number,peopleRisk:number,complexity:number,savingsPct:number){return Math.max(0,Math.min(100,Math.round(55+benefit*7-Math.max(1,peopleRisk)*6-Math.max(1,complexity)*4+Math.max(-20,Math.min(30,savingsPct))*.7)))}
export function readinessLevel(score:number):'fragile'|'developing'|'effective'|'optimized'{return score>=85?'optimized':score>=70?'effective':score>=50?'developing':'fragile'}
export function kpiBreach(direction:'higher_better'|'lower_better'|'range',current:number,target:number,tolerance:number){if(direction==='higher_better')return current<target-tolerance;if(direction==='lower_better')return current>target+tolerance;return Math.abs(current-target)>tolerance}
