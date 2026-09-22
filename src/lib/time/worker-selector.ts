export type TimeWorkerOption = {
  id: string;
  personId?: string;
  displayName: string;
  employeeNumber: string;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
};

function normalized(value: string | undefined) {
  return String(value || "").trim().toLowerCase();
}

function timestamp(row: TimeWorkerOption) {
  const value = Date.parse(row.updatedAt || row.createdAt || "");
  return Number.isFinite(value) ? value : 0;
}

function chooseCanonical(rows: TimeWorkerOption[], preferredWorkerId?: string) {
  return [...rows].sort((a, b) => {
    const preferredA = a.id === preferredWorkerId ? 1 : 0;
    const preferredB = b.id === preferredWorkerId ? 1 : 0;
    if (preferredA !== preferredB) return preferredB - preferredA;

    const activeA = normalized(a.status) === "active" ? 1 : 0;
    const activeB = normalized(b.status) === "active" ? 1 : 0;
    if (activeA !== activeB) return activeB - activeA;

    const timeDelta = timestamp(b) - timestamp(a);
    if (timeDelta) return timeDelta;

    return a.id.localeCompare(b.id);
  })[0]!;
}

export function canonicalizeTimeWorkers(
  rows: TimeWorkerOption[],
  preferredWorkerId?: string,
) {
  const exact = new Map<string, TimeWorkerOption[]>();
  for (const row of rows.filter(Boolean)) {
    if (!row?.id) continue;
    const group = exact.get(row.id) || [];
    group.push(row);
    exact.set(row.id, group);
  }

  const uniqueById = [...exact.values()].map((group) =>
    chooseCanonical(group, preferredWorkerId),
  );

  const byPerson = new Map<string, TimeWorkerOption[]>();
  for (const row of uniqueById) {
    const personId = normalized(row.personId);
    const key = personId ? `person:${personId}` : `worker:${row.id}`;
    const group = byPerson.get(key) || [];
    group.push(row);
    byPerson.set(key, group);
  }

  const personCanonical = [...byPerson.values()].map((group) =>
    chooseCanonical(group, preferredWorkerId),
  );

  // Legacy compatibility: old/imported records can occasionally exist under
  // different worker/person IDs even though their visible employee identity is
  // identical. Collapse only the composite displayName + employeeNumber
  // signature; employee number by itself is never used as the identity key.
  const slots: Array<{ key: string; rows: TimeWorkerOption[] }> = [];
  const slotByKey = new Map<string, number>();

  for (const row of personCanonical) {
    const employeeNumber = normalized(row.employeeNumber);
    const displayName = normalized(row.displayName);
    const key =
      employeeNumber && displayName
        ? `compat:${employeeNumber}|${displayName}`
        : `worker:${row.id}`;

    const index = slotByKey.get(key);
    if (index === undefined) {
      slotByKey.set(key, slots.length);
      slots.push({ key, rows: [row] });
    } else {
      slots[index]!.rows.push(row);
    }
  }

  return slots.map((slot) => chooseCanonical(slot.rows, preferredWorkerId));
}
