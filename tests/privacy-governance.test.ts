import { describe, expect, it } from 'vitest';
import { aiModelRiskScore, fiveByFive, privacyRiskLevel } from '@/lib/privacy/risk';

describe('v2.6 privacy and AI assurance risk controls',()=>{
  it('uses deterministic 5x5 risk scoring',()=>{expect(fiveByFive(3,4)).toBe(12);expect(privacyRiskLevel(12)).toBe('high');expect(privacyRiskLevel(20)).toBe('critical');});
  it('keeps AI model-risk scoring bounded and risk-sensitive',()=>{const low=aiModelRiskScore({privacyRisk:1,securityRisk:1,biasRisk:1,explainabilityRisk:1,humanOversightRisk:1});const high=aiModelRiskScore({privacyRisk:5,securityRisk:5,biasRisk:5,explainabilityRisk:5,humanOversightRisk:5});expect(low).toBeGreaterThanOrEqual(1);expect(high).toBeLessThanOrEqual(25);expect(high).toBeGreaterThan(low);});
});
