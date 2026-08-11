import type { Role } from './security';

export interface Organization {
  id: string;
  name: string;
  status: 'active' | 'inactive';
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
