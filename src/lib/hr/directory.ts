import type { Worker } from '@/domain/hr';

export interface WorkerDirectoryEntry {
  id: string;
  displayName: string;
  workEmail?: string;
  status: Worker['status'];
  updatedAt: string;
}

/**
 * Privacy-minimized employee directory projection. Never add employee number,
 * person identifiers, hire/termination dates, compensation, or private HR data.
 */
export function workerDirectoryEntry(worker: Worker): WorkerDirectoryEntry {
  return {
    id: worker.id,
    displayName: worker.displayName,
    ...(worker.workEmail ? { workEmail: worker.workEmail } : {}),
    status: worker.status,
    updatedAt: worker.updatedAt,
  };
}
