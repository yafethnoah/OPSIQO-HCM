export type OpsiQoLocale = 'auto' | 'en' | 'fr' | 'es' | 'ar';
export type OrganizationType = 'business' | 'nonprofit' | 'public_sector' | 'healthcare' | 'education' | 'other';
export type EmployeeBand = '1-25' | '26-100' | '101-500' | '501-2000' | '2000+';

export interface OrganizationLaunchpadProfile {
  organizationType: OrganizationType;
  country: string;
  region?: string;
  employeeBand: EmployeeBand;
  primaryLocale: Exclude<OpsiQoLocale, 'auto'>;
  timezone: string;
  weekStartsOn: 'sunday' | 'monday';
  locations: string[];
  departments: string[];
  marketplacePackIds: string[];
  notificationDigest: 'off' | 'daily' | 'weekly';
}

export interface OrganizationLaunchpadPreview {
  organization: { id: string; name: string };
  current: { orgUnits: number; positions: number; workflows: number; setupApplied: boolean };
  profile?: OrganizationLaunchpadProfile;
  suggestions: {
    departments: string[];
    marketplacePackIds: string[];
  notificationDigest: 'off' | 'daily' | 'weekly';
    rationale: string[];
  };
  safeguards: string[];
  canApply: boolean;
}

export interface OrganizationLaunchpadApplyResult {
  profile: OrganizationLaunchpadProfile;
  createdOrgUnits: Array<{ id: string; name: string; code: string }>;
  installedPackIds: string[];
  skippedPackIds: string[];
  setupChecklist: Array<{ id: string; title: string; href: string; status: 'ready' | 'review_required' }>;
  appliedAt: string;
  governanceNote: string;
}

export interface DailyBriefItem {
  id: string;
  title: string;
  summary: string;
  href: string;
  severity: 'info' | 'medium' | 'high' | 'critical';
  dueAt?: string;
  source: 'work' | 'notification' | 'system';
}

export interface DailyBrief {
  generatedAt: string;
  locale: OpsiQoLocale;
  greetingName?: string;
  needsAction: DailyBriefItem[];
  approaching: DailyBriefItem[];
  insight?: { title: string; summary: string; href: string };
  unreadNotifications: number;
  workCounts: Record<'needs_me' | 'waiting' | 'ai_working' | 'completed', number>;
  privacyNote: string;
  notificationDigest?: Array<{id:string;title:string;priority:'critical'|'high'|'normal';count:number;href:string;items:Array<{id:string;title:string;message:string}>}>;
  proactiveSignals?: Array<{id:string;severity:'high'|'medium'|'info';title:string;summary:string;href:string;source:string}>;
}
