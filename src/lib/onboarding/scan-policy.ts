import type { OnboardingTask, PrehireDocument } from '@/domain/onboarding';

export type PrehireScanGateResult =
  | { ok: true }
  | { ok: false; code: 'prehire_document_missing' | 'prehire_document_quarantined' | 'prehire_scan_required'; taskTitle: string };

export function latestPrehireDocumentForTask(documents: PrehireDocument[], taskId: string): PrehireDocument | undefined {
  return documents
    .filter((document) => document.taskId === taskId)
    .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)))[0];
}

export function evaluateRequiredPrehireDocumentScans(
  tasks: OnboardingTask[],
  documents: PrehireDocument[],
  requireClean: boolean,
): PrehireScanGateResult {
  if (!requireClean) return { ok: true };
  const requiredTasks = tasks.filter((task) => task.taskType === 'document' && task.required && task.blockingActivation);
  for (const task of requiredTasks) {
    const latest = latestPrehireDocumentForTask(documents, task.id);
    if (!latest) return { ok: false, code: 'prehire_document_missing', taskTitle: task.title };
    if (latest.scanStatus === 'blocked') return { ok: false, code: 'prehire_document_quarantined', taskTitle: task.title };
    if (latest.scanStatus !== 'clean') return { ok: false, code: 'prehire_scan_required', taskTitle: task.title };
  }
  return { ok: true };
}
