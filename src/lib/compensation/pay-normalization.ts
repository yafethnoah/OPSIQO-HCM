export type SupportedPayBasis='hourly'|'monthly_salary'|'annual_salary';

export interface PayNormalizationInput{
  payBasis:SupportedPayBasis;
  basePay:number;
  standardHoursPerWeek?:number;
  standardWeeksPerYear?:number;
  storedAnnualizedBasePay?:number;
}

export interface NormalizedPay{
  payBasis:SupportedPayBasis;
  basePay:number;
  hourlyRate:number;
  monthlyPay:number;
  annualPay:number;
  annualHours:number;
  standardHoursPerWeek:number;
  standardWeeksPerYear:number;
  conversionBasis:'explicit_schedule'|'policy_default'|'legacy_annualized';
}

const money=(n:number)=>Math.round((Number(n)||0)*100)/100;
const valid=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;

export function normalizePay(input:PayNormalizationInput):NormalizedPay{
  const explicitHours=valid(input.standardHoursPerWeek,1,168);
  const explicitWeeks=valid(input.standardWeeksPerYear,1,53);
  let hours=explicitHours?Number(input.standardHoursPerWeek):40;
  let weeks=explicitWeeks?Number(input.standardWeeksPerYear):52;
  let annualHours=hours*weeks;
  const base=money(input.basePay);

  let annual:number;
  let hourly:number;
  let monthly:number;
  let conversionBasis:NormalizedPay['conversionBasis']=
    explicitHours||explicitWeeks?'explicit_schedule':'policy_default';

  if(input.payBasis==='hourly'){
    hourly=base;
    annual=money(hourly*annualHours);
    monthly=money(annual/12);
    if(valid(input.storedAnnualizedBasePay,0,100_000_000)&&!explicitHours&&!explicitWeeks&&hourly>0){
      annual=money(Number(input.storedAnnualizedBasePay));
      monthly=money(annual/12);
      weeks=52;
      annualHours=annual/hourly;
      hours=annualHours/weeks;
      conversionBasis='legacy_annualized';
    }
  }else if(input.payBasis==='monthly_salary'){
    monthly=base;
    annual=money(monthly*12);
    hourly=money(annual/annualHours);
  }else{
    annual=base;
    monthly=money(annual/12);
    hourly=money(annual/annualHours);
  }

  return{
    payBasis:input.payBasis,
    basePay:base,
    hourlyRate:hourly,
    monthlyPay:monthly,
    annualPay:annual,
    annualHours:money(annualHours),
    standardHoursPerWeek:hours,
    standardWeeksPerYear:weeks,
    conversionBasis
  };
}

export function normalizeStoredCompensation(record:any):NormalizedPay{
  if(!record) return normalizePay({payBasis:'annual_salary',basePay:0});
  const payBasis:SupportedPayBasis=
    record.payBasis==='hourly'||record.payBasis==='monthly_salary'
      ?record.payBasis
      :'annual_salary';

  return normalizePay({
    payBasis,
    basePay:Number(record.basePay||0),
    standardHoursPerWeek:
      typeof record.standardHoursPerWeek==='number'?record.standardHoursPerWeek:undefined,
    standardWeeksPerYear:
      typeof record.standardWeeksPerYear==='number'?record.standardWeeksPerYear:undefined,
    storedAnnualizedBasePay:
      typeof record.annualizedBasePay==='number'?record.annualizedBasePay:undefined
  });
}

export function normalizeBandAmount(
  payBasis:SupportedPayBasis,
  amount:number,
  standardHoursPerWeek?:number,
  standardWeeksPerYear?:number
){
  return normalizePay({payBasis,basePay:amount,standardHoursPerWeek,standardWeeksPerYear});
}