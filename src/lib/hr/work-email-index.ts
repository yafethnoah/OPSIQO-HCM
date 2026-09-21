export type WorkEmailIndexLike = {
  workerId?: unknown;
  workerIds?: unknown;
};

function cleanWorkerId(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function workEmailOwnerIds(value: unknown) {
  const row =
    value && typeof value === 'object'
      ? (value as WorkEmailIndexLike)
      : undefined;

  const ids: string[] = [];

  const legacy = cleanWorkerId(row?.workerId);
  if (legacy) ids.push(legacy);

  if (Array.isArray(row?.workerIds)) {
    for (const item of row.workerIds as unknown[]) {
      const id = cleanWorkerId(item);
      if (id) ids.push(id);
    }
  }

  return [...new Set(ids)];
}

export function addWorkEmailOwner(value: unknown, workerId: string) {
  const next = [...workEmailOwnerIds(value), workerId.trim()].filter(Boolean);
  return [...new Set(next)].sort();
}

export function removeWorkEmailOwner(value: unknown, workerId: string) {
  const target = workerId.trim();
  return workEmailOwnerIds(value)
    .filter((id) => id !== target)
    .sort();
}