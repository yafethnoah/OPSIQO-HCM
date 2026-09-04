import type { ActorContext } from '@/domain/security';
import type { DailyBrief, DailyBriefItem } from '@/domain/opsiqo-one-v7-14';
import { listNotifications } from '@/lib/notifications/service';
import { getSuperAppPreference } from '@/lib/superapp/service';
import { opsiqoOneOverview } from './overview';
import { buildNotificationDigest } from './notification-intelligence';
import { grantWorkforceDashboard } from './grant-workforce';
import { programWorkforceDashboard } from './program-workforce';
import { programPortfolioDashboard } from './program-portfolio';

function asItem(row: any): DailyBriefItem {
  return {
    id: String(row.id),
    title: String(row.title || 'OPSIQO item'),
    summary: String(row.summary || ''),
    href: String(row.href || '/my-work'),
    severity: row.priority || row.severity || 'info',
    dueAt: row.dueAt,
    source: 'work',
  };
}

function dueWithinDays(iso: string | undefined, days: number) {
  if (!iso) return false;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return false;
  const delta = ts - Date.now();
  return delta >= 0 && delta <= days * 86400000;
}

export async function buildDailyBrief(actor: ActorContext): Promise<DailyBrief> {
  const [overview, preference, notifications, notificationDigest, grant, program, portfolio] = await Promise.all([
    opsiqoOneOverview(actor),
    getSuperAppPreference(actor),
    actor.permissions.includes('notifications.read') ? listNotifications(actor, 40).catch(() => []) : Promise.resolve([]),
    buildNotificationDigest(actor).catch(() => []),
    actor.permissions.includes('workforce.read') ? grantWorkforceDashboard(actor).catch(() => null) : Promise.resolve(null),
    actor.permissions.includes('workforce.read') ? programWorkforceDashboard(actor).catch(() => null) : Promise.resolve(null),
    actor.permissions.includes('workforce.read') ? programPortfolioDashboard(actor).catch(() => null) : Promise.resolve(null),
  ]);

  const needsAction = overview.workQueue
    .filter(row => row.bucket === 'needs_me')
    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, info: 3 }[a.priority] - { critical: 0, high: 1, medium: 2, info: 3 }[b.priority]))
    .slice(0, 3)
    .map(asItem);

  const approaching = overview.workQueue
    .filter(row => row.bucket !== 'completed' && dueWithinDays(row.dueAt, 7))
    .filter(row => !needsAction.some(item => item.id === row.id))
    .slice(0, 2)
    .map(asItem);

  const unread = notifications.filter((row: any) => row.status !== 'read');
  const highUnread = unread.filter((row: any) => ['high', 'urgent', 'critical'].includes(String(row.priority || '').toLowerCase())).length;
  const insight = highUnread > 0
    ? { title: 'Important notifications are waiting', summary: `${highUnread} high-priority notification(s) are unread.`, href: '/notifications' }
    : overview.workCounts.ai_working > 0
      ? { title: 'OPSIQO is preparing work', summary: `${overview.workCounts.ai_working} governed AI preparation item(s) are in progress.`, href: '/my-work' }
      : overview.knowledgeGraph.counts.relationships > 0
        ? { title: 'Organization context is connected', summary: `${overview.knowledgeGraph.counts.relationships} permission-scoped workforce relationship(s) are available to OPSIQO intelligence.`, href: '/intelligence' }
        : undefined;

  const proactiveSignals = [
    ...notificationDigest.filter(group=>group.priority!=='normal').slice(0,2).map(group=>({id:`notification:${group.id}`,severity:group.priority==='critical'?'high' as const:'medium' as const,title:`${group.title} needs attention`,summary:`${group.count} unread notification(s) are consolidated in this category.`,href:group.href,source:'notification_digest'})),
    ...(grant?.metrics.expiring90d ? [{id:'grant-expiry',severity:'medium' as const,title:'Funding periods are approaching end dates',summary:`${grant.metrics.expiring90d} active funding source(s) end within 90 days. Review explicit workforce allocations before assuming continuation.`,href:'/grant-workforce',source:'grant_workforce'}] : []),
    ...(program?.metrics.uncostedAllocations ? [{id:'program-cost-evidence',severity:'info' as const,title:'Program cost evidence is incomplete',summary:`${program.metrics.uncostedAllocations} active program allocation(s) do not have an explicit funded amount. OPSIQO will not infer restricted compensation.`,href:'/program-workforce',source:'program_workforce'}] : []),
    ...(portfolio?.signals.find(x=>x.id==='portfolio-budget-variance') ? [{id:'portfolio-budget-variance',severity:'high' as const,title:'Program portfolio variance needs review',summary:portfolio.signals.find(x=>x.id==='portfolio-budget-variance')!.summary,href:'/program-portfolio',source:'program_portfolio'}] : []),
  ].slice(0,3);

  return {
    generatedAt: new Date().toISOString(),
    locale: preference.locale,
    greetingName: overview.workerDisplayName,
    needsAction,
    approaching,
    insight,
    unreadNotifications: unread.length,
    workCounts: overview.workCounts,
    privacyNote: 'Daily Brief uses the same permission-scoped OPSIQO evidence as Home and My Work. It does not create hidden employee risk scores, infer individual departure risk, or expose records outside the signed-in user’s authorization.',
    notificationDigest,
    proactiveSignals,
  };
}
