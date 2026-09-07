export type RecruitingDocumentKind = 'resume' | 'cover_letter' | 'unknown';

export interface RecruitingDocumentClassification {
  kind: RecruitingDocumentKind;
  confidence: number;
  reasons: string[];
}

const normalized = (value: string) =>
  value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

const countMatches = (text: string, patterns: RegExp[]) =>
  patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);

export function classifyRecruitingDocument(
  fileName: string,
  text: string,
): RecruitingDocumentClassification {
  const name = normalized(fileName);
  const body = String(text || '').replace(/\u0000/g, '').slice(0, 120000);
  const lower = body.toLowerCase();

  const coverName =
    /\bcover\s*letter\b|\bmotivation\s*letter\b|\bapplication\s*letter\b/.test(name);
  const resumeName =
    /\bresume\b|\bcurriculum\s+vitae\b|(?:^|\s)cv(?:\s|\.|$)/.test(name);

  if (coverName && !resumeName) {
    return {
      kind: 'cover_letter',
      confidence: 0.99,
      reasons: ['filename identifies a cover letter'],
    };
  }

  const coverSignals = countMatches(lower, [
    /\bdear\s+(?:hiring|recruiting|selection|hr|human resources|sir|madam)\b/,
    /\bi am writing to (?:apply|express|submit)\b/,
    /\bplease accept my application\b/,
    /\bthank you for (?:your time|considering|reviewing)\b/,
    /\bsincerely\b|\byours sincerely\b|\bbest regards\b/,
    /\bcover letter\b/,
    /\bapplication for the (?:position|role)\b/,
  ]);

  const resumeHeadings = countMatches(body, [
    /^(?:professional\s+)?summary\b/im,
    /^(?:work|professional|employment)\s+experience\b/im,
    /^experience\b/im,
    /^education\b/im,
    /^(?:core\s+)?skills\b/im,
    /^certifications?\b/im,
    /^(?:technical\s+)?competencies\b/im,
    /^languages?\b/im,
  ]);

  const timeline =
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4}\b/i.test(
      body,
    ) ||
    /\b(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:present|current|(?:19|20)\d{2})\b/i.test(
      body,
    );

  if (coverSignals >= 2 && resumeHeadings <= 1) {
    return {
      kind: 'cover_letter',
      confidence: Math.min(0.96, 0.72 + coverSignals * 0.06),
      reasons: [`${coverSignals} cover-letter signals`, `${resumeHeadings} resume headings`],
    };
  }

  if (resumeName && coverSignals < 2) {
    return {
      kind: 'resume',
      confidence: 0.97,
      reasons: ['filename identifies a resume/CV'],
    };
  }

  if (resumeHeadings >= 3 || (resumeHeadings >= 2 && timeline)) {
    return {
      kind: 'resume',
      confidence: Math.min(0.96, 0.74 + resumeHeadings * 0.05),
      reasons: [
        `${resumeHeadings} resume headings`,
        timeline ? 'dated employment evidence' : 'structured resume evidence',
      ],
    };
  }

  return {
    kind: 'unknown',
    confidence: 0.5,
    reasons: ['document type is not strong enough to classify automatically'],
  };
}

export function isPlausibleProfessionalHeadline(value: string | undefined) {
  const text = String(value || '').trim();
  if (!text || text.length < 3 || text.length > 180) return false;
  const letters = (text.match(/\p{L}/gu) || []).length;
  const visible = text.replace(/\s/g, '').length || 1;
  if (letters < 3 || letters / visible < 0.58) return false;
  if (/[$<>|{}\[\]\\]{2,}|[?]{2,}|[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
    return false;
  }
  return true;
}
