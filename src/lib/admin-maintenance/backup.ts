import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGzip } from 'node:zlib';
import type { ActorContext } from '@/domain/security';
import { adminBucket, adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';

const FULL_BACKUP_ROLES = new Set(['super_admin', 'org_admin']);
const CREDENTIAL_FIELD =
  /(password|secret|privatekey|clientsecret|apikey|accesstoken|refreshtoken|authorization|credential)/i;

export type BackupRedactionState = { redactions: number };

export function isOrganizationBackupRole(role: string): boolean {
  return FULL_BACKUP_ROLES.has(role);
}

export function backupConfirmationText(organizationName: string): string {
  return `BACKUP ${organizationName.trim().toUpperCase()}`;
}

export function backupFileName(
  organizationName: string,
  generatedAt = new Date().toISOString(),
): string {
  const safe =
    organizationName
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'organization';
  const day = generatedAt.slice(0, 10);
  return `OPSIQO_${safe}_Backup_${day}.jsonl.gz`;
}

export function sanitizeBackupValue(
  value: unknown,
  state: BackupRedactionState = { redactions: 0 },
  fieldName = '',
): unknown {
  if (fieldName && CREDENTIAL_FIELD.test(fieldName.replace(/[_\-\s]/g, ''))) {
    state.redactions += 1;
    return { __redacted: true, reason: 'credential_like_field' };
  }

  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value ?? null;
  }

  if (typeof value === 'bigint') {
    return { __type: 'bigint', value: value.toString() };
  }

  if (value instanceof Date) {
    return { __type: 'date', value: value.toISOString() };
  }

  if (Buffer.isBuffer(value)) {
    return { __type: 'bytes', base64: value.toString('base64') };
  }

  if (value instanceof Uint8Array) {
    return {
      __type: 'bytes',
      base64: Buffer.from(value).toString('base64'),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeBackupValue(item, state));
  }

  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown> & {
      constructor?: { name?: string };
      toDate?: () => Date;
      toBase64?: () => string;
      path?: string;
      latitude?: number;
      longitude?: number;
    };
    const constructorName = candidate.constructor?.name || '';

    if (
      constructorName === 'Timestamp' &&
      typeof candidate.toDate === 'function'
    ) {
      return {
        __type: 'timestamp',
        value: candidate.toDate().toISOString(),
      };
    }

    if (
      constructorName === 'GeoPoint' &&
      typeof candidate.latitude === 'number' &&
      typeof candidate.longitude === 'number'
    ) {
      return {
        __type: 'geopoint',
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      };
    }

    if (
      constructorName === 'DocumentReference' &&
      typeof candidate.path === 'string'
    ) {
      return { __type: 'document_reference', path: candidate.path };
    }

    if (
      typeof candidate.toBase64 === 'function' &&
      constructorName.toLowerCase().includes('bytes')
    ) {
      return { __type: 'bytes', base64: candidate.toBase64() };
    }

    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(candidate)) {
      output[key] = sanitizeBackupValue(child, state, key);
    }
    return output;
  }

  return String(value);
}

function requireOrganizationBackup(actor: ActorContext) {
  if (!isOrganizationBackupRole(actor.role)) {
    throw new ApiError(
      403,
      'Full organization backup is limited to Organization Administrators and Super Administrators.',
      'backup_admin_required',
    );
  }
  if (!actor.permissions.includes('platform.manage')) {
    throw new ApiError(
      403,
      'platform.manage permission is required for a full organization backup.',
      'forbidden',
    );
  }
}

function jsonLine(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

type BackupCounters = {
  firestoreDocuments: number;
  storageFiles: number;
  storageBytes: number;
  storageChunks: number;
  redactions: number;
};

async function* walkDocument(
  ref: FirebaseFirestore.DocumentReference,
  relativePath: string,
  counters: BackupCounters,
): AsyncGenerator<string> {
  const snap = await ref.get();
  if (snap.exists) {
    const redactionState: BackupRedactionState = { redactions: 0 };
    const data = sanitizeBackupValue(snap.data(), redactionState);
    counters.redactions += redactionState.redactions;
    counters.firestoreDocuments += 1;

    yield jsonLine({
      type: 'firestore_document',
      path: relativePath,
      data,
    });
  }

  const collections = await ref.listCollections();
  collections.sort((a, b) => a.id.localeCompare(b.id));

  for (const collection of collections) {
    const docs = await collection.listDocuments();
    docs.sort((a, b) => a.id.localeCompare(b.id));

    for (const doc of docs) {
      yield* walkDocument(
        doc,
        `${relativePath}/${collection.id}/${doc.id}`,
        counters,
      );
    }
  }
}

async function* buildBackupLines(input: {
  actor: ActorContext;
  organizationName: string;
  backupId: string;
  requestedAt: string;
}): AsyncGenerator<string> {
  const { actor, organizationName, backupId, requestedAt } = input;
  const db = adminDb();
  const counters: BackupCounters = {
    firestoreDocuments: 0,
    storageFiles: 0,
    storageBytes: 0,
    storageChunks: 0,
    redactions: 0,
  };

  const rootPath = `organizations/${actor.orgId}`;
  const storagePrefix = `organizations/${actor.orgId}/`;

  yield jsonLine({
    type: 'manifest_start',
    backupId,
    format: 'OPSIQO_ORG_BACKUP_JSONL_GZIP_V1',
    generatedAt: requestedAt,
    organization: {
      id: actor.orgId,
      name: organizationName,
    },
    scope: {
      firestore: `${rootPath} and all descendants`,
      storage: storagePrefix,
    },
    security: {
      tenantScoped: true,
      credentialLikeFirestoreFieldsRedacted: true,
      platformSecretsOutsideOrganizationScopeIncluded: false,
      continuousLocationDataIntroduced: false,
    },
  });

  try {
    const orgRef = db.doc(rootPath);
    yield* walkDocument(orgRef, rootPath, counters);

    const [files] = await adminBucket().getFiles({
      prefix: storagePrefix,
      autoPaginate: true,
    });
    files.sort((a, b) => a.name.localeCompare(b.name));

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const declaredSize = Number(metadata.size || 0);

      yield jsonLine({
        type: 'storage_file_start',
        path: file.name,
        metadata: {
          contentType: metadata.contentType || null,
          size: Number.isFinite(declaredSize) ? declaredSize : null,
          md5Hash: metadata.md5Hash || null,
          crc32c: metadata.crc32c || null,
          generation: metadata.generation || null,
          updated: metadata.updated || null,
        },
      });

      let fileBytes = 0;
      let chunkIndex = 0;

      for await (const raw of file.createReadStream()) {
        const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        fileBytes += chunk.length;
        counters.storageBytes += chunk.length;
        counters.storageChunks += 1;

        yield jsonLine({
          type: 'storage_file_chunk',
          path: file.name,
          index: chunkIndex,
          base64: chunk.toString('base64'),
        });
        chunkIndex += 1;
      }

      counters.storageFiles += 1;
      yield jsonLine({
        type: 'storage_file_end',
        path: file.name,
        chunks: chunkIndex,
        bytes: fileBytes,
      });
    }

    const completedAt = new Date().toISOString();
    const completeAudit = buildAudit(actor, {
      action: 'admin.organization_backup.completed',
      entityType: 'organizationBackup',
      entityId: backupId,
      after: {
        backupId,
        format: 'OPSIQO_ORG_BACKUP_JSONL_GZIP_V1',
        firestoreDocuments: counters.firestoreDocuments,
        storageFiles: counters.storageFiles,
        storageBytes: counters.storageBytes,
        credentialFieldRedactions: counters.redactions,
        completedAt,
      },
    });
    await db
      .doc(`organizations/${actor.orgId}/auditLogs/${completeAudit.id}`)
      .create(completeAudit);

    yield jsonLine({
      type: 'manifest_complete',
      backupId,
      completedAt,
      counts: counters,
      restoreNote:
        'Restore is intentionally a separate governed operation; importing this file must never bypass domain validation or tenant authorization.',
    });
  } catch (error) {
    const failedAt = new Date().toISOString();
    const failedAudit = buildAudit(actor, {
      action: 'admin.organization_backup.failed',
      entityType: 'organizationBackup',
      entityId: backupId,
      after: {
        backupId,
        failedAt,
        errorClass:
          error instanceof Error ? error.constructor.name : 'UnknownError',
      },
    });
    await db
      .doc(`organizations/${actor.orgId}/auditLogs/${failedAudit.id}`)
      .create(failedAudit)
      .catch(() => undefined);
    throw error;
  }
}

export async function createOrganizationBackup(
  actor: ActorContext,
  raw: unknown,
): Promise<{
  backupId: string;
  fileName: string;
  stream: Readable;
}> {
  requireOrganizationBackup(actor);

  const db = adminDb();
  const orgSnap = await db.doc(`organizations/${actor.orgId}`).get();
  if (!orgSnap.exists) {
    throw new ApiError(
      404,
      'Organization not found.',
      'organization_not_found',
    );
  }

  const organizationName = String(
    orgSnap.data()?.name || actor.orgId,
  ).trim();
  const expected = backupConfirmationText(organizationName);
  const confirmation = String(
    (raw as { confirmation?: unknown } | null)?.confirmation || '',
  ).trim();

  if (confirmation !== expected) {
    throw new ApiError(
      400,
      `Type “${expected}” exactly to authorize the organization backup.`,
      'backup_confirmation_required',
    );
  }

  const backupId = randomUUID();
  const requestedAt = new Date().toISOString();

  const requestedAudit = buildAudit(actor, {
    action: 'admin.organization_backup.requested',
    entityType: 'organizationBackup',
    entityId: backupId,
    after: {
      backupId,
      requestedAt,
      organizationId: actor.orgId,
      format: 'OPSIQO_ORG_BACKUP_JSONL_GZIP_V1',
      storagePrefix: `organizations/${actor.orgId}/`,
      credentialLikeFirestoreFieldsRedacted: true,
    },
  });
  await db
    .doc(`organizations/${actor.orgId}/auditLogs/${requestedAudit.id}`)
    .create(requestedAudit);

  const source = Readable.from(
    buildBackupLines({
      actor,
      organizationName,
      backupId,
      requestedAt,
    }),
    { encoding: 'utf8' },
  );
  const gzip = createGzip({ level: 6 });
  source.on('error', (error) => gzip.destroy(error));

  return {
    backupId,
    fileName: backupFileName(organizationName, requestedAt),
    stream: source.pipe(gzip),
  };
}
