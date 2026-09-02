"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLegacySurfaceTranslation } from "@/lib/opsiqo-one/legacy-surface-i18n";
import { activeOrgId, apiFetch } from "@/lib/http/client";
import { ResumeIntakeAssistant } from "@/components/resume-intake-assistant";
import { AtsRecruitingPanel } from "@/components/ats-recruiting-panel";
import { JobDescriptionAssistant } from "@/components/job-description-assistant";

type Req = {
  id: string;
  requisitionNumber: string;
  title: string;
  positionId: string;
  orgUnitId: string;
  hiringManagerWorkerId: string;
  employmentType: string;
  headcount: number;
  openingsRemaining: number;
  status: string;
  location?: string;
};
type App = {
  id: string;
  requisitionId: string;
  candidateId: string;
  stage: string;
  candidate?: {
    displayName: string;
    email: string;
    phone?: string;
    source?: string;
  };
  requisition?: Req;
  hiredWorkerId?: string;
  atsLatestScore?: number;
  atsLatestBand?: string;
};
type Position = {
  id: string;
  title: string;
  orgUnitId: string;
  positionCode: string;
  status?: string;
};
type Unit = { id: string; name: string };
type Worker = {
  id: string;
  displayName: string;
  employeeNumber: string;
  status: string;
};
type Interview = {
  id: string;
  applicationId: string;
  interviewType: string;
  scheduledAt: string;
  status: string;
  interviewerUids: string[];
};
type Offer = {
  id: string;
  applicationId: string;
  status: string;
  currency: string;
  baseSalary?: number;
  hourlyRate?: number;
  startDate: string;
};
const stages = [
  "applied",
  "screening",
  "interview",
  "assessment",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
];
const manualTransitions: Record<string, string[]> = {
  applied: ["screening", "interview", "assessment", "rejected", "withdrawn"],
  screening: ["interview", "assessment", "rejected", "withdrawn"],
  interview: ["assessment", "rejected", "withdrawn"],
  assessment: ["interview", "rejected", "withdrawn"],
  offer: ["rejected", "withdrawn"],
  hired: [],
  rejected: [],
  withdrawn: [],
};

export function RecruitingWorkspace() {
  const translationRoot = useRef<HTMLDivElement>(null);
  useLegacySurfaceTranslation("recruiting", translationRoot);
  const [reqs, setReqs] = useState<Req[]>([]),
    [apps, setApps] = useState<App[]>([]),
    [positions, setPositions] = useState<Position[]>([]),
    [units, setUnits] = useState<Unit[]>([]),
    [workers, setWorkers] = useState<Worker[]>([]),
    [interviews, setInterviews] = useState<Interview[]>([]),
    [offers, setOffers] = useState<Offer[]>([]),
    [permissions, setPermissions] = useState<string[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [reqUnitId, setReqUnitId] = useState(""),
    [reqPositionId, setReqPositionId] = useState("");
  const can = (p: string) => permissions.includes(p);
  const openReqs = reqs.filter((r) => r.status === "open");
  const activeApps = apps.filter(
    (a) => !["hired", "rejected", "withdrawn"].includes(a.stage),
  );
  const requisitionPositions = positions.filter(
    (p) =>
      p.orgUnitId === reqUnitId &&
      !["closed", "frozen"].includes(String(p.status || "").toLowerCase()),
  );
  const eligibleWorkers = workers.filter((w) => w.status === "active");
  const interviewApps = activeApps.filter((a) =>
    ["applied", "screening", "interview", "assessment"].includes(a.stage),
  );
  const offerApps = activeApps.filter((a) =>
    ["screening", "interview", "assessment"].includes(a.stage),
  );
  const acceptedOffers = offers.filter((o) => o.status === "accepted");
  const load = async () => {
    try {
      setError("");
      const me = await apiFetch<{ actor: { permissions: string[] } }>(
        "/api/me",
      );
      setPermissions(me.actor.permissions);
      const org = activeOrgId();
      const calls: any[] = [
        apiFetch<{ data: Req[] }>(
          `/api/organizations/${org}/recruiting/requisitions`,
        ),
        apiFetch<{ data: App[] }>(
          `/api/organizations/${org}/recruiting/applications`,
        ),
        apiFetch<{ data: Position[] }>(`/api/organizations/${org}/positions`),
        apiFetch<{ data: Unit[] }>(`/api/organizations/${org}/org-units`),
        apiFetch<{ data: Worker[] }>(
          `/api/organizations/${org}/employees?pageSize=100`,
        ),
        apiFetch<{ data: Interview[] }>(
          `/api/organizations/${org}/recruiting/interviews`,
        ),
      ];
      if (me.actor.permissions.includes("recruiting.offer"))
        calls.push(
          apiFetch<{ data: Offer[] }>(
            `/api/organizations/${org}/recruiting/offers`,
          ),
        );
      const [r, a, p, u, w, i, o] = await Promise.all(calls);
      setReqs(r.data);
      setApps(a.data);
      setPositions(p.data);
      setUnits(u.data);
      setWorkers(w.data);
      setInterviews(i.data);
      setOffers(o?.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load recruiting.");
    }
  };
  useEffect(() => {
    load();
    const onOrg = () => {
      setReqUnitId("");
      setReqPositionId("");
      void load();
    };
    window.addEventListener("opsiqo:organization-changed", onOrg);
    return () =>
      window.removeEventListener("opsiqo:organization-changed", onOrg);
  }, []);
  const metrics = useMemo(
    () => ({
      open: reqs.filter((r) => r.status === "open").length,
      applications: apps.length,
      interviews: apps.filter((a) => a.stage === "interview").length,
      offers: apps.filter((a) => a.stage === "offer").length,
      hires: apps.filter((a) => a.stage === "hired").length,
    }),
    [reqs, apps],
  );
  const submit = async (
    path: string,
    method: string,
    body: any,
    msg: string,
  ) => {
    setError("");
    setNotice("");
    try {
      await apiFetch(path, { method, body: JSON.stringify(body) });
      setNotice(msg);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    }
  };
  async function createReq(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await submit(
      `/api/organizations/${activeOrgId()}/recruiting/requisitions`,
      "POST",
      {
        title: f.get("title"),
        positionId: f.get("positionId"),
        orgUnitId: f.get("orgUnitId"),
        hiringManagerWorkerId: f.get("hiringManagerWorkerId"),
        employmentType: f.get("employmentType"),
        headcount: Number(f.get("headcount") || 1),
        location: f.get("location") || undefined,
        description: f.get("description") || undefined,
        requirements: String(f.get("requirements") || "")
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
      },
      "Requisition created.",
    );
    form.reset();
    setReqUnitId("");
    setReqPositionId("");
  }
  async function addCandidate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await submit(
      `/api/organizations/${activeOrgId()}/recruiting/applications`,
      "POST",
      {
        requisitionId: f.get("requisitionId"),
        firstName: f.get("firstName"),
        lastName: f.get("lastName"),
        email: f.get("email"),
        phone: f.get("phone") || undefined,
        location: f.get("location") || undefined,
        linkedinUrl: f.get("linkedinUrl") || undefined,
        source: f.get("source") || undefined,
        resumeText: f.get("resumeText") || undefined,
        consent: f.get("consent") === "on",
      },
      "Candidate application added.",
    );
    form.reset();
  }
  async function scheduleInterview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await submit(
      `/api/organizations/${activeOrgId()}/recruiting/interviews`,
      "POST",
      {
        applicationId: f.get("applicationId"),
        interviewType: f.get("interviewType"),
        scheduledAt: new Date(String(f.get("scheduledAt"))).toISOString(),
        durationMinutes: Number(f.get("durationMinutes") || 60),
        interviewerWorkerIds: f
          .getAll("interviewerWorkerIds")
          .map((v) => String(v))
          .filter(Boolean),
        meetingUrl: f.get("meetingUrl") || undefined,
      },
      "Interview scheduled.",
    );
    form.reset();
  }
  async function score(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const id = String(f.get("interviewId"));
    await submit(
      `/api/organizations/${activeOrgId()}/recruiting/interviews/${id}/scorecards`,
      "POST",
      {
        recommendation: f.get("recommendation"),
        ratings: [
          ["Role capability", "role"],
          ["Evidence quality", "evidence"],
          ["Collaboration", "collaboration"],
        ].map(([criterion, name]) => ({
          criterion,
          rating: Number(f.get(name)),
          evidence: String(f.get(`${name}Note`) || "") || undefined,
        })),
        overallComment: f.get("overallComment") || undefined,
      },
      "Scorecard submitted.",
    );
    form.reset();
  }
  async function createOffer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await submit(
      `/api/organizations/${activeOrgId()}/recruiting/offers`,
      "POST",
      {
        applicationId: f.get("applicationId"),
        currency: f.get("currency"),
        baseSalary: f.get("baseSalary")
          ? Number(f.get("baseSalary"))
          : undefined,
        hourlyRate: f.get("hourlyRate")
          ? Number(f.get("hourlyRate"))
          : undefined,
        startDate: f.get("startDate"),
        expiresAt: f.get("expiresAt") || undefined,
        notes: f.get("notes") || undefined,
      },
      "Offer draft created.",
    );
    form.reset();
  }
  async function hire(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const offerId = String(f.get("offerId") || "");
    const accepted = offers.find(
      (o) => o.id === offerId && o.status === "accepted",
    );
    if (!accepted) {
      setError("Select a valid accepted offer.");
      return;
    }
    await submit(
      `/api/organizations/${activeOrgId()}/recruiting/hire`,
      "POST",
      {
        applicationId: accepted.applicationId,
        offerId,
        workEmail: f.get("workEmail"),
        hireDate: f.get("hireDate"),
        employmentType: f.get("employmentType"),
      },
      "Candidate converted to employee and position occupancy updated.",
    );
    form.reset();
  }
  return (
    <div ref={translationRoot} className="stack">
      {error && <div className="error">{error}</div>}
      {notice && <div className="success">{notice}</div>}
      <div className="grid4">
        <Metric label="Open requisitions" value={metrics.open} />
        <Metric label="Applications" value={metrics.applications} />
        <Metric label="In interview" value={metrics.interviews} />
        <Metric
          label="Offers / hires"
          value={metrics.offers + metrics.hires}
          foot={`${metrics.hires} hires`}
        />
      </div>
      {(can("recruiting.manage") || can("recruiting.manage.team")) && (
        <div className="grid2">
          <form
            id="requisition-create-form"
            className="card stack"
            onSubmit={createReq}
          >
            <h2 className="sectionTitle">Create requisition</h2>
            <JobDescriptionAssistant formId="requisition-create-form" />
            {(!units.length || !eligibleWorkers.length) && (
              <div className="notice" role="status">
                Complete company setup before creating a requisition.
                {!units.length && <> Add an organization unit and position in <a href="/organization">Organization</a>.</>}
                {!eligibleWorkers.length && <> Add or activate a hiring manager in <a href="/people">People</a>.</>}
              </div>
            )}
            <div className="formGrid">
              <Field name="title" label="Requisition title" required />
              <label className="field">
                <span>Org unit</span>
                <select
                  required
                  className="input"
                  name="orgUnitId"
                  value={reqUnitId}
                  onChange={(e) => {
                    setReqUnitId(e.target.value);
                    setReqPositionId("");
                  }}
                  disabled={!units.length}
                >
                  <option value="">
                    {units.length
                      ? "Select organization unit"
                      : "No organization units available"}
                  </option>
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
                  required
                  className="input"
                  name="positionId"
                  value={reqPositionId}
                  onChange={(e) => setReqPositionId(e.target.value)}
                  disabled={!reqUnitId || requisitionPositions.length === 0}
                >
                  <option value="">
                    {!reqUnitId
                      ? "Select organization unit first"
                      : requisitionPositions.length
                        ? "Select applicable position"
                        : "No applicable positions available"}
                  </option>
                  {requisitionPositions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} · {p.positionCode}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Hiring manager</span>
                <select
                  required
                  className="input"
                  name="hiringManagerWorkerId"
                  disabled={!eligibleWorkers.length}
                >
                  <option value="">
                    {eligibleWorkers.length
                      ? "Select active manager"
                      : "No active managers available"}
                  </option>
                  {eligibleWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Employment type</span>
                <select
                  className="input"
                  name="employmentType"
                  defaultValue="permanent"
                >
                  <option>permanent</option>
                  <option>temporary</option>
                  <option>contractor</option>
                  <option>intern</option>
                  <option>volunteer</option>
                </select>
              </label>
              <Field
                name="headcount"
                label="Headcount"
                type="number"
                defaultValue="1"
              />
              <Field name="location" label="Location" />
            </div>
            <label className="field">
              <span>Requirements · one per line</span>
              <textarea className="input" name="requirements" rows={4} />
            </label>
            <label className="field">
              <span>Role description</span>
              <textarea className="input" name="description" rows={6} />
            </label>
            <button
              className="button"
              disabled={!reqUnitId || !reqPositionId || !eligibleWorkers.length}
            >
              Create draft
            </button>
          </form>
          <form
            id="candidate-application-form"
            className="card stack"
            onSubmit={addCandidate}
          >
            <h2 className="sectionTitle">Add candidate application</h2>
            <ResumeIntakeAssistant formId="candidate-application-form" />
            <label className="field">
              <span>Open requisition</span>
              <select
                required
                className="input"
                name="requisitionId"
                disabled={!openReqs.length}
              >
                <option value="">
                  {openReqs.length
                    ? "Select open requisition"
                    : "No open requisitions available"}
                </option>
                {openReqs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.requisitionNumber} · {r.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="formGrid">
              <Field name="firstName" label="First name" required />
              <Field name="lastName" label="Last name" required />
              <Field name="email" label="Email" type="email" required />
              <Field name="phone" label="Phone" />
              <Field name="location" label="Location" />
              <Field name="linkedinUrl" label="LinkedIn URL" type="url" />
              <Field
                name="source"
                label="Source"
                placeholder="Referral / LinkedIn / Career site"
              />
            </div>
            <label className="field">
              <span>Resume / profile text</span>
              <textarea className="input" name="resumeText" rows={6} />
            </label>
            <label className="field">
              <span>
                <input type="checkbox" name="consent" required /> I confirm the
                candidate has consented to storage and recruitment processing of
                the submitted information.
              </span>
            </label>
            <div className="notice">
              Consent evidence is stored with the application. Candidate
              identity is deduplicated by normalized email, while applications
              remain requisition-specific.
            </div>
            <button className="button" disabled={!openReqs.length}>
              Add application
            </button>
          </form>
        </div>
      )}
      <section className="card tableWrap">
        <div className="toolbar">
          <h2 className="sectionTitle">Requisitions</h2>
          <span className="muted">Approval-controlled headcount demand</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Requisition</th>
              <th>Position</th>
              <th>Manager</th>
              <th>Openings</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reqs.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.title}</strong>
                  <div className="muted">
                    {r.requisitionNumber} · {r.location || "No location"}
                  </div>
                </td>
                <td>
                  {positions.find((p) => p.id === r.positionId)?.title ||
                    r.positionId}
                </td>
                <td>
                  {workers.find((w) => w.id === r.hiringManagerWorkerId)
                    ?.displayName || r.hiringManagerWorkerId}
                </td>
                <td>
                  {r.openingsRemaining}/{r.headcount}
                </td>
                <td>
                  <span className="badge">{r.status.replaceAll("_", " ")}</span>
                </td>
                <td>
                  <div className="stepActions">
                    {r.status === "draft" && (
                      <Action
                        text="Submit"
                        onClick={() =>
                          submit(
                            `/api/organizations/${activeOrgId()}/recruiting/requisitions/${r.id}`,
                            "PATCH",
                            { action: "submit" },
                            "Requisition submitted for approval.",
                          )
                        }
                      />
                    )}{" "}
                    {r.status === "pending_approval" &&
                      can("recruiting.approve") && (
                        <Action
                          text="Approve"
                          onClick={() =>
                            submit(
                              `/api/organizations/${activeOrgId()}/recruiting/requisitions/${r.id}`,
                              "PATCH",
                              { action: "approve" },
                              "Requisition approved.",
                            )
                          }
                        />
                      )}{" "}
                    {["approved", "on_hold"].includes(r.status) &&
                      (can("recruiting.manage") ||
                        can("recruiting.manage.team")) && (
                        <Action
                          text="Open"
                          onClick={() =>
                            submit(
                              `/api/organizations/${activeOrgId()}/recruiting/requisitions/${r.id}`,
                              "PATCH",
                              { action: "open" },
                              "Requisition opened.",
                            )
                          }
                        />
                      )}{" "}
                    {r.status === "open" &&
                      (can("recruiting.manage") ||
                        can("recruiting.manage.team")) && (
                        <Action
                          text="Hold"
                          onClick={() =>
                            submit(
                              `/api/organizations/${activeOrgId()}/recruiting/requisitions/${r.id}`,
                              "PATCH",
                              { action: "hold" },
                              "Requisition placed on hold.",
                            )
                          }
                        />
                      )}{" "}
                    {["open", "on_hold"].includes(r.status) &&
                      can("recruiting.offer") && (
                        <Action
                          text="Close"
                          onClick={() =>
                            submit(
                              `/api/organizations/${activeOrgId()}/recruiting/requisitions/${r.id}`,
                              "PATCH",
                              { action: "close" },
                              "Requisition closed.",
                            )
                          }
                        />
                      )}{" "}
                    {[
                      "draft",
                      "pending_approval",
                      "approved",
                      "open",
                      "on_hold",
                    ].includes(r.status) &&
                      can("recruiting.offer") && (
                        <Action
                          text="Cancel"
                          onClick={() =>
                            submit(
                              `/api/organizations/${activeOrgId()}/recruiting/requisitions/${r.id}`,
                              "PATCH",
                              { action: "cancel" },
                              "Requisition cancelled.",
                            )
                          }
                        />
                      )}
                  </div>
                </td>
              </tr>
            ))}
            {!reqs.length && (
              <tr>
                <td colSpan={6} className="muted">
                  No requisitions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      {can("recruiting.read") && (
        <AtsRecruitingPanel
          applications={apps}
          canManage={can("recruiting.manage") || can("recruiting.manage.team")}
        />
      )}
      <section className="stack">
        <div className="toolbar">
          <h2 className="sectionTitle">Candidate pipeline</h2>
          <span className="muted">
            One candidate identity · requisition-specific applications
          </span>
        </div>
        <div className="kanban">
          {stages.map((stage) => (
            <div className="kanbanColumn" key={stage}>
              <div className="kanbanHeader">
                <strong>{stage}</strong>
                <span>{apps.filter((a) => a.stage === stage).length}</span>
              </div>
              {apps
                .filter((a) => a.stage === stage)
                .map((a) => (
                  <div className="candidateCard" key={a.id}>
                    <strong>{a.candidate?.displayName || a.candidateId}</strong>
                    <span>
                      {a.requisition?.requisitionNumber} ·{" "}
                      {a.requisition?.title}
                    </span>
                    <span>{a.candidate?.email}</span>
                    {typeof a.atsLatestScore === "number" && (
                      <span className="badge">
                        ATS {a.atsLatestScore}% ·{" "}
                        {(a.atsLatestBand || "reviewed").replaceAll("_", " ")}
                      </span>
                    )}
                    {(can("recruiting.manage") ||
                      can("recruiting.manage.team")) &&
                      !["hired", "rejected", "withdrawn"].includes(a.stage) && (
                        <select
                          aria-label={`Move ${a.candidate?.displayName || "candidate"} application stage`}
                          className="input compact"
                          value=""
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v)
                              submit(
                                `/api/organizations/${activeOrgId()}/recruiting/applications/${a.id}`,
                                "PATCH",
                                {
                                  stage: v,
                                  dispositionReason:
                                    v === "rejected"
                                      ? "Recruiter disposition"
                                      : "Pipeline progression",
                                },
                                `Application moved to ${v}.`,
                              );
                          }}
                        >
                          <option value="">Move…</option>
                          {manualTransitions[a.stage]
                            .filter(
                              (x) =>
                                can("recruiting.offer") ||
                                [
                                  "screening",
                                  "interview",
                                  "assessment",
                                ].includes(x),
                            )
                            .map((x) => (
                              <option key={x}>{x}</option>
                            ))}
                        </select>
                      )}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </section>
      {can("recruiting.interview") && (
        <div className="grid2">
          <form className="card stack" onSubmit={scheduleInterview}>
            <h2 className="sectionTitle">Schedule interview</h2>
            <label className="field">
              <span>Application</span>
              <select
                className="input"
                required
                name="applicationId"
                disabled={!interviewApps.length}
              >
                <option value="">
                  {interviewApps.length
                    ? "Select eligible application"
                    : "No interview-eligible applications"}
                </option>
                {interviewApps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.candidate?.displayName} · {a.requisition?.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="formGrid">
              <label className="field">
                <span>Type</span>
                <select
                  className="input"
                  name="interviewType"
                  defaultValue="structured"
                >
                  <option>screening</option>
                  <option>structured</option>
                  <option>panel</option>
                  <option>technical</option>
                  <option>final</option>
                </select>
              </label>
              <Field
                name="scheduledAt"
                label="Scheduled"
                type="datetime-local"
                required
              />
              <Field
                name="durationMinutes"
                label="Minutes"
                type="number"
                defaultValue="60"
              />
              <label className="field">
                <span>Interviewers</span>
                <select
                  className="input"
                  name="interviewerWorkerIds"
                  multiple
                  required
                  size={4}
                >
                  {eligibleWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.displayName} · {w.employeeNumber}
                    </option>
                  ))}
                </select>
              </label>
              <Field name="meetingUrl" label="Meeting URL" type="url" />
            </div>
            <button
              className="button"
              disabled={!interviewApps.length || !eligibleWorkers.length}
            >
              Schedule
            </button>
          </form>
          <form className="card stack" onSubmit={score}>
            <h2 className="sectionTitle">Structured scorecard</h2>
            <label className="field">
              <span>Interview</span>
              <select
                required
                className="input"
                name="interviewId"
                disabled={!interviews.length}
              >
                <option value="">
                  {interviews.length
                    ? "Select interview"
                    : "No interviews available"}
                </option>
                {interviews.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.interviewType} ·{" "}
                    {new Date(i.scheduledAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Recommendation</span>
              <select
                className="input"
                name="recommendation"
                defaultValue="yes"
              >
                <option value="strong_yes">strong yes</option>
                <option value="yes">yes</option>
                <option value="mixed">mixed</option>
                <option value="no">no</option>
                <option value="strong_no">strong no</option>
              </select>
            </label>
            {[
              ["role", "Role capability"],
              ["evidence", "Evidence quality"],
              ["collaboration", "Collaboration"],
            ].map(([n, l]) => (
              <div className="scoreRow" key={n}>
                <label>
                  {l}
                  <input
                    className="input"
                    name={n}
                    type="number"
                    min="1"
                    max="5"
                    defaultValue="3"
                    required
                  />
                </label>
                <input
                  aria-label={`${l} evidence or observation`}
                  className="input"
                  name={`${n}Note`}
                  placeholder="Evidence / observation"
                />
              </div>
            ))}
            <label className="field">
              <span>Overall comment</span>
              <textarea className="input" name="overallComment" rows={3} />
            </label>
            <button className="button" disabled={!interviews.length}>
              Submit immutable scorecard
            </button>
          </form>
        </div>
      )}
      {can("recruiting.offer") && (
        <div className="grid2">
          <form className="card stack" onSubmit={createOffer}>
            <h2 className="sectionTitle">Prepare offer</h2>
            <label className="field">
              <span>Application</span>
              <select
                required
                className="input"
                name="applicationId"
                disabled={!offerApps.length}
              >
                <option value="">
                  {offerApps.length
                    ? "Select offer-eligible application"
                    : "No offer-eligible applications"}
                </option>
                {offerApps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.candidate?.displayName} · {a.requisition?.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="formGrid">
              <Field
                name="currency"
                label="Currency"
                defaultValue="CAD"
                required
              />
              <Field name="baseSalary" label="Annual salary" type="number" />
              <Field name="hourlyRate" label="Hourly rate" type="number" />
              <Field name="startDate" label="Start date" type="date" required />
              <Field name="expiresAt" label="Expires" type="date" />
            </div>
            <label className="field">
              <span>Notes</span>
              <textarea className="input" name="notes" rows={3} />
            </label>
            <button className="button" disabled={!offerApps.length}>
              Create offer draft
            </button>
          </form>
          <section className="card tableWrap">
            <h2 className="sectionTitle">Offer governance</h2>
            <table>
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Compensation</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {apps.find((a) => a.id === o.applicationId)?.candidate
                        ?.displayName || o.applicationId.slice(0, 8)}
                    </td>
                    <td>
                      {o.currency}{" "}
                      {o.baseSalary?.toLocaleString() || `${o.hourlyRate}/hr`}
                    </td>
                    <td>
                      <span className="badge">{o.status}</span>
                    </td>
                    <td>
                      <div className="stepActions">
                        {o.status === "draft" && (
                          <Action
                            text="Submit"
                            onClick={() =>
                              submit(
                                `/api/organizations/${activeOrgId()}/recruiting/offers/${o.id}`,
                                "PATCH",
                                { action: "submit" },
                                "Offer submitted.",
                              )
                            }
                          />
                        )}{" "}
                        {o.status === "pending_approval" &&
                          can("recruiting.approve") && (
                            <Action
                              text="Approve"
                              onClick={() =>
                                submit(
                                  `/api/organizations/${activeOrgId()}/recruiting/offers/${o.id}`,
                                  "PATCH",
                                  { action: "approve" },
                                  "Offer approved.",
                                )
                              }
                            />
                          )}{" "}
                        {o.status === "approved" && (
                          <Action
                            text="Mark sent"
                            onClick={() =>
                              submit(
                                `/api/organizations/${activeOrgId()}/recruiting/offers/${o.id}`,
                                "PATCH",
                                { action: "send" },
                                "Offer marked sent.",
                              )
                            }
                          />
                        )}{" "}
                        {o.status === "sent" && (
                          <>
                            <Action
                              text="Record accept"
                              onClick={() =>
                                submit(
                                  `/api/organizations/${activeOrgId()}/recruiting/offers/${o.id}`,
                                  "PATCH",
                                  { action: "accept" },
                                  "Offer accepted.",
                                )
                              }
                            />
                            <Action
                              text="Record decline"
                              onClick={() =>
                                submit(
                                  `/api/organizations/${activeOrgId()}/recruiting/offers/${o.id}`,
                                  "PATCH",
                                  { action: "decline" },
                                  "Offer declined.",
                                )
                              }
                            />
                          </>
                        )}{" "}
                        {[
                          "draft",
                          "pending_approval",
                          "approved",
                          "sent",
                        ].includes(o.status) && (
                          <Action
                            text="Withdraw"
                            onClick={() =>
                              submit(
                                `/api/organizations/${activeOrgId()}/recruiting/offers/${o.id}`,
                                "PATCH",
                                { action: "withdraw" },
                                "Offer withdrawn.",
                              )
                            }
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
      {can("recruiting.hire") && (
        <form className="card stack" onSubmit={hire}>
          <h2 className="sectionTitle">Convert accepted offer to employee</h2>
          <div className="formGrid">
            <label className="field">
              <span>Accepted offer</span>
              <select
                required
                className="input"
                name="offerId"
                disabled={!acceptedOffers.length}
              >
                <option value="">
                  {acceptedOffers.length
                    ? "Select accepted offer"
                    : "No accepted offers available"}
                </option>
                {acceptedOffers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {
                      apps.find((a) => a.id === o.applicationId)?.candidate
                        ?.displayName
                    }{" "}
                    · {o.startDate}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span>Employee number</span>
              <div className="input" role="status">
                Assigned automatically on hire
              </div>
            </div>
            <Field name="workEmail" label="Work email" type="email" required />
            <Field name="hireDate" label="Hire date" type="date" required />
            <label className="field">
              <span>Employment type</span>
              <select
                className="input"
                name="employmentType"
                defaultValue="permanent"
              >
                <option>permanent</option>
                <option>temporary</option>
                <option>contractor</option>
                <option>intern</option>
                <option>volunteer</option>
              </select>
            </label>
          </div>
          <div className="notice">
            Hire conversion creates the Person → Worker → Employment →
            Assignment chain, updates position occupancy, closes requisition
            openings, emits domain events, and writes audit evidence.
          </div>
          <button className="button" disabled={!acceptedOffers.length}>
            Create employee
          </button>
        </form>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  foot,
}: {
  label: string;
  value: number;
  foot?: string;
}) {
  return (
    <div className="card">
      <div className="metricLabel">{label}</div>
      <div className="metricValue">{value}</div>
      <div className="metricFoot">{foot || "Live recruiting data"}</div>
    </div>
  );
}
function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="input"
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </label>
  );
}
function Action({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button type="button" className="button secondary" onClick={onClick}>
      {text}
    </button>
  );
}
