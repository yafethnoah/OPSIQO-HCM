import type { ActorContext } from '@/domain/security';
import type { IntelligentFormPreview } from '@/domain/opsiqo-one-v7-11';
import { superAppDashboard } from '@/lib/superapp/service';

const field=(id:string,label:string,value:string|number|undefined,required:boolean,explanation:string,source?:string)=>({id,label,value,required,status:value!==undefined&&value!==''?'prefilled' as const:required?'missing' as const:'optional' as const,source:value!==undefined&&value!==''?source:undefined,explanation});

export async function intelligentFormPreview(actor:ActorContext,kind:IntelligentFormPreview['kind']):Promise<IntelligentFormPreview>{
  const home=await superAppDashboard(actor);
  const employee=home.employee,assignment=employee.assignment;
  const common=[
    field('employee','Employee',employee.worker?.displayName,false,'Uses the authenticated worker link; never inferred from free text.','Authenticated OPSIQO profile'),
    field('position','Current position',assignment?.positionTitle,false,'Current primary assignment context when available.','Current assignment'),
    field('orgUnit','Organization unit',assignment?.orgUnitName,false,'Current organization-unit context when available.','Current assignment'),
  ];
  let title='',fields=common,note='OPSIQO fills only values it already knows from governed records. Required unknowns remain blank for human completion.';
  if(kind==='leave_request'){
    title='Intelligent leave request';
    fields=[...common,field('leaveType','Leave type',undefined,true,'Required because entitlement and approval rules depend on the selected leave type.'),field('startDate','Start date',undefined,true,'Required to validate entitlement, schedule and overlaps.'),field('endDate','End date',undefined,true,'Required to validate entitlement, schedule and overlaps.'),field('available','Currently available hours',employee.leave.availableHours,false,'Current balance is context only; the Time & Leave service remains authoritative at submission.','Time & Leave')];
  }else if(kind==='onboarding'){
    title='Intelligent onboarding preparation';
    fields=[field('legalFirstName','Legal first name',undefined,true,'Required employee identity field.'),field('legalLastName','Legal last name',undefined,true,'Required employee identity field.'),field('workEmail','Work email',undefined,true,'Required governed employee contact field.'),field('employmentType','Employment type',undefined,true,'Required to select the correct employment workflow.'),field('hireDate','Hire date',undefined,true,'Required for effective dating and onboarding timing.'),field('position','Approved position',undefined,true,'Must reference an approved position; AI does not invent a position.')];
  }else if(kind==='position'){
    title='Intelligent position preparation';
    fields=[field('title','Position title',undefined,true,'Required position identity.'),field('orgUnit','Organization unit',assignment?.orgUnitName,true,'Uses current context only as a suggestion and must be reviewed.','Current assignment context'),field('fte','FTE',1,true,'Defaults to 1.0 for review; authoritative capacity rules run on save.','OPSIQO default'),field('status','Status','open',true,'Prepared as open for review; no record is created from this preview.','OPSIQO default')];
  }else if(kind==='workflow'){
    title='Intelligent workflow preparation';
    fields=[field('name','Workflow name',undefined,true,'Required human-readable workflow identity.'),field('trigger','Trigger',undefined,true,'Defines when the governed workflow can start.'),field('approvals','Approval checkpoints',undefined,true,'Human approval checkpoints are required for consequential actions.'),field('actions','Actions',undefined,true,'Actions must resolve to registered OPSIQO domain services.')];
  }else{
    title='Intelligent HR service request';
    fields=[...common,field('service','Service category',undefined,true,'Selects the HR service SLA and routing rules.'),field('subject','Subject',undefined,true,'Short description of the requested outcome.'),field('description','Description',undefined,true,'Only information HR needs to act should be provided.')];
  }
  return{kind,title,fields,knownCount:fields.filter(x=>x.status==='prefilled').length,missingRequiredCount:fields.filter(x=>x.status==='missing').length,note};
}
