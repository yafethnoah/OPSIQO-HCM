export interface StandardHrServiceBlueprint {
  code: string;
  name: string;
  description: string;
  category: string;
  defaultPriority: 'low'|'normal'|'high'|'urgent';
  firstResponseHours: number;
  resolutionHours: number;
  requesterCanView: boolean;
}

export const STANDARD_HR_SERVICE_BLUEPRINTS: StandardHrServiceBlueprint[] = [
  { code:'PERSONAL_INFO_CHANGE', name:'Personal information change', description:'Request a governed change to personal details such as address, phone, preferred name or emergency contact. Supporting evidence may be requested before authoritative HR data is updated.', category:'personal_information', defaultPriority:'normal', firstResponseHours:8, resolutionHours:48, requesterCanView:true },
  { code:'EMPLOYMENT_LETTER', name:'Employment letter / verification', description:'Request an employment confirmation, job letter or other standard employment verification document.', category:'employment_documents', defaultPriority:'normal', firstResponseHours:8, resolutionHours:48, requesterCanView:true },
  { code:'BENEFITS_SUPPORT', name:'Benefits support or change', description:'Ask a benefits question or request a benefits-related change. Eligibility and provider rules remain authoritative.', category:'benefits', defaultPriority:'normal', firstResponseHours:8, resolutionHours:72, requesterCanView:true },
  { code:'PAYROLL_QUESTION', name:'Payroll or pay question', description:'Report a payroll concern, pay discrepancy or request clarification about pay-related information.', category:'payroll', defaultPriority:'high', firstResponseHours:4, resolutionHours:48, requesterCanView:true },
  { code:'EXPENSE_REIMBURSEMENT', name:'Expense / reimbursement request', description:'Submit an employee expense or reimbursement service request. Financial approval and evidence requirements remain governed by organization policy.', category:'expenses', defaultPriority:'normal', firstResponseHours:8, resolutionHours:72, requesterCanView:true },
  { code:'SCHEDULE_CHANGE', name:'Schedule change request', description:'Request a change to your work schedule or working arrangement. Manager and policy approval may be required.', category:'work_schedule', defaultPriority:'normal', firstResponseHours:8, resolutionHours:72, requesterCanView:true },
  { code:'REMOTE_WORK_REQUEST', name:'Remote / hybrid work request', description:'Request a temporary or recurring remote/hybrid working arrangement subject to organization policy and manager approval.', category:'work_arrangement', defaultPriority:'normal', firstResponseHours:8, resolutionHours:72, requesterCanView:true },
  { code:'EQUIPMENT_ACCESS', name:'Equipment or system access request', description:'Request equipment, software, system access or workplace resources. Fulfillment may route to IT, facilities or another responsible team.', category:'equipment_access', defaultPriority:'normal', firstResponseHours:8, resolutionHours:96, requesterCanView:true },
  { code:'TRAINING_SUPPORT', name:'Training / learning support', description:'Request learning access, training support, certification guidance or development assistance.', category:'learning', defaultPriority:'normal', firstResponseHours:8, resolutionHours:72, requesterCanView:true },
  { code:'CAREER_SUPPORT', name:'Career development support', description:'Request career-development guidance, mentoring support, development planning or internal mobility assistance.', category:'career', defaultPriority:'normal', firstResponseHours:16, resolutionHours:120, requesterCanView:true },
  { code:'WORKPLACE_CONCERN', name:'Workplace concern', description:'Raise a workplace concern for appropriate HR triage. Do not use this service for an immediate emergency; follow the organization emergency process.', category:'employee_relations', defaultPriority:'high', firstResponseHours:4, resolutionHours:72, requesterCanView:true },
  { code:'GENERAL_HR', name:'General HR support', description:'Request HR assistance when no other published service fits your need.', category:'general_hr', defaultPriority:'normal', firstResponseHours:8, resolutionHours:72, requesterCanView:true },
];
