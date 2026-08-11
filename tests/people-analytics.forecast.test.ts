import { describe,it,expect } from 'vitest';
import { forecastMonthlySeries } from '../src/lib/people-analytics/forecast';
describe('People Analytics forecast governance',()=>{
 it('projects a deterministic linear trend with bounded evidence',()=>{const series=[1,2,3,4,5,6].map((value,i)=>({period:`2026-${String(i+1).padStart(2,'0')}`,value}));const r=forecastMonthlySeries(series,{metricCode:'workforce.headcount',modelType:'linear_trend',horizonPeriods:2,confidenceLevel:0.95});expect(r.forecast[0].value).toBe(7);expect(r.forecast[1].value).toBe(8);expect(r.forecast.every(p=>p.lower>=0)).toBe(true);});
 it('uses a rolling average without inventing negative count values',()=>{const series=[10,8,6,4].map((value,i)=>({period:`2026-${String(i+1).padStart(2,'0')}`,value}));const r=forecastMonthlySeries(series,{metricCode:'workforce.headcount',modelType:'rolling_average',rollingWindow:2,horizonPeriods:1,confidenceLevel:0.8});expect(r.forecast[0].value).toBe(5);expect(r.forecast[0].lower).toBeGreaterThanOrEqual(0);});
 it('caps percentage forecasts at 100',()=>{const series=[90,95,100,105].map((value,i)=>({period:`2026-${String(i+1).padStart(2,'0')}`,value}));const r=forecastMonthlySeries(series,{metricCode:'lifecycle.turnover_ytd_pct',modelType:'linear_trend',horizonPeriods:3,confidenceLevel:0.95});expect(Math.max(...r.forecast.map(p=>p.value))).toBeLessThanOrEqual(100);});
});
