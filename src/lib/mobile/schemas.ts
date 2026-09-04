import { z } from 'zod';

export const mobileDeviceSchema = z.object({
  platform: z.enum(['ios', 'android']),
  installationId: z.string().trim().min(12).max(160),
  pushToken: z.string().trim().min(8).max(512).optional(),
  appVersion: z.string().trim().max(80).optional(),
  osVersion: z.string().trim().max(80).optional(),
  deviceModel: z.string().trim().max(160).optional(),
  biometricCapable: z.boolean().optional(),
  notificationsGranted: z.boolean().optional(),
});

export const mobileDeviceRevokeSchema = z.object({
  installationId: z.string().trim().min(12).max(160),
});
