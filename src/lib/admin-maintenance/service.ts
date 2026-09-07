import type { ActorContext } from '@/domain/security';
import { adminBucket, adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';

const ADMIN_ROLES = new Set(['super_admin', 'org_admin', 'hr_admin']);
const DAY = 24 * 60 * 60 * 1000;
const SAFE_REJECTED_AGE_DAYS = 30;

type MaintenanceImportRow = {
  id: string;
  reviewStatus?: unknown;
  promotedEntityId?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
  analysisStatus?: unknown;
  scanStatus?: unknown;
};

const protectedEvidence = [
  'Audit logs and historical audit evidence',
  'Security and authentication evidence',
  'Source hashes and release/certification provenance',
  'Completed approval history',
  'Previous governed document versions',
];

const resetCollections = [
  'libraryImports',
  'structureImportProposals',
  'procedureTemplates',
  'digitalFormTemplates',
  'trainingImportDrafts',
  'jobDescriptionImportDrafts',
  'workflowRuns',
  'workflowStepRuns',
  'workers',
  'positions',
  'orgUnits',
  'opsiqoOneSetup',
] as const;

function requireMaintenance(actor: ActorContext) {
  if (!ADMIN_ROLES.has(actor.role)) throw new ApiError(403, 'Administrator access required.', 'forbidden');
  if (!actor.permissions.includes('platform.manage')) throw new ApiError(403, 'platform.manage permission required.', 'forbidden');
}

function oldEnough(value: unknown, days: number) {
  const time = Date.parse(String(value || ''));
  return Number.isFinite(time) && Date.now() - time >= days * DAY;
}

async function limited(path: string, limit = 1000) {
  return adminDb().collection(path).limit(limit).get();
}

function duplicates(values: string[]) {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = raw.trim().toLowerCase();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
}

async function storageInventory(orgId: string, importIds: Set<string>) {
  const prefix = `organizations/${orgId}/library-imports/`;
  const [files] = await adminBucket().getFiles({ prefix, maxResults: 1000 });
  let bytes = 0;
  const orphanFiles: Array<{ name: string; size: number }> = [];
  for (const file of files) {
    const [metadata] = await file.getMetadata().catch(() => [{ size: '0' } as any]);
    const size = Number(metadata.size || 0);
    bytes += Number.isFinite(size) ? size : 0;
    const relative = file.name.slice(prefix.length);
    const importId = relative.split('/')[0] || '';
    if (importId && !importIds.has(importId)) orphanFiles.push({ name: file.name, size });
  }
  return { fileCount: files.length, bytes, orphanFiles, capped: files.length >= 1000 };
}

export async function getAdminMaintenanceSnapshot(actor: ActorContext) {
  requireMaintenance(actor);
  const db = adminDb();
  const base = `organizations/${actor.orgId}`;
  const [orgSnap, imports, workers, units, positions, workflows] = await Promise.all([
    db.doc(base).get(),
    limited(`${base}/libraryImports`, 1000),
    limited(`${base}/workers`, 2000),
    limited(`${base}/orgUnits`, 1000),
    limited(`${base}/positions`, 1000),
    limited(`${base}/workflowDefinitions`, 1000),
  ]);
  if (!orgSnap.exists) throw new ApiError(404, 'Organization not found.', 'organization_not_found');

  const importRows: MaintenanceImportRow[] = imports.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as MaintenanceImportRow));
  const importIds = new Set(importRows.map(r => String(r.id)));
  const rejectedCleanup = importRows.filter(r => r.reviewStatus === 'rejected' && !r.promotedEntityId && oldEnough(r.updatedAt || r.createdAt, SAFE_REJECTED_AGE_DAYS));
  const abandoned = importRows.filter(r => !r.promotedEntityId && r.reviewStatus !== 'approved' && oldEnough(r.updatedAt || r.createdAt, 14));
  const failed = importRows.filter(r => r.analysisStatus === 'failed');
  const notScanned = importRows.filter(r => r.scanStatus === 'not_scanned');
  const storage = await storageInventory(actor.orgId, importIds);

  const workerRows = workers.docs.map(d => d.data() as Record<string, any>);
  const duplicateEmails = duplicates(workerRows.map(w => String(w.workEmail || '')));
  const duplicateNumbers = duplicates(workerRows.map(w => String(w.employeeNumber || '')));

  const resetPreview: Record<string, number> = {};
  await Promise.all(resetCollections.map(async name => {
    resetPreview[name] = (await limited(`${base}/${name}`, 5000)).size;
  }));

  const issues = [
    ...duplicateEmails.map(x => ({ severity: 'high' as const, code: 'duplicate_work_email', summary: `Duplicate work email: ${x.value}`, count: x.count })),
    ...duplicateNumbers.map(x => ({ severity: 'high' as const, code: 'duplicate_employee_number', summary: `Duplicate employee number: ${x.value}`, count: x.count })),
    ...(storage.orphanFiles.length ? [{ severity: 'medium' as const, code: 'orphan_import_storage', summary: `${storage.orphanFiles.length} import storage object(s) have no matching library record.`, count: storage.orphanFiles.length }] : []),
    ...(failed.length ? [{ severity: 'medium' as const, code: 'failed_import_analysis', summary: `${failed.length} import analysis job(s) failed and require review.`, count: failed.length }] : []),
  ];

  return {
    generatedAt: new Date().toISOString(),
    organization: { id: actor.orgId, name: String(orgSnap.data()?.name || actor.orgId) },
    health: {
      status: issues.some(i => i.severity === 'high') ? 'attention_required' : issues.length ? 'review_recommended' : 'healthy',
      issues,
      workers: workers.size,
      orgUnits: units.size,
      positions: positions.size,
      workflowDefinitions: workflows.size,
    },
    imports: {
      total: imports.size,
      notScanned: notScanned.length,
      failedAnalysis: failed.length,
      abandonedReview: abandoned.length,
      safeCleanupCandidates: rejectedCleanup.length,
      promoted: importRows.filter(r => Boolean(r.promotedEntityId)).length,
    },
    storage: {
      importFileCount: storage.fileCount,
      importBytes: storage.bytes,
      orphanFileCount: storage.orphanFiles.length,
      listingCapped: storage.capped,
    },
    cleanup: {
      safeRejectedImportIds: rejectedCleanup.map(r => r.id),
      retentionDays: SAFE_REJECTED_AGE_DAYS,
      automaticDeletionScope: 'Only rejected, unpromoted HR import records older than the retention threshold are eligible for Safe Cleanup.',
    },
    cache: {
      apiMode: 'no-store',
      organizationRefreshSupported: true,
      userBrowserCacheSupported: true,
      note: 'OPSIQO APIs use no-store. Organization refresh writes an audited cache epoch; browser cache clearing remains local to the current user.',
    },
    reset: {
      enabled: process.env.OPSIQO_ALLOW_UAT_TENANT_RESET === 'true',
      confirmationText: `RESET ${String(orgSnap.data()?.name || actor.orgId).toUpperCase()}`,
      collections: resetPreview,
      protected: ['organization root', 'memberships/access', 'auditLogs', 'security configuration', 'release/certification evidence'],
      note: 'Tenant reset is allowlisted and disabled unless OPSIQO_ALLOW_UAT_TENANT_RESET=true. It never removes the organization root, membership/access, audit logs or security evidence.',
    },
    backup: {
      allowed: ['super_admin', 'org_admin'].includes(actor.role) && actor.permissions.includes('platform.manage'),
      confirmationText: `BACKUP ${String(orgSnap.data()?.name || actor.orgId).toUpperCase()}`,
      format: 'OPSIQO_ORG_BACKUP_JSONL_GZIP_V1',
      firestoreScope: `organizations/${actor.orgId} and all descendants`,
      storageScope: `organizations/${actor.orgId}/`,
      credentialLikeFirestoreFieldsRedacted: true,
      note: 'Exports organization-scoped Firestore data and organization-owned Cloud Storage objects. Platform credentials and secret environment values are never exported.',
    },
    protectedEvidence,
    editorLinks: [
      { label: 'Organization profile & setup', href: '/organization-launchpad', permission: 'organization.manage' },
      { label: 'Organization units & positions', href: '/organization', permission: 'organization.manage' },
      { label: 'Employees & workforce records', href: '/people', permission: 'people.read.directory' },
      { label: 'Policies & governed content', href: '/policy-intelligence', permission: 'policies.read' },
      { label: 'Recruitment', href: '/recruiting', permission: 'recruiting.read' },
      { label: 'Time & leave', href: '/time', permission: 'time.read' },
      { label: 'Learning', href: '/learning', permission: 'learning.read' },
      { label: 'Performance', href: '/performance', permission: 'performance.read' },
      { label: 'Workflows & automation', href: '/workflows', permission: 'workflow.read' },
      { label: 'AI governance', href: '/ai-governance', permission: 'ai.use' },
      { label: 'Audit trail', href: '/audit', permission: 'audit.read' },
    ],
  };
}

export async function safeCleanup(actor: ActorContext) {
  requireMaintenance(actor);
  const snapshot = await getAdminMaintenanceSnapshot(actor);
  const db = adminDb();
  let deletedRecords = 0;
  let deletedFiles = 0;
  for (const id of snapshot.cleanup.safeRejectedImportIds) {
    const ref = db.doc(`organizations/${actor.orgId}/libraryImports/${id}`);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const row = snap.data() as Record<string, any>;
    if (row.reviewStatus !== 'rejected' || row.promotedEntityId || !oldEnough(row.updatedAt || row.createdAt, SAFE_REJECTED_AGE_DAYS)) continue;
    const storagePath = String(row.storagePath || '');
    if (storagePath) {
      await adminBucket().file(storagePath).delete({ ignoreNotFound: true }).then(() => { deletedFiles += 1; }).catch(() => {});
    }
    await ref.delete();
    deletedRecords += 1;
  }
  const audit = buildAudit(actor, {
    action: 'admin.maintenance.safe_cleanup',
    entityType: 'organizationMaintenance',
    entityId: actor.orgId,
    after: { deletedRecords, deletedFiles, retentionDays: SAFE_REJECTED_AGE_DAYS },
  });
  await db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`).create(audit);
  return { deletedRecords, deletedFiles, protectedEvidencePreserved: true, snapshot: await getAdminMaintenanceSnapshot(actor) };
}

export async function refreshOrganizationCache(actor: ActorContext) {
  requireMaintenance(actor);
  const db = adminDb();
  const epoch = new Date().toISOString();
  const ref = db.doc(`organizations/${actor.orgId}/maintenance/cacheEpoch`);
  await ref.set({ epoch, requestedBy: actor.uid, requestedAt: epoch }, { merge: false });
  const audit = buildAudit(actor, {
    action: 'admin.maintenance.cache_refresh',
    entityType: 'organizationMaintenance',
    entityId: 'cacheEpoch',
    after: { epoch },
  });
  await db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`).create(audit);
  return { epoch, note: 'Organization cache refresh epoch recorded. API responses remain no-store.' };
}

export async function executeUatReset(actor: ActorContext, confirmation: string) {
  requireMaintenance(actor);
  if (process.env.OPSIQO_ALLOW_UAT_TENANT_RESET !== 'true') throw new ApiError(403, 'UAT tenant reset is disabled by environment policy.', 'tenant_reset_disabled');
  const db = adminDb();
  const orgRef = db.doc(`organizations/${actor.orgId}`);
  const org = await orgRef.get();
  if (!org.exists) throw new ApiError(404, 'Organization not found.', 'organization_not_found');
  const expected = `RESET ${String(org.data()?.name || actor.orgId).toUpperCase()}`;
  if (confirmation.trim() !== expected) throw new ApiError(400, `Type “${expected}” exactly to authorize the reset.`, 'confirmation_required');
  const recursiveDelete = (db as any).recursiveDelete?.bind(db);
  if (typeof recursiveDelete !== 'function') throw new ApiError(501, 'Recursive tenant reset is unavailable in this Firebase Admin runtime.', 'reset_runtime_unavailable');

  const before = await getAdminMaintenanceSnapshot(actor);
  const deletedCollections: string[] = [];
  for (const name of resetCollections) {
    await recursiveDelete(db.collection(`organizations/${actor.orgId}/${name}`));
    deletedCollections.push(name);
  }
  const [files] = await adminBucket().getFiles({ prefix: `organizations/${actor.orgId}/library-imports/`, maxResults: 5000 });
  await Promise.all(files.map(file => file.delete({ ignoreNotFound: true }).catch(() => undefined)));

  const audit = buildAudit(actor, {
    action: 'admin.maintenance.uat_tenant_reset',
    entityType: 'organizationMaintenance',
    entityId: actor.orgId,
    before: { resetPreview: before.reset.collections },
    after: { deletedCollections, deletedImportFiles: files.length, organizationRootPreserved: true, auditLogsPreserved: true },
  });
  await db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`).create(audit);
  return { deletedCollections, deletedImportFiles: files.length, protectedEvidencePreserved: true, organizationRootPreserved: true };
}
