import type { ActorContext } from '@/domain/security';
import type { NotificationDigestGroup } from '@/domain/opsiqo-one-v7-15';
import { listNotifications } from '@/lib/notifications/service';

const PRIORITY_RANK: Record<NotificationDigestGroup['priority'], number> = {
  critical: 0,
  high: 1,
  normal: 2,
};

export async function buildNotificationDigest(actor: ActorContext): Promise<NotificationDigestGroup[]> {
  if (!actor.permissions.includes('notifications.read')) return [];

  const rows = await listNotifications(actor, 80);
  const unread = rows.filter((notification: any) => notification.status !== 'read');
  const groups = new Map<string, any[]>();

  for (const notification of unread) {
    const key = String((notification as any).category || notification.type || 'general');
    const items = groups.get(key) || [];
    items.push(notification);
    groups.set(key, items);
  }

  const digest: NotificationDigestGroup[] = [...groups.entries()].map(([key, items]) => {
    const severe = items.some((notification: any) =>
      ['critical', 'urgent'].includes(String(notification.priority || '').toLowerCase()),
    );
    const high = items.some(
      (notification: any) => String(notification.priority || '').toLowerCase() === 'high',
    );
    const priority: NotificationDigestGroup['priority'] = severe ? 'critical' : high ? 'high' : 'normal';

    return {
      id: key,
      title: key.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
      priority,
      count: items.length,
      href: '/notifications',
      items: items.slice(0, 3).map((notification: any) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
      })),
    };
  });

  return digest
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.count - a.count)
    .slice(0, 6);
}
