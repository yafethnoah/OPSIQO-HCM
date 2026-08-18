import type { Role } from './security';

export interface Organization {
  id: string;
  name: string;
  legalName?: string;
  slug?: string;
  status: 'active' | 'inactive';
  lifecycleStatus?: 'active' | 'suspended' | 'archived';
  provisioningStatus?: 'provisioning' | 'ready' | 'attention_required' | 'legacy';
  onboardingStatus?: string;
  country?: string;
  region?: string;
  timezone?: string;
  industry?: string;
  sizeBand?: string;
  defaultLanguage?: string;
  primaryAdminEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembershipSummary {
  orgId: string;
  name: string;
  role: Role;
  workerId?: string;
  status: 'active' | 'inactive';
}
