"use client";

import { useMemo, useState, type CSSProperties } from "react";

export type GovernedGanttStatus =
  | "not_started"
  | "ready"
  | "in_progress"
  | "waiting"
  | "blocked"
  | "completed"
  | "cancelled";

export type GovernedGanttTask = {
  id: string;
  title: string;
  owner?: string;
  status: GovernedGanttStatus;
  start: string;
  end: string;
  progressPercent?: number | null;
  dependencies?: string[];
  blocker?: string;
  risk?: "low" | "medium" | "high" | "critical";
  milestone?: boolean;
};

type Zoom = "day" | "week" | "month";

function dateValue(value: string) {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

function boundedProgress(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusLabel(status: GovernedGanttStatus) {
  return status.replaceAll("_", " ");
}

function isOverdue(task: GovernedGanttTask, now: number) {
  const end = dateValue(task.end);
  return end !== null && end < now && task.status !== "completed" && task.status !== "cancelled";
}

/**
 * Dependency-free governed Gantt.
 *
 * Progress MUST come from authoritative task/workflow state supplied by the caller.
 * This component never derives task completion from elapsed calendar time.
 */
export function GovernedGantt({
  tasks,
  now = new Date(),
}: {
  tasks: GovernedGanttTask[];
  now?: Date;
}) {
  const [zoom, setZoom] = useState<Zoom>("week");
  const [status, setStatus] = useState<GovernedGanttStatus | "all">("all");
  const [owner, setOwner] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const owners = useMemo(
    () => [...new Set(tasks.map(t => t.owner).filter(Boolean) as string[])].sort(),
    [tasks],
  );

  const visible = useMemo(
    () =>
      tasks.filter(
        task =>
          (status === "all" || task.status === status) &&
          (owner === "all" || task.owner === owner),
      ),
    [tasks, status, owner],
  );

  const bounds = useMemo(() => {
    const starts = visible.map(t => dateValue(t.start)).filter((v): v is number => v !== null);
    const ends = visible.map(t => dateValue(t.end)).filter((v): v is number => v !== null);
    const min = starts.length ? Math.min(...starts) : now.getTime();
    const max = ends.length ? Math.max(...ends) : min + 86_400_000;
    return { min, max: Math.max(max, min + 86_400_000), span: Math.max(86_400_000, max - min) };
  }, [visible, now]);

  const selected = visible.find(t => t.id === selectedId) ?? null;
  const todayPct = ((now.getTime() - bounds.min) / bounds.span) * 100;

  const shell: CSSProperties = {
    border: "1px solid #d8dee8",
    borderRadius: 12,
    overflow: "hidden",
    background: "var(--opsiqo-surface, #fff)",
  };
  const row: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) minmax(360px, 2fr)",
    minHeight: 58,
    borderTop: "1px solid #e8edf3",
  };

  return (
    <section aria-labelledby="governed-gantt-title">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", marginBottom: 12 }}>
        <div>
          <h2 id="governed-gantt-title" style={{ marginBottom: 4 }}>Plan timeline</h2>
          <p style={{ margin: 0 }}>
            Progress is based on authoritative workflow/task state, never elapsed time.
          </p>
        </div>
        <label>
          Zoom
          <select value={zoom} onChange={e => setZoom(e.target.value as Zoom)}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={e => setStatus(e.target.value as typeof status)}>
            <option value="all">All</option>
            <option value="not_started">Not started</option>
            <option value="ready">Ready</option>
            <option value="in_progress">In progress</option>
            <option value="waiting">Waiting</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label>
          Owner
          <select value={owner} onChange={e => setOwner(e.target.value)}>
            <option value="all">All</option>
            {owners.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <span aria-label={`Timeline zoom ${zoom}`}>View: {zoom}</span>
      </div>

      <div style={shell}>
        <div style={{ ...row, borderTop: 0, fontWeight: 700 }}>
          <div style={{ padding: 12 }}>Task / owner / state</div>
          <div style={{ padding: 12, position: "relative" }}>
            Timeline
            {todayPct >= 0 && todayPct <= 100 ? (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: `${todayPct}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "currentColor",
                  opacity: 0.35,
                }}
              />
            ) : null}
          </div>
        </div>

        {visible.map(task => {
          const start = dateValue(task.start) ?? bounds.min;
          const end = dateValue(task.end) ?? start;
          const left = Math.max(0, Math.min(100, ((start - bounds.min) / bounds.span) * 100));
          const width = task.milestone
            ? 1.4
            : Math.max(1.5, Math.min(100 - left, ((Math.max(end, start) - start) / bounds.span) * 100));
          const progress = boundedProgress(task.progressPercent);
          const overdue = isOverdue(task, now.getTime());

          return (
            <button
              type="button"
              key={task.id}
              onClick={() => setSelectedId(task.id)}
              aria-label={`${task.title}, ${statusLabel(task.status)}${overdue ? ", overdue" : ""}`}
              style={{
                ...row,
                width: "100%",
                textAlign: "left",
                borderLeft: 0,
                borderRight: 0,
                borderBottom: 0,
                background: "transparent",
                color: "inherit",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <span style={{ padding: 12 }}>
                <strong>{task.title}</strong>
                <span style={{ display: "block" }}>
                  {task.owner || "Unassigned"} · {statusLabel(task.status)}
                  {overdue ? " · Overdue" : ""}
                  {task.risk ? ` · ${task.risk} risk` : ""}
                </span>
                {task.blocker ? <span style={{ display: "block" }}>Blocker: {task.blocker}</span> : null}
              </span>
              <span style={{ padding: 12, position: "relative", minHeight: 58 }}>
                <span
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    width: `${width}%`,
                    top: 18,
                    minWidth: task.milestone ? 10 : 12,
                    height: task.milestone ? 10 : 22,
                    transform: task.milestone ? "rotate(45deg)" : undefined,
                    border: "1px solid currentColor",
                    borderRadius: task.milestone ? 1 : 6,
                    overflow: "hidden",
                  }}
                >
                  {!task.milestone && progress !== null ? (
                    <span
                      aria-hidden="true"
                      style={{
                        display: "block",
                        width: `${progress}%`,
                        height: "100%",
                        background: "currentColor",
                        opacity: 0.18,
                      }}
                    />
                  ) : null}
                </span>
                <span style={{ position: "absolute", bottom: 2, left: 12, fontSize: 12 }}>
                  {task.start} → {task.end}
                  {progress !== null ? ` · ${progress}%` : " · Progress unavailable"}
                </span>
              </span>
            </button>
          );
        })}

        {visible.length === 0 ? <p style={{ padding: 16 }}>No tasks match the selected filters.</p> : null}
      </div>

      {selected ? (
        <aside aria-label="Selected task details" style={{ marginTop: 12, padding: 12, border: "1px solid #d8dee8", borderRadius: 12 }}>
          <h3>{selected.title}</h3>
          <dl>
            <dt>Status</dt><dd>{statusLabel(selected.status)}</dd>
            <dt>Owner</dt><dd>{selected.owner || "Unassigned"}</dd>
            <dt>Start</dt><dd>{selected.start}</dd>
            <dt>End</dt><dd>{selected.end}</dd>
            <dt>Progress basis</dt><dd>{boundedProgress(selected.progressPercent) === null ? "Not available from authoritative state" : `${boundedProgress(selected.progressPercent)}% authoritative progress`}</dd>
            <dt>Dependencies</dt><dd>{selected.dependencies?.join(", ") || "None"}</dd>
            <dt>Blocker</dt><dd>{selected.blocker || "None"}</dd>
          </dl>
        </aside>
      ) : null}

      <details style={{ marginTop: 12 }}>
        <summary>Accessible task table</summary>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Task</th><th>Owner</th><th>Status</th><th>Start</th><th>End</th>
                <th>Progress</th><th>Dependencies</th><th>Blocker</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(task => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{task.owner || "Unassigned"}</td>
                  <td>{statusLabel(task.status)}</td>
                  <td>{task.start}</td>
                  <td>{task.end}</td>
                  <td>{boundedProgress(task.progressPercent) === null ? "Unavailable" : `${boundedProgress(task.progressPercent)}%`}</td>
                  <td>{task.dependencies?.join(", ") || "None"}</td>
                  <td>{task.blocker || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
