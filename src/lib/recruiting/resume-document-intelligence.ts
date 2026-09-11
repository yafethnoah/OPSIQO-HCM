import { getAdminApp } from "@/lib/firebase/admin";

export type ResumeEvidenceSource =
  | "native"
  | "document_ai_ocr"
  | "document_ai_layout";

export type ResumeEvidenceCandidate = {
  source: ResumeEvidenceSource;
  text: string;
  score: number;
};

export type ResumeDocumentEvidence = {
  text: string;
  source: ResumeEvidenceSource | "none";
  score: number;
  candidates: ResumeEvidenceCandidate[];
  warnings: string[];
  cloudUsed: boolean;
};

const MAX_TEXT = 500_000;

function cleanText(value: string) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\f/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{5,}/g, "\n\n\n")
    .trim()
    .slice(0, MAX_TEXT);
}

function countMatches(text: string, pattern: RegExp) {
  return (text.match(pattern) || []).length;
}

export function scoreResumeEvidence(value: string): number {
  const text = cleanText(value);
  if (!text) return 0;

  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}+#&.'’/-]*/gu) || [];
  const lines = text.split("\n").map((x) => x.trim()).filter(Boolean);
  const chars = [...text];
  const alphaNumeric = chars.filter((c) => /[\p{L}\p{N}]/u.test(c)).length;
  const printableRatio = chars.length ? alphaNumeric / chars.length : 0;
  const longLines = lines.filter((x) => x.length > 260).length;
  const sectionSignals = countMatches(
    text,
    /(?:^|\n)\s*(?:professional\s+summary|summary|profile|professional\s+experience|work\s+experience|employment|career\s+history|education|skills|core\s+competencies|certifications?|licenses?|languages?|projects?|volunteer|awards?|publications?)\s*:?\s*(?:\n|$)/gim,
  );
  const dateSignals = countMatches(
    text,
    /\b(?:19|20)\d{2}\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(?:19|20)?\d{2}\b/gi,
  );
  const contactSignals =
    Number(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(text)) +
    Number(/(?:linkedin\.com\/in\/|www\.linkedin\.com\/in\/)/i.test(text)) +
    Number(/\+?\d[\d ()/.-]{7,}\d/.test(text));
  const bullets = lines.filter((x) => /^[-•▪◦*]\s+/.test(x)).length;
  const replacement = countMatches(text, /\uFFFD/g);
  const controls = countMatches(text, /[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g);

  let score = 0;
  score += Math.min(24, words.length / 18);
  score += Math.min(14, lines.length / 4);
  score += Math.min(18, sectionSignals * 3);
  score += Math.min(12, dateSignals * 1.2);
  score += Math.min(9, contactSignals * 3);
  score += Math.min(7, bullets * 0.6);
  score += Math.min(10, Math.max(0, printableRatio - 0.45) * 20);
  score += text.length >= 800 ? 6 : text.length >= 250 ? 3 : 0;

  if (lines.length && longLines / lines.length > 0.35) score -= 12;
  score -= Math.min(25, replacement * 2 + controls * 2);
  if (words.length < 45) score -= 15;
  if (text.length < 180) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

const preference: Record<ResumeEvidenceSource, number> = {
  document_ai_layout: 3,
  document_ai_ocr: 2,
  native: 1,
};

const NATIVE_AUTHORITY_SCORE = 88;
const CLOUD_MATERIAL_ADVANTAGE = 8;

export function chooseBestResumeEvidence(
  candidates: Array<{ source: ResumeEvidenceSource; text: string }>,
): ResumeEvidenceCandidate | null {
  const scored = candidates
    .map((candidate) => ({
      source: candidate.source,
      text: cleanText(candidate.text),
      score: scoreResumeEvidence(candidate.text),
    }))
    .filter((candidate) => candidate.text.length > 0);

  const native = scored.find((candidate) => candidate.source === "native");
  if (native && native.score >= NATIVE_AUTHORITY_SCORE) return native;

  const cloud = scored
    .filter((candidate) => candidate.source !== "native")
    .sort((a, b) => {
      const delta = b.score - a.score;
      if (Math.abs(delta) > 4) return delta;
      return preference[b.source] - preference[a.source];
    });

  if (!native) return cloud[0] || null;
  if (!cloud[0]) return native;

  if (
    native.score >= 70 &&
    cloud[0].score < native.score + CLOUD_MATERIAL_ADVANTAGE
  )
    return native;

  return cloud[0].score > native.score ? cloud[0] : native;
}

let cachedToken:
  | {
      accessToken: string;
      expiresAt: number;
    }
  | undefined;

async function googleCloudAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000)
    return cachedToken.accessToken;

  const credential = getAdminApp().options.credential;
  if (!credential)
    throw new Error("google_cloud_adc_unavailable");

  const token = await credential.getAccessToken();
  const accessToken = String(token?.access_token || "");
  if (!accessToken)
    throw new Error("google_cloud_adc_token_unavailable");

  const expiresIn = Number(token?.expires_in || 3600);
  cachedToken = {
    accessToken,
    expiresAt: Date.now() + Math.max(60, expiresIn - 120) * 1000,
  };
  return accessToken;
}

function documentAiResource(variable: string) {
  const value = String(process.env[variable] || "").trim().replace(/^\/+/, "");
  if (!value) return "";
  if (
    !/^projects\/[^/]+\/locations\/[a-z0-9-]+\/processors\/[^/]+(?:\/processorVersions\/[^/]+)?$/i.test(
      value,
    )
  )
    throw new Error(`${variable.toLowerCase()}_invalid`);
  return value;
}

function documentAiLocation(resource: string) {
  return /\/locations\/([^/]+)\//i.exec(resource)?.[1] || "";
}

function layoutFallbackText(document: unknown) {
  const values: string[] = [];
  const seen = new Set<unknown>();

  const visit = (value: unknown, key = "") => {
    if (value == null || seen.has(value)) return;
    if (typeof value === "string") {
      if ((key === "text" || key === "content") && value.trim().length > 1)
        values.push(value.trim());
      return;
    }
    if (typeof value !== "object") return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) visit(item, key);
      return;
    }
    for (const [childKey, child] of Object.entries(value as Record<string, unknown>))
      visit(child, childKey);
  };

  visit(document);
  return cleanText([...new Set(values)].join("\n"));
}

async function processDocumentAi(
  resource: string,
  bytes: Buffer,
  mimeType: string,
  kind: "ocr" | "layout",
) {
  const location = documentAiLocation(resource);
  if (!location) throw new Error("document_ai_location_missing");

  const host =
    location === "global"
      ? "documentai.googleapis.com"
      : `${location}-documentai.googleapis.com`;
  const token = await googleCloudAccessToken();
  const controller = new AbortController();
  const configuredTimeout = Number(
    process.env.OPSIQO_RECRUITING_DOCUMENT_AI_TIMEOUT_MS || 18_000,
  );
  const timeoutMs = Math.max(
    5_000,
    Math.min(25_000, Number.isFinite(configuredTimeout) ? configuredTimeout : 18_000),
  );
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const processOptions =
      kind === "ocr"
        ? { ocrConfig: { enableNativePdfParsing: true } }
        : {
            layoutConfig: {
              returnImages: false,
              returnBoundingBoxes: false,
              enableTableAnnotation: true,
            },
          };

    const response = await fetch(`https://${host}/v1/${resource}:process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rawDocument: {
          content: bytes.toString("base64"),
          mimeType,
        },
        skipHumanReview: true,
        processOptions,
      }),
      signal: controller.signal,
    });

    if (!response.ok)
      throw new Error(`document_ai_${kind}_http_${response.status}`);

    const body = (await response.json()) as {
      document?: Record<string, unknown> & { text?: string };
    };
    const direct = cleanText(String(body.document?.text || ""));
    if (direct) return direct;
    return layoutFallbackText(body.document);
  } finally {
    clearTimeout(timeout);
  }
}

export async function extractResumeDocumentEvidence(input: {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  nativeText: string;
}): Promise<ResumeDocumentEvidence> {
  const nativeText = cleanText(input.nativeText);
  const candidates: Array<{ source: ResumeEvidenceSource; text: string }> = [];
  const warnings: string[] = [];

  if (nativeText) candidates.push({ source: "native", text: nativeText });

  const isPdf =
    input.fileName.toLowerCase().endsWith(".pdf") ||
    input.mimeType === "application/pdf";

  if (!isPdf) {
    const best = chooseBestResumeEvidence(candidates);
    return {
      text: best?.text || nativeText,
      source: best?.source || (nativeText ? "native" : "none"),
      score: best?.score || 0,
      candidates: best ? [best] : [],
      warnings,
      cloudUsed: false,
    };
  }

  const mode = String(
    process.env.OPSIQO_RECRUITING_DOCUMENT_AI_MODE || "auto",
  ).toLowerCase();
  const nativeScore = scoreResumeEvidence(nativeText);
  const useCloud =
    mode === "always" ||
    (mode !== "off" &&
      (!nativeText || nativeScore < NATIVE_AUTHORITY_SCORE));

  if (useCloud) {
    const ocr = documentAiResource(
      "OPSIQO_RECRUITING_DOCUMENT_AI_OCR_PROCESSOR",
    );
    const layout = documentAiResource(
      "OPSIQO_RECRUITING_DOCUMENT_AI_LAYOUT_PROCESSOR",
    );

    const jobs: Array<{
      source: ResumeEvidenceSource;
      task: Promise<string>;
    }> = [];

    if (ocr)
      jobs.push({
        source: "document_ai_ocr",
        task: processDocumentAi(ocr, input.bytes, "application/pdf", "ocr"),
      });
    if (layout)
      jobs.push({
        source: "document_ai_layout",
        task: processDocumentAi(layout, input.bytes, "application/pdf", "layout"),
      });

    const settled = await Promise.allSettled(jobs.map((job) => job.task));
    settled.forEach((result, index) => {
      const source = jobs[index]?.source;
      if (!source) return;
      if (result.status === "fulfilled" && result.value.trim())
        candidates.push({ source, text: result.value });
      else
        warnings.push(
          source === "document_ai_layout"
            ? "Document AI layout recovery was unavailable; OPSIQO used the strongest remaining evidence."
            : "Document AI OCR recovery was unavailable; OPSIQO used the strongest remaining evidence.",
        );
    });
  }

  const scored = candidates
    .map((candidate) => ({
      source: candidate.source,
      text: cleanText(candidate.text),
      score: scoreResumeEvidence(candidate.text),
    }))
    .filter((candidate) => candidate.text.length > 0);

  const best = chooseBestResumeEvidence(candidates);
  return {
    text: best?.text || "",
    source: best?.source || "none",
    score: best?.score || 0,
    candidates: scored,
    warnings: [...new Set(warnings)],
    cloudUsed: scored.some((candidate) => candidate.source !== "native"),
  };
}
