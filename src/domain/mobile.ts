import type { ActorContext } from './security';

export type MobilePlatform = 'ios' | 'android';

export interface MobileDeviceRegistration {
  id: string;
  uid: string;
  workerId?: string;
  platform: MobilePlatform;
  pushToken?: string;
  appVersion?: string;
  osVersion?: string;
  deviceModel?: string;
  biometricCapable?: boolean;
  notificationsGranted?: boolean;
  status: 'active' | 'revoked';
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MobileBootstrap {
  apiVersion: 'v1';
  release: {
    featureRelease: 'H47';
    mobileRelease: 'employee-mobile-v1.1';
  };
  actor: ActorContext;
  capabilities: {
    employeePortal: boolean;
    time: boolean;
    clock: boolean;
    leave: boolean;
    expenses: boolean;
    learning: boolean;
    documents: boolean;
    notifications: boolean;
    safety: boolean;
    aiCopilot: boolean;
    managerMode: boolean;
  };
  employee: unknown;
  attention: unknown[];
  leave: unknown | null;
  shifts: unknown[];
  attendance: unknown | null;
  expenses: unknown[];
  notifications: unknown[];
  learning: unknown | null;
  documents: unknown[];
  manager: unknown | null;
  team: unknown[];
  generatedAt: string;
}
