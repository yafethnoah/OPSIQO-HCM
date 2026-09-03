"use client";
import { useEffect, useState } from "react";
import { activeOrgId, apiFetch, ApiRequestError } from "@/lib/http/client";
import Link from "next/link";

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

function selectSingleOpenRequisition(form: HTMLFormElement) {
  const select = form.elements.namedItem("requisitionId");
  if (!(select instanceof HTMLSelectElement) || select.value) return;
  const options = Array.from(select.options).filter((option) => option.value);
  if (options.length === 1) {
    select.value = options[0]!.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function tryAutoEnroll(form: HTMLFormElement) {
  if (form.dataset.resumeIntakeReady !== "true" || form.dataset.autoSubmitting === "true") return;
  const consent = form.elements.namedItem("consent");
  const requisition = form.elements.namedItem("requisitionId");
  const firstName = form.elements.namedItem("firstName");
  const lastName = form.elements.namedItem("lastName");
  const email = form.elements.namedItem("email");
  if (!(consent instanceof HTMLInputElement) || !consent.checked) return;
  if (!(requisition instanceof HTMLSelectElement) || !requisition.value) return;
  if (!(firstName instanceof HTMLInputElement) || !firstName.value.trim()) return;
  if (!(lastName instanceof HTMLInputElement) || !lastName.value.trim()) return;
  if (!(email instanceof HTMLInputElement) || !email.validity.valid || !email.value.trim()) return;
  if (!form.checkValidity()) return;
  form.dataset.autoSubmitting = "true";
  form.requestSubmit();
}

export function ResumeIntakeAssistant({ formId }: { formId: string }) {
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    const onChange = () => tryAutoEnroll(form);
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, [formId]);
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
    delete form.dataset.resumeIntakeReady;
    delete form.dataset.autoSubmitting;
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
      selectSingleOpenRequisition(form);
      form.dataset.resumeIntakeReady = "true";
      setNotice(
        `Resume parsed with ${p.parser.replaceAll("_", " ")}. Candidate fields were prefilled. Review the extracted data; when an open requisition is selected and consent is confirmed, OPSIQO creates the application automatically.`,
      );
      queueMicrotask(() => tryAutoEnroll(form));
    } catch (e) {
      clearParsedValues(form);
      delete form.dataset.resumeIntakeReady;
      delete form.dataset.autoSubmitting;
      if (e instanceof ApiRequestError && e.code === "recruiting_ai_setup_required") {
        setError("This resume needs Recruiting AI because it has no reliable readable text layer. Complete Recruiting AI setup or use a text-based PDF/DOCX/TXT/RTF/Markdown file.");
      } else if (e instanceof ApiRequestError && e.code === "resume_parser_unavailable") {
        setError("This PDF could not be read safely because its text layer appears corrupted or binary-like. Export a clean text-based PDF or upload DOCX/TXT/RTF/Markdown instead.");
      } else {
        setError(e instanceof Error ? e.message : "Resume parsing failed.");
      }
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
            the recruiter reviews the fields and confirms recorded candidate consent.
          </div>
        </div>
        <span className="badge">Auto-enrollment · human reviewed</span>
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
          {error.includes("Recruiting AI") && <div><Link className="textLink" href="/ai-copilot?tab=governance">Configure Recruiting AI</Link></div>}
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
