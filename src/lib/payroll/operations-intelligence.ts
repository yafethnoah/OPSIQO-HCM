import type { PayrollCalendarRuleRecord, PayrollAnomaly } from '@/domain/comp-pay-operations';
import type { PayrollPayDateSource, PayrollRun, PayrollWorkerProfile } from '@/domain/payroll';
import { resolveWorkerPayDate } from './pay-date';

const money=(n:number)=>Math.round(Number(n||0)*100)/100;
const dateRx=/^\d{4}-\d{2}-\d{2}$/;

function shiftDate(date:string,days:number){
  if(!dateRx.test(date))return date;
  const d=new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}
function fixedDay(date:string,day:number){
  const d=new Date(`${date}T12:00:00Z`);
  const y=d.getUTCFullYear(),m=d.getUTCMonth();
  const last=new Date(Date.UTC(y,m+1,0,12)).getUTCDate();
  const v=Math.min(Math.max(Math.trunc(day||1),1),last);
  return `${y}-${String(m+1).padStart(2,'0')}-${String(v).padStart(2,'0')}`;
}
function previousWeekday(date:string){
  const d=new Date(`${date}T12:00:00Z`),day=d.getUTCDay();
  if(day===6)return shiftDate(date,-1);
  if(day===0)return shiftDate(date,-2);
  return date;
}
function nextWeekday(date:string){
  const d=new Date(`${date}T12:00:00Z`),day=d.getUTCDay();
  if(day===6)return shiftDate(date,2);
  if(day===0)return shiftDate(date,1);
  return date;
}

export function activeCalendarRules(rules:PayrollCalendarRuleRecord[],asOfDate:string){
  return rules.filter(r=>r.status==='active'&&r.effectiveDate<=asOfDate&&(!r.endDate||r.endDate>=asOfDate));
}

export function pickCalendarRule(
  rules:PayrollCalendarRuleRecord[],
  worker:any,
  asOfDate:string,
):PayrollCalendarRuleRecord|undefined{
  const active=activeCalendarRules(rules,asOfDate);
  const candidates=[
    active.find(r=>r.scope==='worker'&&r.targetId===worker.id),
    active.find(r=>r.scope==='pay_group'&&r.targetId&&r.targetId===worker.payGroupId),
    active.find(r=>r.scope==='org_unit'&&r.targetId&&r.targetId===(worker.orgUnitId||worker.departmentId)),
    active.find(r=>r.scope==='organization'),
  ].filter(Boolean) as PayrollCalendarRuleRecord[];
  return candidates[0];
}

export function resolveCalendarPayDate(defaultDate:string,rule?:PayrollCalendarRuleRecord){
  if(!rule)return {payDate:defaultDate,source:'organization run default'};
  let date=defaultDate;
  if(rule.rule==='offset_days')date=shiftDate(defaultDate,Number(rule.offsetDays||0));
  if(rule.rule==='fixed_day_of_month')date=fixedDay(defaultDate,Number(rule.dayOfMonth||1));
  if(rule.rule==='last_business_day')date=previousWeekday(fixedDay(defaultDate,31));
  if(rule.weekendAdjustment==='previous_weekday')date=previousWeekday(date);
  if(rule.weekendAdjustment==='next_weekday')date=nextWeekday(date);
  return {payDate:date,source:`${rule.scope} calendar`};
}

export function resolveAuthoritativeWorkerPayDate(
  run: Pick<PayrollRun, 'payDate' | 'workerPayDates'>,
  profile: PayrollWorkerProfile | undefined,
  worker: { id:string; payGroupId?:string; orgUnitId?:string; departmentId?:string },
  rules: PayrollCalendarRuleRecord[],
): { payDate:string; source:PayrollPayDateSource; label:string; calendarRuleId?:string } {
  const exact = run.workerPayDates?.[worker.id];
  if (exact) {
    const resolved = resolveWorkerPayDate(run, profile, worker.id);
    return { payDate: resolved.payDate, source: 'worker_override', label: 'Exact run override' };
  }

  const rule = pickCalendarRule(rules, worker, run.payDate);
  if (rule) {
    const resolved = resolveCalendarPayDate(run.payDate, rule);
    const sourceMap: Record<PayrollCalendarRuleRecord['scope'], PayrollPayDateSource> = {
      worker: 'worker_calendar',
      pay_group: 'pay_group_calendar',
      org_unit: 'org_unit_calendar',
      organization: 'organization_calendar',
    };
    const labelMap: Record<PayrollCalendarRuleRecord['scope'], string> = {
      worker: 'Worker calendar',
      pay_group: 'Pay-group calendar',
      org_unit: 'Org-unit calendar',
      organization: 'Organization calendar',
    };
    return {
      payDate: resolved.payDate,
      source: sourceMap[rule.scope],
      label: labelMap[rule.scope],
      calendarRuleId: rule.id,
    };
  }

  const fallback = resolveWorkerPayDate(
    { payDate: run.payDate, workerPayDates: undefined },
    profile,
    worker.id,
  );
  return {
    payDate: fallback.payDate,
    source: fallback.source,
    label: fallback.source === 'profile_rule' ? 'Legacy profile fallback' : 'Run default',
  };
}

export function previewRetro(input:{
  previousAnnualPay:number;
  newAnnualPay:number;
  payPeriodsPerYear:number;
  affectedPeriods:number;
}){
  const periods=Math.max(1,Math.trunc(input.payPeriodsPerYear||1));
  const affected=Math.max(0,Math.trunc(input.affectedPeriods||0));
  const perPeriodDelta=money((input.newAnnualPay-input.previousAnnualPay)/periods);
  const retroAmount=money(perPeriodDelta*affected);
  return {perPeriodDelta,retroAmount,affectedPeriods:affected};
}

export function detectStatementAnomalies(statements:any[],workers:any[]):PayrollAnomaly[]{
  const workerMap=new Map(workers.map(w=>[w.id,w]));
  const grouped=new Map<string,any[]>();
  for(const s of statements.filter(s=>s.status==='final'&&!s.reversedAt)){
    const rows=grouped.get(s.workerId)||[];
    rows.push(s);grouped.set(s.workerId,rows);
  }
  const out:PayrollAnomaly[]=[];
  for(const [workerId,rows] of grouped){
    rows.sort((a,b)=>String(b.payDate).localeCompare(String(a.payDate)));
    if(rows.length<2)continue;
    const current=rows[0],previous=rows[1],worker=workerMap.get(workerId);
    for(const metric of ['gross','net'] as const){
      const a=Number(previous[metric]||0),b=Number(current[metric]||0),delta=money(b-a);
      const pct=a?Math.round((delta/a)*1000)/10:0;
      if(Math.abs(pct)<25&&Math.abs(delta)<1000)continue;
      out.push({
        id:`${workerId}-${metric}-${current.runId}`,
        workerId,
        displayName:worker?.displayName||current.displayName||workerId,
        metric,
        previousAmount:a,
        currentAmount:b,
        delta,
        deltaPct:pct,
        severity:Math.abs(pct)>=50||Math.abs(delta)>=3000?'high':'warning',
        explained:false,
        explanation:'Material payroll variance requires review against approved compensation, time and adjustment evidence.',
        currentRunId:current.runId,
      });
    }
  }
  return out;
}

export function runStage(status:string){
  const map:Record<string,string>={
    draft:'Data Collection',
    calculated:'Calculation',
    review:'Variance Analysis / Payroll Review',
    approved:'Approved / Locked',
    exported:'Payment Preparation',
    reconciled:'Reconciliation Complete',
    completed:'Closed',
    reversed:'Reversed',
    cancelled:'Cancelled',
  };
  return map[status]||status;
}