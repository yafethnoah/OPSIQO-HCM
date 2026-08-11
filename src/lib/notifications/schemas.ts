import { z } from 'zod';
export const notificationSettingsSchema = z.object({
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  failureAlertsEnabled: z.boolean(),
  workflowEscalationsEnabled: z.boolean(),
  digestFrequency: z.enum(['off','daily','weekly']),
});

export const notificationTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().regex(/^[A-Z0-9_\-]{3,80}$/).transform(v=>v.toUpperCase()),
  name: z.string().min(2).max(120),
  subject: z.string().min(1).max(180),
  body: z.string().min(1).max(8000),
  channels: z.array(z.enum(['in_app','email'])).min(1).max(2),
  variables: z.array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,60}$/)).max(30).default([]),
  enabled: z.boolean().default(true),
});
