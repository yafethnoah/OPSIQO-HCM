import type { GovernanceRiskLevel } from '@/domain/governance';
export function governanceRiskLevel(score:number):GovernanceRiskLevel { if(score>=20)return 'critical'; if(score>=12)return 'high'; if(score>=6)return 'medium'; return 'low'; }
