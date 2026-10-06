import type { HRFormField } from '@/modules/hr-forms-workflows';
import type { StudioIntent } from './studio-schemas';

export type Blueprint = {
  codePrefix:string;
  title:string;
  category:string;
  subcategory?:string;
  sensitivity:'public'|'internal'|'confidential'|'restricted';
  fields:HRFormField[];
  workflowHint?:string;
};

const section=(id:string,label:string,children:HRFormField[],helpText?:string):HRFormField=>({id,kind:'section',label,helpText,children});
const text=(id:string,label:string,required=true,helpText?:string):HRFormField=>({id,kind:'text',label,required,helpText});
const area=(id:string,label:string,required=false,helpText?:string):HRFormField=>({id,kind:'textarea',label,required,helpText});
const date=(id:string,label:string,required=true):HRFormField=>({id,kind:'date',label,required});
const yesno=(id:string,label:string,required=true,helpText?:string):HRFormField=>({id,kind:'yes_no',label,required,helpText});
const ack=(id:string,label:string,required=true,helpText?:string):HRFormField=>({id,kind:'acknowledgement',label,required,helpText});
const sig=(id:string,label:string,required=true):HRFormField=>({id,kind:'signature',label,required,sensitivity:'confidential'});
const employee=(id:string,label:string,required=true):HRFormField=>({id,kind:'employee_selector',label,required,sensitivity:'confidential'});
const candidate=(id:string,label:string,required=true):HRFormField=>({id,kind:'candidate_selector',label,required,sensitivity:'confidential'});
const scale=(id:string,label:string,weight:number,anchors?:Record<string,string>):HRFormField=>({id,kind:'scale_1_5',label,required:true,scoring:{enabled:true,min:1,max:5,weight,anchors:anchors||{'1':'Insufficient evidence','3':'Meets expectations','5':'Strong, specific evidence'}}});
const instruction=(id:string,label:string,helpText?:string):HRFormField=>({id,kind:'instruction',label,helpText});
const table=(id:string,label:string,helpText?:string):HRFormField=>({id,kind:'repeating_rows',label,helpText});

const commonHeader=(subjectLabel='Employee / subject'):HRFormField[]=>[
  section('document_control','Document Control',[
    text('form_reference','Reference number',false,'Generated or assigned by OPSIQO.'),
    date('form_date','Form date',true),
    text('department','Department / program',false),
    text('location','Work location',false),
  ]),
  section('subject_information','Subject Information',[
    employee('subject_worker',subjectLabel,false),
    text('subject_name','Full name',false),
    text('position_title','Position / role title',false),
    text('manager_name','Manager / supervisor',false),
  ])
];

export function employeeInformationBlueprint():Blueprint{
  return{codePrefix:'HR-EMP',title:'Employee Information Form',category:'General HR',sensitivity:'confidential',fields:[
    section('employee_identity','Employee Information',[
      text('legal_name','Legal name'),text('preferred_name','Preferred name',false),
      text('personal_email','Personal email'),text('phone','Phone number'),
      text('address','Home address'),text('emergency_contact_name','Emergency contact name'),
      text('emergency_contact_relationship','Emergency contact relationship'),
      text('emergency_contact_phone','Emergency contact phone'),
    ]),
    section('employment_information','Employment Information',[
      text('position_title','Position title'),text('department','Department / program'),
      text('manager','Manager / supervisor'),date('start_date','Start date'),
      text('employment_type','Employment type'),text('work_location','Primary work location'),
    ]),
    section('employee_confirmation','Employee Confirmation',[
      ack('accuracy_ack','I confirm the information provided is accurate and I will notify HR of material changes.'),
      sig('employee_signature','Employee signature'),date('employee_signature_date','Date'),
    ])
  ]};
}

export function emergencyContactBlueprint():Blueprint{
  return{codePrefix:'HR-EMG',title:'Emergency Contact Form',category:'General HR',sensitivity:'restricted',fields:[
    ...commonHeader(),
    section('primary_contact','Primary Emergency Contact',[
      text('primary_name','Full name'),text('primary_relationship','Relationship'),
      text('primary_phone','Primary phone'),text('primary_alt_phone','Alternate phone',false),
    ]),
    section('secondary_contact','Secondary Emergency Contact',[
      text('secondary_name','Full name',false),text('secondary_relationship','Relationship',false),
      text('secondary_phone','Phone',false),
    ]),
    section('confirmation','Confirmation',[sig('employee_signature','Employee signature'),date('signed_date','Date')])
  ]};
}

export function policyAcknowledgementBlueprint():Blueprint{
  return{codePrefix:'HR-ACK',title:'Policy Acknowledgement Form',category:'Compliance',sensitivity:'confidential',fields:[
    ...commonHeader(),
    section('policy_details','Policy / Document',[
      text('policy_title','Policy title'),text('policy_version','Version / effective date',false),
      ack('read_ack','I confirm that I received, read and understood the policy or document identified above.'),
      ack('questions_ack','I understand where to ask questions or request clarification.'),
      ack('compliance_ack','I understand my responsibility to follow the approved policy while it is in effect.'),
    ]),
    section('signoff','Acknowledgement',[sig('employee_signature','Employee signature'),date('signed_date','Date')])
  ]};
}

export function equipmentAssignmentBlueprint():Blueprint{
  return{codePrefix:'HR-EQP',title:'Equipment & Property Assignment Form',category:'Onboarding',sensitivity:'confidential',fields:[
    ...commonHeader(),
    section('assigned_items','Assigned Company Property',[
      table('equipment_rows','Equipment / property','Record item, asset tag or serial number, condition, date issued and return requirement.'),
      area('equipment_notes','Notes',false),
    ]),
    section('responsibility','Employee Responsibility',[
      ack('care_ack','I acknowledge receipt of the listed organization property and will take reasonable care of it.'),
      ack('return_ack','I will return organization property when requested or when my assignment/employment ends.'),
      sig('employee_signature','Employee signature'),date('signed_date','Date'),
    ]),
    section('hr_control','HR / Operations Use Only',[
      employee('issued_by','Issued by',false),date('issued_date','Issued date',false),
      yesno('record_updated','Asset/equipment register updated?',false)
    ])
  ]};
}

export function accessRequestBlueprint():Blueprint{
  return{codePrefix:'HR-ACC',title:'System & Access Request Form',category:'Onboarding',sensitivity:'restricted',fields:[
    ...commonHeader(),
    section('access_requirements','Required Access',[
      table('systems','Systems / applications requested','Record system, requested role/access level, business need and approver.'),
      area('special_access','Privileged or special access justification',false),
    ]),
    section('approval','Approval & Provisioning',[
      employee('manager_approver','Manager approver'),employee('system_owner','System / data owner',false),
      yesno('least_privilege_review','Least-privilege access reviewed?'),yesno('mfa_required','MFA requirement confirmed?',false),
      date('access_start','Access start date'),date('access_end','Access end / review date',false),
      sig('approver_signature','Approver signature')
    ])
  ]};
}

export function orientationChecklistBlueprint():Blueprint{
  return{codePrefix:'HR-ORI',title:'New Hire Orientation Checklist',category:'Onboarding',sensitivity:'confidential',fields:[
    ...commonHeader(),
    section('before_start','Before First Day',[
      ack('workspace_ready','Workspace/equipment prepared',false),ack('accounts_ready','Required accounts/access prepared',false),
      ack('manager_plan_ready','Manager first-week plan prepared',false),
    ]),
    section('first_day','First Day',[
      ack('welcome','Welcome and organization overview completed'),ack('role_review','Role, responsibilities and expectations reviewed'),
      ack('policy_orientation','Required policies and workplace standards reviewed'),ack('safety_orientation','Health and safety orientation completed'),
    ]),
    section('first_week','First Week',[
      ack('team_intro','Team/stakeholder introductions completed',false),ack('training_assigned','Required learning/training assigned',false),
      ack('checkin_booked','Manager check-in scheduled',false),
    ]),
    section('completion','Completion',[
      employee('manager','Manager / supervisor'),sig('manager_signature','Manager signature'),date('completion_date','Completion date')
    ])
  ]};
}

export function probationReviewBlueprint():Blueprint{
  return{codePrefix:'HR-PRB',title:'Probation / Introductory Period Review',category:'Performance',sensitivity:'confidential',fields:[
    ...commonHeader(),
    section('review_period','Review Period',[date('period_start','Period start'),date('period_end','Period end')]),
    section('performance_assessment','Performance Assessment',[
      scale('role_knowledge','Role knowledge',20),scale('quality','Quality of work',20),scale('reliability','Reliability & follow-through',20),
      scale('communication','Communication & collaboration',20),scale('learning','Learning & adaptability',20),
      area('strengths','Key strengths',true),area('development','Development priorities',true),
    ]),
    section('review_outcome','Review Outcome',[
      text('outcome','Outcome / recommendation'),area('manager_comments','Manager comments',true),
      area('employee_comments','Employee comments',false),sig('manager_signature','Manager signature'),sig('employee_signature','Employee acknowledgement',false),
      date('review_date','Review date')
    ])
  ]};
}

export function hiringRequisitionBlueprint():Blueprint{
  return{codePrefix:'REC-REQ',title:'Hiring Requisition & Approval Form',category:'Recruitment',sensitivity:'confidential',fields:[
    section('request','Hiring Request',[
      text('position_title','Position title'),text('department','Department / program'),text('hiring_manager','Hiring manager'),
      text('employment_type','Employment type'),text('headcount','Number of openings'),date('target_start_date','Target start date',false),
      area('business_need','Business need / reason for hire',true),
    ]),
    section('role_requirements','Role Requirements',[
      area('key_responsibilities','Key responsibilities',true),area('required_qualifications','Required qualifications',true),
      area('preferred_qualifications','Preferred qualifications',false),area('required_competencies','Required competencies',true),
    ]),
    section('approval','Approval',[
      text('budget_confirmation','Budget / funding confirmation',false),employee('request_approver','Approver',false),
      sig('approver_signature','Approver signature',false),date('approval_date','Approval date',false)
    ])
  ]};
}

export function screeningBlueprint():Blueprint{
  return{codePrefix:'REC-SCR',title:'Candidate Screening Form',category:'Recruitment',sensitivity:'confidential',fields:[
    section('candidate','Candidate & Vacancy',[candidate('candidate','Candidate'),text('vacancy','Vacancy / position'),date('screen_date','Screen date'),employee('reviewer','Reviewer')]),
    section('minimum_requirements','Minimum Requirements',[
      table('requirements','Requirement verification','Record each required qualification, evidence found, and Met / Not Met / Clarify.'),
      area('screening_notes','Job-related screening notes',false)
    ]),
    section('screening_outcome','Screening Outcome',[
      text('outcome','Outcome: Advance / Clarify / Hold / Do not advance'),
      area('rationale','Job-related rationale',true),sig('reviewer_signature','Reviewer signature')
    ])
  ]};
}

export function interviewBlueprint(title='Structured Interview Evaluation Form'):Blueprint{
  const anchors={'1':'Little or no relevant job-related evidence; vague or unsupported.','3':'Relevant example with reasonable ownership and sufficient evidence.','5':'Specific, well-evidenced example showing strong judgment, ownership, measurable impact and learning.'};
  return{codePrefix:'REC-INT',title,category:'Recruitment',subcategory:'Candidate Interview Evaluation',sensitivity:'confidential',fields:[
    section('interview_details','Interview Details',[
      candidate('candidate','Candidate'),text('position','Position / vacancy'),date('interview_date','Interview date'),
      text('stage','Interview stage'),employee('interviewer','Interviewer / panel lead'),
    ]),
    section('structured_questions','Structured Interview Assessment',[
      instruction('q1_prompt','Leadership / ownership: Tell us about a significant piece of work you personally owned from planning through delivery.','Probe for individual responsibility, decisions, evidence and measurable result.'),
      scale('q1_score','Leadership / ownership score',20,anchors),area('q1_evidence','Supporting evidence',true),
      instruction('q2_prompt','Judgment & problem solving: Describe a difficult situation where priorities, quality and stakeholder expectations were in tension.','Probe for analysis, trade-offs, escalation and outcome.'),
      scale('q2_score','Judgment & problem solving score',20,anchors),area('q2_evidence','Supporting evidence',true),
      instruction('q3_prompt','Communication & collaboration: Give an example of how you handled disagreement or competing stakeholder expectations.'),
      scale('q3_score','Communication & collaboration score',20,anchors),area('q3_evidence','Supporting evidence',true),
      instruction('q4_prompt','Role capability: Describe a specific example that demonstrates a key requirement of this role.'),
      scale('q4_score','Role capability score',25,anchors),area('q4_evidence','Supporting evidence',true),
      instruction('q5_prompt','Learning & adaptability: Tell us about a time you had to learn or adjust quickly.'),
      scale('q5_score','Learning & adaptability score',15,anchors),area('q5_evidence','Supporting evidence',true),
    ]),
    section('candidate_followup','Candidate-Specific Clarification — Unscored',[
      area('unscored_followup','Clarification questions / notes',false,'Use only to clarify candidate-specific evidence. Do not change the frozen scored questions or weights.')
    ]),
    section('overall_result','Overall Assessment',[
      area('strengths','Key strengths',true),area('risks','Job-related concerns / evidence gaps',false),
      text('recommendation','Recommendation: Strong Hire / Hire / Consider / Hold / Do Not Proceed',true),
      area('recommendation_rationale','Recommendation rationale',true),
      sig('interviewer_signature','Interviewer / panel lead signature'),date('decision_date','Date')
    ])
  ]};
}

export function referenceCheckBlueprint():Blueprint{
  return{codePrefix:'REC-REF',title:'Reference Check Form',category:'Recruitment',sensitivity:'restricted',fields:[
    section('candidate_reference','Candidate & Reference',[
      candidate('candidate','Candidate'),text('position','Position / vacancy'),text('reference_name','Reference name'),
      text('reference_title','Reference title'),text('reference_organization','Organization'),text('reference_contact','Contact information'),
      text('relationship','Relationship to candidate'),text('working_period','Period worked together',false)
    ]),
    section('reference_questions','Reference Questions',[
      area('duties','Please confirm the candidate’s role and main responsibilities.',true),
      area('performance','How would you describe the candidate’s performance and reliability?',true),
      area('strengths','What were the candidate’s strongest job-related capabilities?',true),
      area('development','What areas required additional support or development?',false),
      area('rehire','Would you work with or rehire this person again? Please explain.',true)
    ]),
    section('verification','Reviewer Verification',[
      yesno('identity_verified','Reference identity/contact reasonably verified?'),area('reviewer_notes','Reviewer notes',false),
      employee('reviewer','Reviewer'),sig('reviewer_signature','Reviewer signature'),date('check_date','Date')
    ])
  ]};
}

export function offerApprovalBlueprint():Blueprint{
  return{codePrefix:'REC-OFR',title:'Offer Approval Form',category:'Recruitment',sensitivity:'restricted',fields:[
    section('candidate_position','Candidate & Position',[candidate('candidate','Candidate'),text('position','Position'),text('department','Department'),text('manager','Manager')]),
    section('offer_terms','Proposed Offer',[
      text('employment_type','Employment type'),text('compensation','Compensation / salary / hourly rate'),text('currency','Currency',false),
      date('proposed_start','Proposed start date'),area('conditions','Conditions / contingencies',false)
    ]),
    section('approval','Approval',[
      yesno('budget_confirmed','Budget/funding confirmed?'),yesno('terms_reviewed','Offer terms reviewed?'),
      employee('approver','Authorized approver'),sig('approver_signature','Approver signature'),date('approval_date','Approval date')
    ])
  ]};
}

export function recruitmentClosureBlueprint():Blueprint{
  return{codePrefix:'REC-CLS',title:'Recruitment Closure Checklist',category:'Recruitment',sensitivity:'confidential',fields:[
    section('vacancy','Vacancy',[text('position','Position / vacancy'),text('selected_candidate','Selected candidate',false),date('closure_date','Closure date')]),
    section('closure_checklist','Closure Checklist',[
      ack('decision_documented','Selection decision and job-related rationale documented'),
      ack('candidate_statuses','Candidate statuses/dispositions updated'),
      ack('communications','Required candidate communications completed'),
      ack('offer_record','Final offer/acceptance record filed',false),
      ack('records_complete','Recruitment record/evidence package complete'),
    ]),
    section('completion','Completion',[employee('completed_by','Completed by'),sig('signature','Signature'),date('completed_date','Date')])
  ]};
}

export function departureNoticeBlueprint():Blueprint{
  return{codePrefix:'OFF-NOT',title:'Employee Departure / Separation Notice',category:'Offboarding / Separation',sensitivity:'restricted',fields:[
    ...commonHeader(),
    section('departure','Departure Details',[
      text('departure_type','Departure type / reason category'),date('last_working_day','Last working day'),
      date('notice_received','Notice received date',false),area('employee_statement','Employee statement / notice details',false),
      area('management_notes','Management / HR notes',false)
    ]),
    section('authorization','HR Control',[employee('hr_owner','HR owner'),yesno('case_opened','Offboarding/separation case opened?'),sig('hr_signature','HR acknowledgement')])
  ]};
}

export function handoverBlueprint():Blueprint{
  return{codePrefix:'OFF-HND',title:'Work Handover Checklist',category:'Offboarding / Separation',sensitivity:'confidential',fields:[
    ...commonHeader(),
    section('handover','Work Handover',[
      table('open_items','Open work / commitments','Record item, status, next action, owner and due date.'),
      table('stakeholders','Key stakeholder / contact handover','Record stakeholder, context and new owner.'),
      area('knowledge_transfer','Critical knowledge / procedures transferred',false),
      area('files_records','Important files, records and storage locations',false)
    ]),
    section('completion','Completion',[employee('receiving_manager','Receiving manager / owner'),sig('manager_signature','Manager signature'),date('completed_date','Completion date')])
  ]};
}

export function accessRemovalBlueprint():Blueprint{
  return{codePrefix:'OFF-ACC',title:'Access Removal Checklist',category:'Offboarding / Separation',sensitivity:'restricted',fields:[
    ...commonHeader(),
    section('systems','Access Removal',[
      table('access_rows','Systems / access','Record system, account/access type, owner, disable date/time and completion status.'),
      yesno('email_handled','Email/mailbox disposition completed?',false),yesno('shared_credentials','Shared credential/access review completed?',false),
      yesno('remote_access','Remote/VPN access removed?',false)
    ]),
    section('verification','Verification',[employee('completed_by','Completed by'),employee('verified_by','Verified by',false),date('completed_date','Completion date'),sig('signature','Completion signature')])
  ]};
}

export function propertyReturnBlueprint():Blueprint{
  return{codePrefix:'OFF-RET',title:'Company Property Return Form',category:'Offboarding / Separation',sensitivity:'confidential',fields:[
    ...commonHeader(),
    section('returned_property','Returned Property',[
      table('property_rows','Property return','Record asset/item, asset tag or serial, returned date, condition and exception.'),
      area('exceptions','Missing/damaged property notes',false)
    ]),
    section('confirmation','Confirmation',[yesno('all_returned','All assigned property reconciled?'),employee('received_by','Received by'),sig('receiver_signature','Receiver signature'),date('return_date','Date')])
  ]};
}

export function finalPayrollBlueprint():Blueprint{
  return{codePrefix:'OFF-PAY',title:'Final Payroll Information Checklist',category:'Offboarding / Separation',sensitivity:'restricted',fields:[
    ...commonHeader(),
    section('payroll_inputs','Final Payroll Review',[
      date('last_working_day','Last working day'),text('final_hours','Outstanding hours / timesheet status',false),
      text('vacation_balance','Vacation/PTO balance review',false),text('expense_status','Outstanding expense status',false),
      text('deduction_notes','Approved deduction/recovery notes',false),area('other_pay_items','Other approved pay items / notes',false)
    ]),
    section('payroll_control','Payroll Control',[
      employee('prepared_by','Prepared by'),employee('reviewed_by','Reviewed/approved by',false),yesno('payroll_notified','Payroll notified / record updated?'),date('completed_date','Completion date')
    ])
  ]};
}

export function exitInterviewBlueprint():Blueprint{
  return{codePrefix:'OFF-EXT',title:'Exit Interview Form',category:'Offboarding / Separation',sensitivity:'restricted',fields:[
    ...commonHeader(),
    section('experience','Employee Experience',[
      scale('role_experience','Overall role experience',20),scale('manager_experience','Manager/supervisor experience',20),
      scale('team_experience','Team/work environment experience',20),scale('growth_experience','Learning/growth experience',20),
      scale('organization_experience','Overall organization experience',20),
      area('most_positive','What worked particularly well?',false),area('improvements','What could the organization improve?',false),
      area('reason_for_leaving','Primary reason(s) for leaving',false),yesno('consider_return','Would you consider returning in the future?',false)
    ]),
    section('interview_control','Interview Record',[employee('interviewer','Interviewer'),date('interview_date','Interview date'),area('hr_followup','HR follow-up actions',false)])
  ]};
}

export function offboardingCompletionBlueprint():Blueprint{
  return{codePrefix:'OFF-CLS',title:'Offboarding Completion Record',category:'Offboarding / Separation',sensitivity:'restricted',fields:[
    ...commonHeader(),
    section('completion_checklist','Final Completion',[
      ack('handover_done','Handover completed'),ack('access_done','Systems/access removed'),ack('property_done','Company property reconciled'),
      ack('payroll_done','Final payroll information provided'),ack('records_done','Required records/documents filed'),
      ack('confidentiality_reminder','Confidentiality / post-departure obligations reminder completed',false),
      ack('exit_interview','Exit interview completed or declined',false)
    ]),
    section('closure','Case Closure',[employee('hr_owner','HR owner'),area('closure_notes','Closure notes',false),sig('hr_signature','HR closure signature'),date('closure_date','Closure date')])
  ]};
}

export function leaveRequestBlueprint():Blueprint{
  return{codePrefix:'HR-LVE',title:'Leave / Time Away Request Form',category:'Leave',sensitivity:'confidential',fields:[
    ...commonHeader(),
    section('request','Leave Request',[
      text('leave_type','Leave / time-away type'),date('start_date','Start date'),date('end_date','End date'),
      text('partial_day','Partial day / hours',false),area('employee_notes','Employee notes',false),
      text('contact_during_leave','Contact during leave (if appropriate)',false)
    ]),
    section('manager_review','Manager / HR Review',[
      text('operational_coverage','Coverage / operational notes',false),text('decision','Approved / Pending / Declined / Needs clarification',false),
      area('decision_notes','Decision notes',false),employee('reviewer','Reviewer',false),sig('review_signature','Review signature',false)
    ])
  ]};
}

export function performanceReviewBlueprint():Blueprint{
  return{codePrefix:'PER-REV',title:'Performance Review Form',category:'Performance',sensitivity:'confidential',fields:[
    ...commonHeader(),
    section('period','Review Period',[date('period_start','Review period start'),date('period_end','Review period end')]),
    section('assessment','Performance Assessment',[
      scale('results','Results / goal achievement',25),scale('quality','Quality & professional standards',20),
      scale('collaboration','Collaboration & communication',20),scale('judgment','Judgment / problem solving',20),scale('growth','Learning & growth',15),
      area('achievements','Key achievements',true),area('development','Development priorities',true)
    ]),
    section('forward_plan','Forward Plan',[
      area('goals','Next-period goals / priorities',true),area('support','Support / resources required',false),
      area('employee_comments','Employee comments',false),sig('manager_signature','Manager signature'),sig('employee_signature','Employee acknowledgement',false),date('review_date','Review date')
    ])
  ]};
}

export function erIntakeBlueprint():Blueprint{
  return{codePrefix:'ER-INT',title:'Employee Relations Intake Form',category:'Employee Relations',sensitivity:'restricted',fields:[
    section('intake','Intake Information',[date('received_date','Date received'),employee('case_owner','HR case owner',false),text('reporting_party','Reporting party',false),text('subject_party','Subject / involved party',false)]),
    section('concern','Concern / Issue',[area('concern_summary','Describe the concern or issue',true),area('dates_locations','Relevant dates / locations',false),area('people_involved','People involved / witnesses',false),area('documents_evidence','Known documents / evidence',false)]),
    section('immediate_risk','Immediate Risk / Interim Measures',[yesno('immediate_risk_flag','Is there an immediate safety, retaliation, preservation or operational risk?'),area('immediate_actions','Immediate/interim actions taken',false)]),
    section('control','HR Control',[text('classification','Case classification',false),text('next_step','Next governed step',false),sig('intake_signature','Intake reviewer signature'),date('intake_date','Date')])
  ]};
}

export function safetyIncidentBlueprint():Blueprint{
  return{codePrefix:'HSE-INC',title:'Workplace Incident / Hazard Report',category:'Health & Safety',sensitivity:'restricted',fields:[
    section('incident','Incident / Hazard Details',[date('incident_date','Incident date'),text('incident_time','Time',false),text('location','Location'),text('reported_by','Reported by'),text('people_involved','People involved',false)]),
    section('description','Description',[area('what_happened','What happened / hazard observed?',true),area('immediate_action','Immediate action taken',true),area('injury_damage','Injury / damage / impact',false)]),
    section('followup','Follow-up',[yesno('medical_attention','Medical attention required?',false),yesno('area_secured','Area/equipment secured where required?',false),area('corrective_actions','Corrective action / investigation referral',false),employee('reviewer','Reviewer',false),sig('review_signature','Reviewer signature',false)])
  ]};
}

export function accommodationBlueprint():Blueprint{
  return{codePrefix:'HR-ACCMD',title:'Workplace Accommodation Request & Plan',category:'Accommodation',sensitivity:'restricted',fields:[
    section('request','Request Information',[employee('employee','Employee'),date('request_date','Request date'),area('functional_limitation','Work-related functional limitation / barrier',true,'Describe functional impact only. Do not request a diagnosis unless specifically required and authorized.'),area('requested_support','Requested accommodation/support',false)]),
    section('interactive_process','Interactive Review',[area('essential_duties','Relevant duties / workplace requirements',false),area('options_considered','Accommodation options considered',false),area('selected_measures','Agreed measures / supports',false),date('review_date','Review / reassessment date',false)]),
    section('authorization','Plan Confirmation',[employee('hr_owner','HR owner'),employee('manager','Manager',false),sig('employee_signature','Employee acknowledgement',false),sig('hr_signature','HR signature'),date('plan_date','Plan date')])
  ]};
}

export function contractorBlueprint():Blueprint{
  return{codePrefix:'CTR-ONB',title:'Contractor / External Worker Onboarding Form',category:'Contractor',sensitivity:'confidential',fields:[
    section('contractor','Contractor Details',[text('contractor_name','Contractor / company name'),text('contact','Primary contact'),text('engagement_role','Role / services'),date('start_date','Start date'),date('end_date','End date',false),text('manager','Internal owner / manager')]),
    section('requirements','Onboarding Requirements',[ack('agreement','Approved agreement / engagement documentation on file'),ack('confidentiality','Confidentiality / information handling requirements completed',false),ack('access','Access requirements approved',false),ack('safety','Required safety/orientation completed',false),ack('insurance_credentials','Required insurance/credential evidence reviewed where applicable',false)]),
    section('completion','Completion',[employee('owner','Internal owner'),sig('owner_signature','Owner signature'),date('completion_date','Completion date')])
  ]};
}

export function customBlueprint(title='Custom HR Form'):Blueprint{
  return{codePrefix:'HR-CUS',title,category:'Custom',sensitivity:'confidential',fields:[
    ...commonHeader('Employee / person'),
    section('request','Request / Information',[area('purpose','Purpose / request details',true),area('supporting_information','Supporting information',false),{id:'attachments',kind:'attachment',label:'Supporting attachment(s)',required:false}]),
    section('review','Review / Approval',[employee('reviewer','Reviewer / approver',false),text('outcome','Outcome / status',false),area('review_notes','Review notes',false),sig('signature','Signature',false),date('review_date','Date',false)])
  ]};
}

export function singleBlueprint(intent:StudioIntent):Blueprint{
  switch(intent){
    case 'recruitment': return hiringRequisitionBlueprint();
    case 'interview': return interviewBlueprint();
    case 'onboarding': return orientationChecklistBlueprint();
    case 'employee_information': return employeeInformationBlueprint();
    case 'leave': return leaveRequestBlueprint();
    case 'performance': return performanceReviewBlueprint();
    case 'employee_relations': return erIntakeBlueprint();
    case 'health_safety': return safetyIncidentBlueprint();
    case 'accommodation': return accommodationBlueprint();
    case 'offboarding': return departureNoticeBlueprint();
    case 'contractor': return contractorBlueprint();
    default: return customBlueprint();
  }
}

export function packBlueprints(intent:StudioIntent):Blueprint[]{
  switch(intent){
    case 'recruitment': return [hiringRequisitionBlueprint(),screeningBlueprint(),interviewBlueprint(),referenceCheckBlueprint(),offerApprovalBlueprint(),recruitmentClosureBlueprint()];
    case 'onboarding': return [employeeInformationBlueprint(),emergencyContactBlueprint(),policyAcknowledgementBlueprint(),equipmentAssignmentBlueprint(),accessRequestBlueprint(),orientationChecklistBlueprint(),probationReviewBlueprint()];
    case 'offboarding': return [departureNoticeBlueprint(),handoverBlueprint(),accessRemovalBlueprint(),propertyReturnBlueprint(),finalPayrollBlueprint(),exitInterviewBlueprint(),offboardingCompletionBlueprint()];
    case 'interview': return [screeningBlueprint(),interviewBlueprint(),referenceCheckBlueprint()];
    default: return [singleBlueprint(intent)];
  }
}

export function applyTargetContext(blueprint:Blueprint,context:{targetLabel?:string;positionTitle?:string;department?:string;manager?:string}):Blueprint{
  const copy=structuredClone(blueprint);
  const walk=(fields:HRFormField[])=>{
    for(const field of fields){
      if(field.id==='position_title'||field.id==='position'||field.id==='vacancy') field.defaultValue=context.positionTitle||context.targetLabel||field.defaultValue;
      if(field.id==='department') field.defaultValue=context.department||field.defaultValue;
      if(field.id==='manager'||field.id==='hiring_manager'||field.id==='manager_name') field.defaultValue=context.manager||field.defaultValue;
      if(field.children?.length)walk(field.children);
    }
  };
  walk(copy.fields);
  return copy;
}
