'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { EmptyState, LoadingState } from '@/components/data-states';
import { useLegacySurfaceTranslation } from '@/lib/opsiqo-one/legacy-surface-i18n';

type Worker = {
  id: string;
  displayName: string;
  employeeNumber: string;
  workEmail: string;
  status: string;
  hireDate?: string;
};
type Unit = { id: string; name: string };
type Position = {
  id: string;
  title: string;
  orgUnitId: string;
  availableHeadcount: number;
  capacityState: string;
  status?: string;
};
type EmployeeDetail = {
  worker: Worker;
  person: {
    legalFirstName: string;
    legalLastName: string;
    preferredName?: string;
    personalEmail?: string;
    phone?: string;
  } | null;
  employments: Array<{
    id: string;
    employmentType: string;
    startDate: string;
    status: string;
    fte: number;
  }>;
};

function duplicateKey(worker: Worker) {
  return worker.displayName.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function PeopleTable() {
  const translationRoot = useRef<HTMLDivElement>(null);
  useLegacySurfaceTranslation('people_table', translationRoot);

  const [data, setData] = useState<Worker[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [show, setShow] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [query, setQuery] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [editing, setEditing] = useState<EmployeeDetail | null>(null);
  const [editingBusy, setEditingBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState('');

  const load = async (cursor?: string, append = false, q = query) => {
    const org = activeOrgId();
    try {
      if (!append) setLoading(true);
      setError('');
      const params = new URLSearchParams({ pageSize: '50' });
      if (q.trim()) params.set('q', q.trim());
      if (cursor) params.set('cursor', cursor);

      const [w, u, p, me] = await Promise.all([
        apiFetch<{ data: Worker[]; nextCursor: string | null }>(
          `/api/organizations/${org}/employees?${params}`,
        ),
        apiFetch<{ data: Unit[] }>(`/api/organizations/${org}/org-units`),
        apiFetch<{ data: Position[] }>(`/api/organizations/${org}/positions`),
        apiFetch<{ actor: { permissions: string[] } }>('/api/me'),
      ]);

      setData((current) => (append ? [...current, ...w.data] : w.data));
      setNextCursor(w.nextCursor);
      setUnits(u.data);
      setPositions(p.data);
      setCanManage(me.actor.permissions.includes('people.manage'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load people.');
    } finally {
      if (!append) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const h = () => {
      setData([]);
      setNextCursor(null);
      setSelectedUnit('');
      setSelectedPosition('');
      setEditing(null);
      void load(undefined, false, '');
    };
    window.addEventListener('opsiqo:organization-changed', h);
    window.addEventListener('opsiqo:employees-imported', h);
    return () => {
      window.removeEventListener('opsiqo:organization-changed', h);
      window.removeEventListener('opsiqo:employees-imported', h);
    };
  }, []);

  const duplicateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const worker of data) {
      const key = duplicateKey(worker);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [data]);

  const duplicateCandidates = useMemo(
    () => data.filter((worker) => (duplicateCounts.get(duplicateKey(worker)) || 0) > 1),
    [data, duplicateCounts],
  );

  const availablePositions = positions.filter(
    (p) =>
      p.orgUnitId === selectedUnit &&
      p.availableHeadcount > 0 &&
      !['full', 'closed', 'frozen'].includes(String(p.capacityState || '').toLowerCase()) &&
      !['closed', 'frozen'].includes(String(p.status || '').toLowerCase()),
  );
  const invalidAssignment = Boolean(selectedUnit) !== Boolean(selectedPosition);
  const noCapacity = !!selectedUnit && availablePositions.length === 0;

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (invalidAssignment || noCapacity) {
      setError(
        noCapacity
          ? 'The selected organization unit has no available position capacity. Create or open a position before assigning this employee.'
          : 'Select both an organization unit and an available position, or leave both unassigned.',
      );
      return;
    }

    setCreating(true);
    setError('');
    setMessage('');
    const form = e.currentTarget;
    const f = new FormData(form);

    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/employees`, {
        method: 'POST',
        body: JSON.stringify({
          legalFirstName: f.get('firstName'),
          legalLastName: f.get('lastName'),
          workEmail: String(f.get('email') || '').trim() || undefined,
          employmentType: f.get('employmentType'),
          hireDate: f.get('hireDate'),
          orgUnitId: selectedUnit || undefined,
          positionId: selectedPosition || undefined,
          managerWorkerId: f.get('managerWorkerId') || undefined,
        }),
      });

      form.reset();
      setSelectedUnit('');
      setSelectedPosition('');
      setShow(false);
      setMessage('Employee created.');
      await load();
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Unable to create employee.';
      setError(
        m.includes('positionId and orgUnitId')
          ? 'Select both an organization unit and an available position, or leave both unassigned.'
          : m,
      );
    } finally {
      setCreating(false);
    }
  }

  async function openEdit(workerId: string) {
    setError('');
    setMessage('');
    setEditingBusy(true);
    try {
      const result = await apiFetch<{ data: EmployeeDetail }>(
        `/api/organizations/${activeOrgId()}/employees/${workerId}`,
      );
      setEditing(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to open employee for editing.');
    } finally {
      setEditingBusy(false);
    }
  }

  async function saveCorrection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;

    setEditingBusy(true);
    setError('');
    setMessage('');
    const f = new FormData(e.currentTarget);

    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/employees/${editing.worker.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          legalFirstName: String(f.get('legalFirstName') || '').trim(),
          legalLastName: String(f.get('legalLastName') || '').trim(),
          preferredName: String(f.get('preferredName') || '').trim(),
          workEmail: String(f.get('workEmail') || '').trim(),
          personalEmail: String(f.get('personalEmail') || '').trim(),
          phone: String(f.get('phone') || '').trim(),
          employeeNumber: String(f.get('employeeNumber') || '').trim(),
          employmentType: String(f.get('employmentType') || '').trim(),
          hireDate: String(f.get('hireDate') || '').trim(),
          reason: String(f.get('reason') || '').trim(),
        }),
      });

      setEditing(null);
      setMessage('Employee core record corrected. Prior values remain in the audit trail.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to correct employee record.');
    } finally {
      setEditingBusy(false);
    }
  }

  async function deleteDuplicate(worker: Worker) {
    setError('');
    setMessage('');

    const sameName = data.filter((item) => duplicateKey(item) === duplicateKey(worker));
    if (sameName.length < 2) {
      setError('This record is not currently identified as a potential duplicate.');
      return;
    }

    const reason = window.prompt(
      `Reason for deleting duplicate record ${worker.displayName} (${worker.employeeNumber})?`,
      'Duplicate/test employee record',
    );
    if (!reason?.trim()) return;

    const confirmation = window.prompt(
      `Type the employee number exactly to confirm deletion:\n${worker.employeeNumber}`,
    );
    if (confirmation !== worker.employeeNumber) {
      setError('Duplicate deletion cancelled because the employee-number confirmation did not match.');
      return;
    }

    if (!window.confirm(
      `Delete duplicate worker ${worker.displayName} (${worker.employeeNumber})?\n\nOPSIQO will block this if the worker is linked to platform access, invitations, manager relationships, or downstream HR evidence.`,
    )) return;

    setDeleteBusy(worker.id);
    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/employees/${worker.id}`, {
        method: 'DELETE',
        body: JSON.stringify({
          reason: reason.trim(),
          confirmationEmployeeNumber: confirmation,
        }),
      });
      setMessage(
        `Duplicate worker ${worker.displayName} (${worker.employeeNumber}) deleted safely. Audit/tombstone evidence was retained.`,
      );
      if (editing?.worker.id === worker.id) setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete duplicate employee.');
    } finally {
      setDeleteBusy('');
    }
  }

  return (
    <div ref={translationRoot} className="stack">
      <div className="paginationBar">
        <div className="searchRow">
          <input
            aria-label="Search people"
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void load(undefined, false, query);
              }
            }}
            placeholder="Search name, email, or #employee number"
          />
          <button className="button secondary" onClick={() => load(undefined, false, query)}>
            Search
          </button>
          {canManage && (
            <button className="button" onClick={() => setShow((v) => !v)}>
              {show ? 'Cancel' : 'Add employee'}
            </button>
          )}
        </div>
        <Link href="/import-center" className="button secondary">
          Advanced Import Center
        </Link>
      </div>

      {duplicateCandidates.length > 0 && (
        <div className="notice">
          <strong>{duplicateCandidates.length} potential duplicate worker record(s) are visible on this page.</strong>
          <br />
          Review employee number, hire date and authoritative evidence before deleting. OPSIQO never auto-deletes people based on name alone.
        </div>
      )}

      {show && canManage && (
        <form className="card stack" onSubmit={create}>
          <div className="toolbar">
            <div>
              <h2 className="sectionTitle">Create employee</h2>
              <p className="muted">
                An assignment is created only when both an organization unit and an available position are selected.
              </p>
            </div>
          </div>
          <div className="formGrid">
            <Field label="First name" name="firstName" />
            <Field label="Last name" name="lastName" />
            <Field label="Work email" name="email" type="email" required={false} />
            <div className="field">
              <span>Employee number</span>
              <div className="input" role="status">
                Assigned automatically on save
              </div>
            </div>
            <label className="field">
              <span>Employment type</span>
              <select className="input" name="employmentType" defaultValue="permanent">
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary</option>
                <option value="contractor">Contractor</option>
                <option value="intern">Intern</option>
                <option value="volunteer">Volunteer</option>
              </select>
            </label>
            <Field label="Hire date" name="hireDate" type="date" />
            <label className="field">
              <span>Organization unit</span>
              <select
                className="input"
                value={selectedUnit}
                onChange={(e) => {
                  setSelectedUnit(e.target.value);
                  setSelectedPosition('');
                }}
              >
                <option value="">Unassigned</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Position</span>
              <select
                className="input"
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                disabled={!selectedUnit || noCapacity}
              >
                <option value="">
                  {!selectedUnit
                    ? 'Select an organization unit first'
                    : noCapacity
                      ? 'No available positions'
                      : 'Select an available position'}
                </option>
                {availablePositions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · {p.availableHeadcount} available
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Manager (optional)</span>
              <select className="input" name="managerWorkerId" defaultValue="">
                <option value="">No manager</option>
                {data
                  .filter((w) => w.status === 'active')
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.displayName}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {noCapacity && (
            <div className="notice">
              <strong>No available positions in this organization unit.</strong>
              <br />
              Open or create capacity before assigning this employee. <Link href="/organization">Go to Organization</Link>
            </div>
          )}
          {invalidAssignment && !noCapacity && (
            <div className="notice">
              Organization unit and position must be supplied together. Leave both unassigned if the employee will be assigned later.
            </div>
          )}
          <div>
            <button className="button" type="submit" disabled={creating || invalidAssignment || noCapacity}>
              {creating ? 'Creating…' : 'Create authoritative worker record'}
            </button>
          </div>
        </form>
      )}

      {editing && canManage && (
        <form className="card stack" onSubmit={saveCorrection}>
          <div className="toolbar">
            <div>
              <h2 className="sectionTitle">Correct employee core record</h2>
              <p className="muted">
                Corrections update authoritative person/worker fields and preserve before/after values in the audit trail.
                Use effective-dated changes on the Employee Profile for transfer, promotion, manager and status changes.
              </p>
            </div>
            <button className="button secondary" type="button" onClick={() => setEditing(null)}>
              Close
            </button>
          </div>

          <div className="formGrid">
            <Field
              label="Legal first name"
              name="legalFirstName"
              defaultValue={editing.person?.legalFirstName || ''}
            />
            <Field
              label="Legal last name"
              name="legalLastName"
              defaultValue={editing.person?.legalLastName || ''}
            />
            <Field
              label="Preferred name"
              name="preferredName"
              required={false}
              defaultValue={editing.person?.preferredName || ''}
            />
            <Field
              label="Work email"
              name="workEmail"
              type="email"
              required={false}
              defaultValue={editing.worker.workEmail || ''}
            />
            <Field
              label="Personal email"
              name="personalEmail"
              type="email"
              required={false}
              defaultValue={editing.person?.personalEmail || ''}
            />
            <Field
              label="Phone"
              name="phone"
              required={false}
              defaultValue={editing.person?.phone || ''}
            />
            <Field
              label="Employee number"
              name="employeeNumber"
              defaultValue={editing.worker.employeeNumber}
            />
            <label className="field">
              <span>Employment type</span>
              <select
                className="input"
                name="employmentType"
                defaultValue={editing.employments[0]?.employmentType || 'permanent'}
              >
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary</option>
                <option value="contractor">Contractor</option>
                <option value="intern">Intern</option>
                <option value="volunteer">Volunteer</option>
              </select>
            </label>
            <Field
              label="Hire date"
              name="hireDate"
              type="date"
              defaultValue={editing.worker.hireDate || editing.employments[0]?.startDate || ''}
            />
          </div>

          <label className="field">
            <span>Correction reason</span>
            <textarea
              required
              className="input"
              name="reason"
              rows={3}
              placeholder="Why is this authoritative correction required?"
            />
          </label>

          <div>
            <button className="button" disabled={editingBusy}>
              {editingBusy ? 'Saving…' : 'Save governed correction'}
            </button>
          </div>
        </form>
      )}

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      {loading ? (
        <LoadingState label="Loading people…" />
      ) : data.length === 0 ? (
        <EmptyState title="No people found" detail="Create an employee or import governed workforce data." />
      ) : (
        <section className="card tableWrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Number</th>
                <th>Email</th>
                <th>Status</th>
                <th>Hire date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((w) => {
                const duplicate = (duplicateCounts.get(duplicateKey(w)) || 0) > 1;
                return (
                  <tr key={w.id}>
                    <td>
                      <Link href={`/people/${w.id}`}>
                        <strong>{w.displayName}</strong>
                      </Link>
                      {duplicate && <div><span className="badge">Potential duplicate</span></div>}
                    </td>
                    <td>{w.employeeNumber}</td>
                    <td>{w.workEmail || '—'}</td>
                    <td><span className="badge">{w.status}</span></td>
                    <td>{w.hireDate || '—'}</td>
                    <td>
                      <div className="stepActions">
                        <Link className="button secondary compact" href={`/people/${w.id}`}>
                          View
                        </Link>
                        {canManage && (
                          <button
                            className="button secondary compact"
                            disabled={editingBusy || !!deleteBusy}
                            onClick={() => void openEdit(w.id)}
                          >
                            Edit
                          </button>
                        )}
                        {canManage && duplicate && (
                          <button
                            className="button dangerButton compact"
                            disabled={!!deleteBusy || editingBusy}
                            onClick={() => void deleteDuplicate(w)}
                          >
                            {deleteBusy === w.id ? 'Checking…' : 'Delete duplicate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {nextCursor && (
        <div className="paginationBar">
          <span className="muted">Server-paginated results</span>
          <button
            className="button secondary"
            disabled={loadingMore}
            onClick={async () => {
              setLoadingMore(true);
              await load(nextCursor, true, query);
              setLoadingMore(false);
            }}
          >
            {loadingMore ? 'Loading…' : 'Load next 50'}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required = true,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        required={required}
        className="input"
        name={name}
        type={type}
        defaultValue={defaultValue}
      />
    </label>
  );
}
