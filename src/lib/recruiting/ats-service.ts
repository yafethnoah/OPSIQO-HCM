import { createHash, randomUUID } from "node:crypto";
import type { ActorContext } from "@/domain/security";
import type { Application, Candidate, Requisition } from "@/domain/recruiting";
import type {
  AtsResumeReview,
  CoverLetterDraft,
  ParsedResumeProfile,
  ResumeSourceMeta,
} from "@/domain/ats";
import { adminDb } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/http/errors";
import { buildAudit } from "@/lib/audit/service";
import { buildDomainEvent } from "@/lib/events/build";
import { extractDocxText, extractRtfText } from "@/lib/contract-import/docx";
import { assessPdfTextQuality, extractPdfDocument } from "@/lib/data-import/pdf-engine";
import {
  analyzeJobDescription,
  buildAtsReview,
  deterministicCoverLetter,
  parseResumeTextDeterministic,
  reviewCoverLetter,
} from "./ats-engine";
import { classifyRecruitingDocument, isPlausibleProfessionalHeadline } from "./document-classifier";
import { applyResumeAssurance, resumeParseCoverage } from "./resume-assurance";
import { assessStructuredResume, deriveStructuredExperienceYears, deterministicStructuredResume, mergeStructuredResume } from "./resume-structure";
import { governedCoverLetterDraft, governedJobDescriptionParse, governedResumeParse } from "./ats-provider";
import { listRequisitions } from "./service";

const now = () => new Date().toISOString();
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const hrRoles = new Set(["super_admin", "org_admin", "hr_admin", "hr_partner"]);
const allowedResumeExt = new Set([".pdf", ".docx", ".txt", ".rtf", ".md"]);

function extension(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}
function validateResumeFile(file: File, bytes: Buffer) {
  if (file.size <= 0 || file.size > 10 * 1024 * 1024)
    throw new ApiError(
      400,
      "Resume files must be between 1 byte and 10 MB.",
      "invalid_resume_size",
    );
  const ext = extension(file.name);
  if (!allowedResumeExt.has(ext))
    throw new ApiError(
      400,
      "Resume upload supports PDF, DOCX, TXT, RTF and Markdown.",
      "unsupported_resume_type",
    );
  if (ext === ".pdf" && bytes.subarray(0, 5).toString() !== "%PDF-")
    throw new ApiError(
      400,
      "Resume PDF signature mismatch.",
      "file_signature_mismatch",
    );
  if (ext === ".docx" && bytes.subarray(0, 2).toString() !== "PK")
    throw new ApiError(
      400,
      "Resume DOCX signature mismatch.",
      "file_signature_mismatch",
    );
  const latin = bytes.toString("latin1");
  if (
    ext === ".docx" &&
    (!latin.includes("[Content_Types].xml") || !latin.includes("word/"))
  )
    throw new ApiError(
      400,
      "Invalid DOCX resume container.",
      "file_signature_mismatch",
    );
}
async function textFromResume(name: string, bytes: Buffer): Promise<string> {
  const ext = extension(name);

  if (ext === ".pdf") {
    try {
      const pdf = await extractPdfDocument(bytes, {
        maxBytes: 10 * 1024 * 1024,
        maxText: 500_000,
      });

      /*
       * Deterministic Recruiting logic receives only reliable PDF.js text.
       * The governed AI provider still receives the ORIGINAL PDF regardless
       * of whether a machine-readable text layer exists.
       */
      return pdf.hasUsableText
        ? pdf.text.slice(0, 500_000)
        : "";
    } catch {
      return "";
    }
  }

  if (ext === ".docx")
    return extractDocxText(bytes).slice(0, 500_000);

  if (ext === ".rtf")
    return extractRtfText(bytes).slice(0, 500_000);

  if (ext === ".txt" || ext === ".md")
    return bytes
      .toString("utf8")
      .replace(/\u0000/g, "")
      .trim()
      .slice(0, 500_000);

  return "";
}

async function pdfTextLayerState(
  name: string,
  bytes: Buffer,
): Promise<"not_pdf" | "readable" | "absent" | "unsafe"> {
  if (extension(name) !== ".pdf") return "not_pdf";

  try {
    const pdf = await extractPdfDocument(bytes, {
      maxBytes: 10 * 1024 * 1024,
      maxText: 500_000,
    });

    if (!pdf.text.trim())
      return "absent";

    return pdf.hasUsableText
      ? "readable"
      : "unsafe";
  } catch {
    return "unsafe";
  }
}

function mimeFor(file: File) {
  const ext = extension(file.name);
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".rtf") return "application/rtf";
  if (ext === ".md") return "text/markdown";
  if (ext === ".txt") return "text/plain";
  return file.type || "application/octet-stream";
}

async function scopedRequisition(
  actor: ActorContext,
  requisitionId: string,
): Promise<Requisition> {
  const allowed = await listRequisitions(actor);
  const req = allowed.find((r) => r.id === requisitionId);
  if (!req)
    throw new ApiError(
      404,
      "Requisition not found in your recruiting scope.",
      "requisition_not_found",
    );
  return req;
}

async function bundle(actor: ActorContext, applicationId: string) {
  const db = adminDb();
  const appSnap = await db
    .doc(`organizations/${actor.orgId}/applications/${applicationId}`)
    .get();
  if (!appSnap.exists)
    throw new ApiError(404, "Application not found.", "application_not_found");
  const application = appSnap.data() as Application;
  const requisition = await scopedRequisition(actor, application.requisitionId);
  const candidateSnap = await db
    .doc(`organizations/${actor.orgId}/candidates/${application.candidateId}`)
    .get();
  if (!candidateSnap.exists)
    throw new ApiError(
      409,
      "Candidate record is missing.",
      "candidate_missing",
    );
  return {
    application,
    requisition,
    candidate: candidateSnap.data() as Candidate,
  };
}

export async function parseResumeFile(actor: ActorContext, file: File, options: { requireStructuredPrefill?: boolean } = {}) {
  const bytes = Buffer.from(await file.arrayBuffer());
  validateResumeFile(file, bytes);
  const text = await textFromResume(file.name, bytes);
  const documentClassification = classifyRecruitingDocument(file.name, text);
  if (
    documentClassification.kind === "cover_letter" &&
    documentClassification.confidence >= 0.65
  )
    throw new ApiError(
      422,
      "This file looks like a cover letter, not a resume. Upload your resume in the Resume field.",
      "resume_document_mismatch",
    );
  const pdfLayerState = await pdfTextLayerState(file.name, bytes);
  let profile: ParsedResumeProfile;
  let ai: Awaited<ReturnType<typeof governedResumeParse>> = null;
  let aiFailure: unknown = null;
  try {
    ai = await governedResumeParse(actor, {
      name: file.name,
      mimeType: mimeFor(file),
      bytes,
      text,
    });
  } catch (e) {
    aiFailure = e;
    if (!text) {
      const code = e instanceof ApiError ? e.code : "";
      const transientProviderFailure=["ai_credential_invalid","ai_model_unavailable","ai_rate_limited","ai_provider_unavailable","ai_provider_error","ai_document_probe_failed"].includes(code);

      if(options.requireStructuredPrefill===false&&transientProviderFailure){
        ai=null;
      }else{

      // A real provider/runtime failure is operational evidence and must
      // remain visible even when the PDF text layer is unsafe.
      if (
        [
          "ai_credential_invalid",
          "ai_model_unavailable",
          "ai_rate_limited",
          "ai_provider_unavailable",
          "ai_provider_error",
          "ai_document_probe_failed",
        ].includes(code)
      ) {
        throw new ApiError(
          e instanceof ApiError ? e.status : 503,
          e instanceof ApiError
            ? e.message
            : "Recruiting AI live provider request failed.",
          code || "ai_provider_error",
        );
      }

      // Corrupt/binary-like PDF extraction remains a document-safety
      // failure when AI is only missing/unconfigured. This preserves the
      // historical fail-closed contract and avoids misclassifying corrupt
      // files as ordinary scanned documents.
      if (pdfLayerState === "unsafe") {
        throw new ApiError(
          503,
          "This PDF contains an unreadable, corrupted, or binary-like text layer. No candidate fields were accepted. A live Recruiting AI provider may be used only after its model, credential, and PDF document capability are verified.",
          "resume_parser_unavailable",
        );
      }

      // A genuinely empty/scanned PDF has no unsafe text evidence. If AI
      // governance/credential configuration is missing, guide setup.
      if (code === "ai_governance_required" || code === "ai_unavailable") {
        throw new ApiError(
          503,
          e instanceof ApiError
            ? `Recruiting AI configuration is not operational: ${e.message}`
            : "Recruiting AI configuration is not operational.",
          "recruiting_ai_setup_required",
        );
      }

      throw e;
      }
    }
  }
  if (ai?.profile?.sourceText) profile = ai.profile;
  else if (text) profile = parseResumeTextDeterministic(text, file.name);
  else if (options.requireStructuredPrefill===false)
    profile = parseResumeTextDeterministic("", file.name);
  else if (pdfLayerState === "unsafe")
    throw new ApiError(
      503,
      "This PDF contains an unreadable, corrupted, or binary-like text layer. No candidate fields were accepted. Export a clean text-based PDF or upload DOCX, TXT, RTF or Markdown instead.",
      "resume_parser_unavailable",
    );
  else
    throw new ApiError(
      503,
      "This resume has no reliable readable text layer. Upload a text-based PDF, DOCX, TXT, RTF or Markdown file, or ask an administrator to complete Recruiting AI setup.",
      "recruiting_ai_setup_required",
    );
  const deterministicStructure=deterministicStructuredResume(profile);
  const structuredResume=mergeStructuredResume(profile.structuredResume,deterministicStructure,profile.sourceText||text);
  const derivedYearsOfExperience=deriveStructuredExperienceYears(structuredResume.employmentHistory);
  profile={
    ...profile,
    structuredResume,
    ...(derivedYearsOfExperience!==undefined?{yearsOfExperience:derivedYearsOfExperience}:{}),
  };
  const structuredAssessment=assessStructuredResume(structuredResume,profile.sourceText||text);
  profile={...profile,structuredQuality:structuredAssessment.quality,structuredCoverage:structuredAssessment.coverage,structuredRecordCount:structuredAssessment.recordCount,structuredIssues:structuredAssessment.issues,structuredCriticalIssues:structuredAssessment.criticalIssues};
  profile = applyResumeAssurance(profile,{fileName:file.name,sourceText:profile.sourceText||text,aiUsed:Boolean(ai?.profile)});
  const coverage=resumeParseCoverage(profile);
  if(options.requireStructuredPrefill!==false&&!coverage.prefillReady){
    const aiCode=aiFailure instanceof ApiError?aiFailure.code:'';
    if(aiFailure||!ai?.profile)throw new ApiError(503,aiCode==='ai_governance_required'?'Recruiting AI is not ready for this organization. Initialize governed AI so RECRUITING_ATS and RECRUITING_ATS_MODEL are active, then retry this resume. The application was not advanced with weak structured fields.':'Recruiting AI could not produce a reliable structured profile from this resume. OPSIQO will not continue with blank candidate fields or semantically weak employment/education records. Retry parsing, or upload a clean text-based PDF or DOCX.',aiCode==='ai_governance_required'?'recruiting_ai_setup_required':'resume_ai_parse_failed');
    throw new ApiError(422,'OPSIQO could not extract enough reliable candidate information into correctly related resume fields. The application was not advanced with blank or low-quality structured records. Please retry or upload a cleaner text-based resume.','resume_parse_insufficient');
  }
  if (profile.headline && !isPlausibleProfessionalHeadline(profile.headline))
    profile = {
      ...profile,
      headline: undefined,
      warnings: [
        ...profile.warnings,
        "Professional headline was omitted because the extracted text was not reliably human-readable.",
      ],
    };
  if (options.requireStructuredPrefill!==false && extension(file.name) === ".pdf" && !assessPdfTextQuality(profile.sourceText || "").readable)
    throw new ApiError(
      422,
      "This PDF does not contain a reliable readable text layer, and governed AI parsing was unavailable or returned unusable text. No candidate fields were accepted. Upload a text-based PDF/DOCX or enable the approved Recruiting ATS AI provider.",
      "resume_text_unreadable",
    );
  const sourceMeta: ResumeSourceMeta = {
    fileName: file.name.replace(/[^A-Za-z0-9._ -]/g, "_").slice(-180),
    contentType: mimeFor(file),
    size: file.size,
    sha256: sha(bytes),
  };
  return { profile, sourceMeta, ai, documentClassification };
}

export async function extractRecruitingDocumentFile(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  validateResumeFile(file, bytes);
  const text = await textFromResume(file.name, bytes);
  const sourceMeta: ResumeSourceMeta = {
    fileName: file.name.replace(/[^A-Za-z0-9._ -]/g, "_").slice(-180),
    contentType: mimeFor(file),
    size: file.size,
    sha256: sha(bytes),
  };
  return { bytes, text, sourceMeta, documentClassification: classifyRecruitingDocument(file.name, text) };
}

export async function parseResumeIntake(actor: ActorContext, form: FormData) {
  if (!(
    actor.permissions.includes("recruiting.manage" as any) ||
    actor.permissions.includes("recruiting.manage.team" as any)
  ))
    throw new ApiError(
      403,
      "Recruiting management permission required.",
      "forbidden",
    );
  const requisitionId = String(form.get("requisitionId") || "").trim();
  const file = form.get("file");
  if (!(file instanceof File))
    throw new ApiError(400, "Resume file is required.", "resume_required");
  if (requisitionId) {
    const requisition = await scopedRequisition(actor, requisitionId);
    if (requisition.status !== "open")
      throw new ApiError(
        409,
        "The selected requisition is not open.",
        "requisition_not_open",
      );
  }
  const parsed = await parseResumeFile(actor, file, { requireStructuredPrefill: false });
  const { sourceText, ...profile } = parsed.profile;
  return {
    profile,
    resumeText: sourceText,
    sourceMeta: parsed.sourceMeta,
    parser: parsed.profile.parser,
    note: "Transient parsing only. Candidate data is not persisted until the recruiter submits the application with consent evidence.",
  };
}

function jobTitleFromText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((x) => x.replace(/^\s*[-â€¢*]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 20);
  const labeled = lines
    .map((x) =>
      /^(?:job\s+title|position|role)\s*:\s*(.+)$/i.exec(x)?.[1]?.trim(),
    )
    .find(Boolean);
  if (labeled) return labeled.slice(0, 120);
  return (
    lines.find(
      (x) =>
        x.length >= 3 &&
        x.length <= 100 &&
        !/^(?:about|company|location|department|reports?\s+to|summary|overview|responsibilities|qualifications|requirements)\b/i.test(
          x,
        ),
    ) || ""
  ).slice(0, 120);
}
function jobLocationFromText(text: string) {
  return (/^(?:location|work\s+location)\s*:\s*(.+)$/im.exec(text)?.[1] || "")
    .trim()
    .slice(0, 180);
}
function jobEmploymentTypeFromText(text: string) {
  const t = text.toLowerCase();
  if (/\bvolunteer\b/.test(t)) return "volunteer";
  if (/\bintern(?:ship)?\b/.test(t)) return "intern";
  if (/\bcontract(?:or)?\b/.test(t)) return "contractor";
  if (/\btemporary|fixed[- ]term|seasonal\b/.test(t)) return "temporary";
  if (/\bpermanent|full[- ]time|part[- ]time\b/.test(t)) return "permanent";
  return "";
}


function uniqueJobValues(values:Array<string|undefined>,limit:number){
 return [...new Set(values.map(x=>String(x||'').trim()).filter(Boolean))].slice(0,limit);
}
function mergeJobDescriptionEvidence(
 text:string,
 ai:Awaited<ReturnType<typeof governedJobDescriptionParse>>|null,
){
 const evidence=String(ai?.evidenceText||text||'').replace(/\u0000/g,'').trim().slice(0,500000);
 const deterministic=analyzeJobDescription(evidence);
 return{
   title:ai?.title||jobTitleFromText(evidence),
   location:ai?.location||jobLocationFromText(evidence),
   employmentType:ai?.employmentType||jobEmploymentTypeFromText(evidence),
   description:evidence.slice(0,120000),
   requirements:uniqueJobValues([...(ai?.requirements||[]),...(deterministic.requirements||[])],50),
   preferredQualifications:uniqueJobValues([...(ai?.preferredQualifications||[]),...(deterministic.preferredQualifications||[])],40),
   responsibilities:uniqueJobValues([...(ai?.responsibilities||[]),...(deterministic.responsibilities||[])],60),
   skills:uniqueJobValues([...(ai?.skills||[]),...(deterministic.skills||[])],80),
   educationSignals:uniqueJobValues([...(ai?.educationSignals||[]),...(deterministic.educationSignals||[])],30),
   requiredYears:ai?.requiredYears??deterministic.requiredYears,
   warnings:uniqueJobValues([...(ai?.warnings||[]),...(deterministic.warnings||[])],60),
   parser:ai?'governed_ai_dual_pass+deterministic':'deterministic',
   parseTrust:ai?.parseTrust??69,
   aiVerified:Boolean(ai?.aiVerified),
   fieldConfidence:ai?.fieldConfidence||{},
   unresolvedFields:ai?.unresolvedFields||[],
   parserPasses:ai?.parserPasses||['deterministic_job_description'],
   provider:ai?.provider,
   model:ai?.model,
   promptVersion:ai?.promptVersion,
 };
}

export async function parseJobDescriptionIntake(
  actor: ActorContext,
  form: FormData,
) {
  if (!(
    actor.permissions.includes("recruiting.manage" as any) ||
    actor.permissions.includes("recruiting.manage.team" as any)
  ))
    throw new ApiError(
      403,
      "Recruiting management permission required.",
      "forbidden",
    );
  const file = form.get("file");
  if (!(file instanceof File))
    throw new ApiError(
      400,
      "Job-description file is required.",
      "job_description_required",
    );
  const bytes = Buffer.from(await file.arrayBuffer());
  validateResumeFile(file, bytes);
  const text = await textFromResume(file.name, bytes);

  let ai: Awaited<ReturnType<typeof governedJobDescriptionParse>> = null;
  let aiFailure: unknown = null;
  try {
    ai = await governedJobDescriptionParse(actor, {
      name: file.name,
      mimeType: mimeFor(file),
      bytes,
      text,
    });
  } catch (e) {
    aiFailure = e;
  }

  if (!text.trim() && !ai?.evidenceText) {
    const code = aiFailure instanceof ApiError ? aiFailure.code : "";
    if (
      ["ai_governance_required", "ai_unavailable", "ai_provider_error"].includes(
        code,
      )
    )
      throw new ApiError(
        503,
        "This job posting has no reliable readable text layer and needs governed Recruiting AI document analysis. Complete Recruiting AI model/prompt approval and server credential setup, then retry.",
        "recruiting_ai_setup_required",
      );
    throw new ApiError(
      422,
      "OPSIQO could not recover reliable job-posting evidence from this file. No requisition fields were accepted.",
      "job_description_text_unavailable",
    );
  }

  const merged = mergeJobDescriptionEvidence(text, ai);
  return {
    fileName: file.name.replace(/[^A-Za-z0-9._ -]/g, "_").slice(-180),
    sha256: sha(bytes),
    ...merged,
  };
}

export async function parseJobDescriptionTextIntake(
  actor: ActorContext,
  textInput: string,
) {
  if (!(
    actor.permissions.includes("recruiting.manage" as any) ||
    actor.permissions.includes("recruiting.manage.team" as any)
  ))
    throw new ApiError(
      403,
      "Recruiting management permission required.",
      "forbidden",
    );

  const text = String(textInput || "").replace(/\u0000/g, "").trim().slice(0, 120000);
  if (text.length < 80)
    throw new ApiError(
      400,
      "Job description must be between 80 and 120,000 characters.",
      "invalid_job_description",
    );

  let ai: Awaited<ReturnType<typeof governedJobDescriptionParse>> = null;
  try {
    ai = await governedJobDescriptionParse(actor, {
      name: "entered-job-description.txt",
      mimeType: "text/plain",
      bytes: Buffer.from(text, "utf8"),
      text,
    });
  } catch {
    ai = null;
  }

  return mergeJobDescriptionEvidence(text, ai);
}


export async function reviewApplicationResume(
  actor: ActorContext,
  applicationId: string,
  form: FormData,
) {
  const { application, requisition, candidate } = await bundle(
    actor,
    applicationId,
  );
  let profile: ParsedResumeProfile;
  let sourceMeta: ResumeSourceMeta | undefined;
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    const parsed = await parseResumeFile(actor, file);
    profile = parsed.profile;
    sourceMeta = parsed.sourceMeta;
  } else if (candidate.resumeText?.trim())
    profile = parseResumeTextDeterministic(candidate.resumeText);
  else
    throw new ApiError(
      400,
      "Upload a resume or add resume text to the candidate before running ATS review.",
      "resume_required",
    );
  if (profile.sourceText.trim().length < 40)
    throw new ApiError(
      400,
      "Resume evidence is too short for a reliable ATS review.",
      "resume_too_short",
    );
  const id = randomUUID();
  const timestamp = now();
  const review = buildAtsReview({
    id,
    applicationId,
    candidateId: candidate.id,
    requisition,
    candidate,
    profile,
    sourceMeta,
    createdBy: actor.uid,
    createdAt: timestamp,
  });
  const db = adminDb();
  const safeProfile = review.resumeProfile;
  const audit = buildAudit(actor, {
    action: "recruiting.ats.resume_review",
    entityType: "atsResumeReview",
    entityId: id,
    after: {
      applicationId,
      requisitionId: requisition.id,
      candidateId: candidate.id,
      score: review.score,
      band: review.band,
      scoringVersion: review.scoringVersion,
      humanReviewRequired: true,
    },
  });
  const event = buildDomainEvent(
    actor,
    "recruiting.ats_review_completed",
    "application",
    applicationId,
    {
      reviewId: id,
      requisitionId: requisition.id,
      candidateId: candidate.id,
      score: review.score,
    },
  );
  const batch = db.batch();
  batch.create(
    db.doc(`organizations/${actor.orgId}/atsResumeReviews/${id}`),
    review,
  );
  batch.set(
    db.doc(`organizations/${actor.orgId}/applications/${applicationId}`),
    {
      atsLatestReviewId: id,
      atsLatestScore: review.score,
      atsLatestBand: review.band,
      atsReviewedAt: timestamp,
      updatedAt: timestamp,
    },
    { merge: true },
  );
  batch.set(
    db.doc(`organizations/${actor.orgId}/candidates/${candidate.id}`),
    {
      resumeText: profile.sourceText,
      resumeProfile: safeProfile,
      resumeSourceMeta: sourceMeta,
      updatedAt: timestamp,
    },
    { merge: true },
  );
  batch.create(
    db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),
    audit,
  );
  batch.create(
    db.doc(`organizations/${actor.orgId}/domainEvents/${event.id}`),
    event,
  );
  await batch.commit();
  return review;
}

export async function latestAtsReview(
  actor: ActorContext,
  applicationId: string,
) {
  await bundle(actor, applicationId);
  const snap = await adminDb()
    .collection(`organizations/${actor.orgId}/atsResumeReviews`)
    .where("applicationId", "==", applicationId)
    .limit(50)
    .get();
  const reviews = snap.docs
    .map((d) => d.data() as AtsResumeReview)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const draftsSnap = await adminDb()
    .collection(`organizations/${actor.orgId}/coverLetterDrafts`)
    .where("applicationId", "==", applicationId)
    .limit(30)
    .get();
  const drafts = draftsSnap.docs
    .map((d) => d.data() as CoverLetterDraft)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    review: reviews[0] || null,
    history: reviews.slice(0, 10),
    coverLetters: drafts.slice(0, 10),
  };
}

export async function createCoverLetterDraft(
  actor: ActorContext,
  applicationId: string,
  raw: unknown,
) {
  const input =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const tone = ["professional", "concise", "warm"].includes(String(input.tone))
    ? (String(input.tone) as "professional" | "concise" | "warm")
    : "professional";
  const notes =
    String(input.notes || "")
      .trim()
      .slice(0, 1000) || undefined;
  const { application, requisition, candidate } = await bundle(
    actor,
    applicationId,
  );
  const state = await latestAtsReview(actor, applicationId);
  if (!state.review)
    throw new ApiError(
      409,
      "Run an ATS resume review before generating a cover letter so the draft can stay evidence-grounded.",
      "ats_review_required",
    );
  const fallback = deterministicCoverLetter(
    candidate,
    requisition,
    state.review,
    tone,
  );
  let generated: Awaited<ReturnType<typeof governedCoverLetterDraft>> = null;
  try {
    generated = await governedCoverLetterDraft(actor, {
      candidate,
      requisition,
      review: state.review,
      tone,
      notes,
    });
  } catch {
    generated = null;
  }
  const id = randomUUID();
  const timestamp = now();
  const draft: CoverLetterDraft = {
    id,
    applicationId,
    requisitionId: requisition.id,
    candidateId: application.candidateId,
    text: generated?.text || fallback.text,
    tone,
    evidenceUsed: generated?.evidenceUsed || fallback.evidenceUsed,
    provider: generated?.provider || "deterministic",
    model: generated?.model,
    promptVersion: generated?.promptVersion || "DETERMINISTIC_COVER_LETTER_V2",
    humanReviewRequired: true,
    createdBy: actor.uid,
    createdAt: timestamp,
  };
  const db = adminDb();
  const audit = buildAudit(actor, {
    action: "recruiting.cover_letter.generate",
    entityType: "coverLetterDraft",
    entityId: id,
    after: {
      applicationId,
      provider: draft.provider,
      promptVersion: draft.promptVersion,
      humanReviewRequired: true,
    },
  });
  const batch = db.batch();
  batch.create(
    db.doc(`organizations/${actor.orgId}/coverLetterDrafts/${id}`),
    draft,
  );
  batch.create(
    db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),
    audit,
  );
  await batch.commit();
  return draft;
}

export async function reviewApplicationCoverLetter(
  actor: ActorContext,
  applicationId: string,
  raw: unknown,
) {
  const input =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const text = String(input.text || "").trim();
  if (text.length < 100 || text.length > 12000)
    throw new ApiError(
      400,
      "Cover letter text must be between 100 and 12,000 characters.",
      "invalid_cover_letter",
    );
  const { requisition } = await bundle(actor, applicationId);
  const state = await latestAtsReview(actor, applicationId);
  if (!state.review)
    throw new ApiError(
      409,
      "Run an ATS resume review before reviewing a cover letter.",
      "ats_review_required",
    );
  return reviewCoverLetter(text, state.review, requisition);
}
