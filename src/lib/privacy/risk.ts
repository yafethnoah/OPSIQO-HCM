import type { PrivacyRiskLevel } from '@/domain/privacy';
export function privacyRiskLevel(score:number):PrivacyRiskLevel { if(score>=20)return 'critical'; if(score>=12)return 'high'; if(score>=6)return 'medium'; return 'low'; }
export function fiveByFive(likelihood:number,impact:number){return Math.max(1,Math.min(5,likelihood))*Math.max(1,Math.min(5,impact));}
export function maxRisk(scores:number[]):PrivacyRiskLevel { return privacyRiskLevel(scores.length?Math.max(...scores):1); }
export function aiModelRiskScore(input:{privacyRisk:number;securityRisk:number;biasRisk:number;explainabilityRisk:number;humanOversightRisk:number}){
  const weighted=(input.privacyRisk*.25)+(input.securityRisk*.20)+(input.biasRisk*.20)+(input.explainabilityRisk*.15)+(input.humanOversightRisk*.20);
  return Math.max(1,Math.min(25,Math.round(weighted*5)));
}
