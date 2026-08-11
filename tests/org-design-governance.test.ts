import { describe,expect,it } from 'vitest';import { kpiBreach,readinessLevel,scenarioScore,structuralHealth } from '@/lib/org-design/risk';
describe('organization design governance',()=>{
 it('penalizes structural complexity and broken reporting lines',()=>{const healthy=structuralHealth({activePositions:100,managerPositions:15,maxLayers:6,narrowSpanManagers:1,wideSpanManagers:0,orphanReportingLines:0,cycleCount:0,targetMaxLayers:8,targetManagementRatioPct:20});const weak=structuralHealth({activePositions:100,managerPositions:35,maxLayers:12,narrowSpanManagers:15,wideSpanManagers:4,orphanReportingLines:3,cycleCount:2,targetMaxLayers:8,targetManagementRatioPct:20});expect(healthy.score).toBeGreaterThan(weak.score);expect(weak.riskLevel).toBe('critical')});
 it('scores scenarios with benefit, risk, complexity and savings',()=>{expect(scenarioScore(5,1,1,20)).toBeGreaterThan(scenarioScore(2,5,5,-10))});
 it('detects KPI breaches by direction',()=>{expect(kpiBreach('higher_better',70,80,5)).toBe(true);expect(kpiBreach('lower_better',9,10,2)).toBe(false);expect(kpiBreach('range',12,10,1)).toBe(true)});
 it('bounds readiness maturity labels',()=>{expect(readinessLevel(49)).toBe('fragile');expect(readinessLevel(70)).toBe('effective');expect(readinessLevel(85)).toBe('optimized')});
});
