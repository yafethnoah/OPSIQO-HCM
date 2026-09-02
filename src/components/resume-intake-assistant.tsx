"use client";
import { useState } from "react";
import { activeOrgId, apiFetch } from "@/lib/http/client";

type Parsed = {
  profile: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedinUrl?: string;
    headline?: string;
    skills: string[];
    certifications: string[];
    parser: string;
  };
  resumeText: string;
  sourceMeta: { fileName: string; sha256: string };
};

function setNamedValue(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function clearParsedValues(form: HTMLFormElement) {
  for (const name of [
    "firstName",
    "lastName",
    "email",
    "phone",
    "location",
    "linkedinUrl",
    "resumeText",
    "source",
  ]) setNamedValue(form, name, "");
}

export function ResumeIntakeAssistant({ formId }: { formId: string }) {
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function parse(selected: File | null = file) {
    setError("");
    setNotice("");
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      setError("Candidate form is unavailable.");
      return;
    }
    if (!selected) {
      setError("Choose a resume file.");
      return;
    }
    clearParsedValues(form);
    setBusy(true);
    try {
      const data = new FormData();
      const req = String(
        (form.elements.namedItem("requisitionId") as HTMLSelectElement | null)
          ?.value || "",
      );
      if (req) data.set("requisitionId", req);
      data.set("file", selected);
      const r = await apiFetch<{ data: Parsed }>(
        `/api/organizations/${activeOrgId()}/recruiting/ats/parse`,
        {
          method: "POST",
          body: data,
          // Parsing only returns transient prefill data; it does not create or
          // update a candidate, so show the authoritative API error directly.
          reconcileOnServerError: false,
        },
      );
      const p = r.data.profile;
      if (p.firstName) setNamedValue(form, "firstName", p.firstName);
      if (p.lastName) setNamedValue(form, "lastName", p.lastName);
      if (p.email) setNamedValue(form, "email", p.email);
      if (p.phone) setNamedValue(form, "phone", p.phone);
      if (p.location) setNamedValue(form, "location", p.location);
      if (p.linkedinUrl) setNamedValue(form, "linkedinUrl", p.linkedinUrl);
      setNamedValue(form, "resumeText", r.data.resumeText);
      setNamedValue(form, "source", "Resume import");
      setNotice(
        `Resume parsed with ${p.parser.replaceAll("_", " ")}. Candidate fields were prefilled. Select the requisition and review every field before submitting.`,
      );
    } catch (e) {
      clearParsedValues(form);
      setError(e instanceof Error ? e.message : "Resume parsing failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="atsIntakeBox stack">
      <div className="toolbar">
        <div>
          <strong>1. Attach resume to prefill candidate</strong>
          <div className="muted">
            PDF, DOCX, TXT, RTF or Markdown. Selecting a file immediately parses
            and prefills the candidate form. Data remains transient until
            consented submission.
          </div>
        </div>
        <span className="badge">Human review required</span>
      </div>
      <div className="row wrap">
        <input
          aria-label="Candidate resume file"
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
          className="button secondary"
          type="button"
          disabled={busy || !file}
          onClick={() => void parse()}
        >
          {busy ? "Parsing…" : "Parse again"}
        </button>
      </div>
      {error && (
        <div className="error compactError" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="success" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
