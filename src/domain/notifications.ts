export type NotificationStatus = 'unread' | 'read';
export type NotificationChannel = 'in_app' | 'email';

export interface UserNotification {
  id: string;
  type: string;
  category?: string;
  priority?: 'normal'|'high'|'urgent'|'critical';
  title: string;
  message: string;
  targetUid?: string;
  targetRole?: string;
  entityType?: string;
  entityId?: string;
  status: NotificationStatus;
  inAppVisible?: boolean;
  createdAt: string;
  readAt?: string;
  emailStatus?: 'pending' | 'sent' | 'failed' | 'disabled';
  emailAttempts?: number;
  emailSentAt?: string;
  emailError?: string;
}


export interface NotificationSettings {
  id: 'notifications';
  inAppEnabled: boolean;
  emailEnabled: boolean;
  failureAlertsEnabled: boolean;
  workflowEscalationsEnabled: boolean;
  digestFrequency: 'off' | 'daily' | 'weekly';
  updatedAt: string;
  updatedBy: string;
}


export interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  subject: string;
  body: string;
  channels: NotificationChannel[];
  variables: string[];
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}
