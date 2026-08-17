export type AutomationBoundary = 'automatic' | 'automatic_after_approval' | 'human_required' | 'opt_in_assist';

export interface AutomationCapability {
  id: string;
  label: string;
  boundary: AutomationBoundary;
  description: string;
}

export const AUTOMATION_CATALOG: AutomationCapability[] = [
  { id:'effective_hr_changes', label:'Effective-dated HR changes', boundary:'automatic_after_approval', description:'Executes previously authorized employee and secondary-assignment changes when their effective date arrives.' },
  { id:'approved_compensation_cycles', label:'Approved compensation cycles', boundary:'automatic_after_approval', description:'Applies already-approved compensation recommendations on the approved effective date; automation never approves the pay decision.' },
  { id:'invitation_lifecycle', label:'Invitation lifecycle', boundary:'automatic', description:'Expires stale invitations, removes expired token indexes and notifies the inviter before/after expiry.' },
  { id:'onboarding_deadlines', label:'Onboarding deadlines', boundary:'automatic', description:'Marks overdue onboarding tasks and sends governed reminders while activation remains HR-controlled.' },
  { id:'document_retention', label:'Document retention and expiry', boundary:'automatic', description:'Calculates retention status, expiry and disposal review signals without silently deleting governed records.' },
  { id:'policy_reviews', label:'Policy review and re-attestation monitoring', boundary:'automatic', description:'Tracks review dates, re-attestation progress and overdue acknowledgements; publication remains human-approved.' },
  { id:'leave_time', label:'Leave accruals and time governance', boundary:'automatic', description:'Recomputes balances, timesheets and exception signals; approval decisions remain with authorized people.' },
  { id:'performance_learning', label:'Performance and learning deadlines', boundary:'automatic', description:'Detects overdue reviews/PIP milestones, training and certificate expiry and produces reminders/events.' },
  { id:'career_succession', label:'Career and succession monitoring', boundary:'automatic', description:'Flags critical-position reviews and coverage gaps; successor confirmation remains a human decision.' },
  { id:'employee_relations_safety', label:'Employee relations and safety deadlines', boundary:'automatic', description:'Tracks case, investigation, action, accommodation, incident, inspection and return-to-work deadlines.' },
  { id:'experience_service', label:'Employee experience and service SLAs', boundary:'automatic', description:'Closes due surveys where configured and detects service-ticket SLA breaches.' },
  { id:'workforce_analytics', label:'Workforce planning and analytics', boundary:'automatic', description:'Creates scheduled snapshots/forecasts and flags approved demand dates and budget variances without approving workforce actions.' },
  { id:'import_analysis', label:'Governed import analysis', boundary:'automatic_after_approval', description:'Automatically analyzes scan-clean files, creates draft policies/procedures/forms/training/JDs/structure proposals, and files approved worker-linked employee documents after human source approval.' },
  { id:'integration_schedules', label:'Approved inbound integrations', boundary:'automatic_after_approval', description:'Runs only active, approved inbound schedules with leases/idempotency; consequential outbound mutation remains prohibited.' },
  { id:'identity_security_privacy', label:'Identity, security and privacy governance', boundary:'automatic', description:'Expires bounded privileged access, suspends expired break-glass activation, checks reviews and quarantines integrity failures while access grants and legal decisions remain human-controlled.' },
  { id:'regulatory_governance', label:'Regulatory, governance and assurance monitoring', boundary:'automatic', description:'Checks configured regulatory sources, evidence integrity, controls, attestations, exceptions and legal-review deadlines as signals—not legal conclusions.' },
  { id:'platform_resilience', label:'Platform reliability, resilience and command-center monitoring', boundary:'automatic', description:'Tracks SLOs, backup/restore evidence, DR exercises, configuration drift, critical-role resilience and enterprise action deadlines.' },
  { id:'event_workflows', label:'Event-driven workflow dispatch', boundary:'automatic', description:'Dispatches durable domain events idempotently into enabled workflows.' },
  { id:'workflow_notifications', label:'Workflow notification steps', boundary:'automatic', description:'Automatically delivers and completes notification-only workflow steps; task and approval steps stay human-controlled.' },
  { id:'workflow_sla', label:'Workflow SLA escalation', boundary:'automatic', description:'Marks overdue steps, creates escalation evidence and sends alerts without auto-approving the underlying step.' },
  { id:'notifications', label:'Notification delivery', boundary:'automatic', description:'Retries and records queued notification delivery with failure evidence.' },
  { id:'ats_assist', label:'ATS scoring / candidate analysis', boundary:'opt_in_assist', description:'Can be prepared automatically only under explicit governance; it never hires, rejects, advances or changes candidate stage automatically.' },
  { id:'consequential_employment', label:'Hire, reject, terminate, discipline, promote/demote', boundary:'human_required', description:'Consequential employment decisions are intentionally excluded from autonomous execution.' },
  { id:'individual_pay_decision', label:'Individual salary/compensation decision', boundary:'human_required', description:'Automation may execute a previously approved cycle, but it never decides an individual pay change.' },
  { id:'succession_selection', label:'Successor confirmation', boundary:'human_required', description:'Automation may surface gaps and reminders; selection/confirmation remains human-governed.' },
  { id:'policy_publication', label:'Policy publication / legal conclusion', boundary:'human_required', description:'Automation can prepare drafts and monitor deadlines but cannot publish policies or make legal conclusions.' },
  { id:'privileged_access', label:'Privileged access grants and role elevation', boundary:'human_required', description:'Expiry can be automated; grants, role changes and privileged access approval require independent human authorization.' },
];

export const AUTOMATED_CAPABILITY_COUNT = AUTOMATION_CATALOG.filter(item => item.boundary === 'automatic' || item.boundary === 'automatic_after_approval').length;
export const HUMAN_APPROVAL_BOUNDARY_COUNT = AUTOMATION_CATALOG.filter(item => item.boundary === 'human_required' || item.boundary === 'opt_in_assist').length;
