"use client";
import { useState } from "react";
import { activeOrgId, apiFetch } from "@/lib/http/client";

type ParsedJd = {
  title?: string;
  location?: string;
  employmentType?: string;
  description?: string;
  requirements: string[];
  preferredQualifications: string[];
  skills: string[];
  requiredYears?: number;
  warnings: string[];
  parser?: string;
  parseTrust?: number;
  aiVerified?: boolean;
  unresolvedFields?: string[];
  parserPasses?: string[];
};

function setValue(form: HTMLFormElement, name: string, value: string) {
  if (!value) return;
  const el = form.elements.namedItem(name);
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function JobDescriptionAssistant({ formId }: { formId: string }) {
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  function apply(form: HTMLFormElement, data: ParsedJd) {
    setValue(form, "title", data.title || "");
    setValue(form, "location", data.location || "");
    setValue(form, "employmentType", data.employmentType || "");
    setValue(form, "description", data.description || "");
    const req = form.elements.namedItem("requirements");
    if (req instanceof HTMLTextAreaElement) {
      const merged = [
        ...new Set([
          ...req.value
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
          ...data.requirements,
        ]),
      ];
      req.value = merged.join("\n");
      req.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  async function parse(selected: File | null = file) {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    if (!selected) {
      setMessage("Choose a job-description file.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", selected);
      const r = await apiFetch<{ data: ParsedJd }>(
        `/api/organizations/${activeOrgId()}/recruiting/ats/job-description`,
        { method: "POST", body },
      );
      apply(form, r.data);
      setMessage(
        `${r.data.aiVerified ? "Governed AI + deterministic verification" : "Deterministic evidence parsing"} completed${r.data.parseTrust == null ? "" : ` at ${r.data.parseTrust}% machine evidence confidence`}. Prefilled the supported fields and ${r.data.requirements.length} requirement(s). Select the organization unit, position and hiring manager, then review before creating the draft.${r.data.warnings[0] ? ` ${r.data.warnings[0]}` : ""}`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Job-description parsing failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function analyze() {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    const desc = form.elements.namedItem("description");
    if (
      !(desc instanceof HTMLTextAreaElement) ||
      desc.value.trim().length < 80
    ) {
      setMessage("Attach a JD or add the role description first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const r = await apiFetch<{ data: ParsedJd }>(
        `/api/organizations/${activeOrgId()}/recruiting/ats/job-description`,
        { method: "POST", body: JSON.stringify({ text: desc.value }) },
      );
      apply(form, { ...r.data, description: desc.value });
      setMessage(
        `${r.data.aiVerified ? "Governed AI + deterministic verification" : "Deterministic evidence parsing"} detected ${r.data.requirements.length} job-related requirement(s) and ${r.data.skills.length} role signals${r.data.parseTrust == null ? "" : ` at ${r.data.parseTrust}% machine evidence confidence`}. Review the extracted criteria before creating the requisition.${r.data.warnings[0] ? ` ${r.data.warnings[0]}` : ""}`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Job-description analysis failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="atsIntakeBox stack">
      <div className="toolbar">
        <div>
          <strong>1. Attach job description to prefill requisition</strong>
          <div className="muted">
            PDF, DOCX, TXT, RTF or Markdown. Governed Recruiting AI analyzes the
            original posting and a deterministic parser independently reconciles
            the extracted criteria before requisition fields are prefilled.
          </div>
        </div>
        <span className="badge">Human review required</span>
      </div>
      <div className="row wrap">
        <input
          aria-label="Job description file"
          className="input"
          type="file"
          accept=".pdf,.docx,.txt,.rtf,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => {
            const selected = e.target.files?.[0] || null;
            setFile(selected);
            if (selected) void parse(selected);
          }}
        />
        <button
          type="button"
          className="button secondary compact"
          disabled={busy || !file}
          onClick={() => void parse()}
        >
          {busy ? "Parsing…" : "Parse again"}
        </button>
        <button
          type="button"
          className="button secondary compact"
          disabled={busy}
          onClick={analyze}
        >
          Analyze entered text
        </button>
      </div>
      {message && (
        <div className="muted" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
