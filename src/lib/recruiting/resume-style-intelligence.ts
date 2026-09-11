export type ResumeHeadingKind =
  | 'experience'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'languages'
  | 'other';

const ENTITY_SUFFIX = /\b(?:inc(?:orporated)?|ltd|limited|llc|corp(?:oration)?|company|group|ngo|foundation|association|society|clinic|hospital|university|college|ministry|agency|authority|bank|school|institute|atelier|pharmacy)\b/i;
const ROLE_HINT = /\b(?:manager|director|advisor|adviser|officer|consultant|specialist|coordinator|supervisor|analyst|generalist|pharmacist|engineer|developer|administrator|president|chief|ceo|founder|co-founder|partner)\b/i;
const SECTION_SIGNAL = /\b(?:experience|employment|work\s+history|career\s+(?:history|experience|overview|highlights)|professional\s+(?:history|background|experience|profile|summary)|skills?|competenc(?:y|ies)|capabilit(?:y|ies)|expertise|strengths|proficienc(?:y|ies)|tools?|technolog(?:y|ies)|education|academic|qualifications?|certifications?|credentials?|licen[cs]es?|languages?|governance|advisory|engagement|leadership|achievements?|highlights?|affiliations?|memberships?|projects?|publications?|presentations?|volunteer|community|professional\s+development|training)\b/i;
const EXPERIENCE_SIGNAL = /\b(?:professional\s+experience|work\s+experience|employment(?:\s+history|\s+experience)?|work\s+history|career\s+(?:history|experience)|professional\s+(?:history|background)|relevant\s+experience|selected\s+experience|leadership\s+experience|executive\s+experience|consulting\s+experience)\b/i;
const EDUCATION_SIGNAL = /\b(?:education|academic\s+(?:background|history|credentials?|qualifications?)|qualifications?|degrees?)\b/i;
const SKILLS_SIGNAL = /\b(?:skills?|competenc(?:y|ies)|capabilit(?:y|ies)|expertise|strengths|proficienc(?:y|ies)|tools?(?:\s*&\s*technolog(?:y|ies))?|technolog(?:y|ies))\b/i;
const CERT_SIGNAL = /\b(?:certifications?|certificates?|credentials?|licen[cs]es?|professional\s+development)\b/i;
const LANGUAGE_SIGNAL = /\b(?:languages?|language\s+proficiency)\b/i;
const ACTION_START = /^(?:assessed|analyzed|analysed|built|created|delivered|designed|developed|directed|drove|established|evaluated|expanded|implemented|improved|increased|launched|led|managed|negotiated|oversaw|prepared|reduced|restructured|supported|trained|transformed|updated|worked|coordinated|conducted|administered|achieved|maintained|monitored|introduced|streamlined|supervised|assisted|answered|handled|served|processed|scheduled|collaborated|facilitated|provided|resolved|organized|organised|performed|ensured|promoted|advised|partnered)\b/i;
const MONTH = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const YEAR = '(?:19|20)\\d{2}';
const MONTH_YEAR = new RegExp('\\b(' + MONTH + '\\s+' + YEAR + '|' + YEAR + ')\\b', 'i');

function clean(value: unknown, max = 500): string {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
}

function canonical(value: unknown): string {
  return clean(value, 2000)
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}+#.&/-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function looksLikeResumeSectionHeading(value: unknown): boolean {
  const raw = clean(value, 180).replace(/^[•·▪◦‣●○►▸*\-]+\s*/u, '');
  if (!raw || raw.length > 180) return false;
  if (/https?:\/\/|www\.|\S+@\S+/i.test(raw)) return false;
  if (/\b(?:19|20)\d{2}\b/.test(raw)) return false;
  if (ENTITY_SUFFIX.test(raw)) return false;
  if (ROLE_HINT.test(raw)) return false;

  const words = raw.match(/[\p{L}\p{N}&/-]+/gu) || [];
  if (!words.length || words.length > 10) return false;

  const letters = raw.replace(/[^\p{L}]+/gu, '');
  const allUpper = Boolean(letters) && letters === letters.toLocaleUpperCase();
  const labelLike = /[:|]\s*$/.test(raw);
  const signal = SECTION_SIGNAL.test(raw);
  const thematicSignals = raw.match(/\b(?:governance|advisory|engagement|leadership|skills?|competenc(?:y|ies)|capabilit(?:y|ies)|expertise|experience|education|certifications?|languages?)\b/gi) || [];
  const multiSignalThematic = thematicSignals.length >= 2 && /[,/&]/.test(raw);

  return Boolean(signal && (allUpper || labelLike || multiSignalThematic));
}

export function resumeHeadingKind(value: unknown): ResumeHeadingKind | null {
  const raw = clean(value, 180);
  if (!raw) return null;

  const looksHeading = looksLikeResumeSectionHeading(raw);
  if (!looksHeading) return null;

  if (LANGUAGE_SIGNAL.test(raw)) return 'languages';
  if (EDUCATION_SIGNAL.test(raw)) return 'education';
  if (CERT_SIGNAL.test(raw)) return 'certifications';
  if (SKILLS_SIGNAL.test(raw)) return 'skills';
  if (EXPERIENCE_SIGNAL.test(raw)) return 'experience';
  return 'other';
}

export function looksLikeResumeNarrativeFragment(value: unknown): boolean {
  const raw = clean(value, 1200);
  if (!raw) return false;
  if (looksLikeResumeSectionHeading(raw)) return false;
  if (ENTITY_SUFFIX.test(raw)) return false;

  const text = raw.replace(/^[•·▪◦‣●○►▸*\-]+\s*/u, '').trim();
  const words = text.match(/[\p{L}\p{N}]+/gu) || [];

  if (ACTION_START.test(text)) return true;
  if (/^(?:responsible\s+for|accountable\s+for|duties\s+included|key\s+responsibilities\s+included)\b/i.test(text)) return true;
  if (/^\p{Ll}/u.test(text) && (/[.,;:!?]$/.test(text) || words.length >= 4)) return true;
  if (/[.!?]$/.test(text) && words.length >= 5) return true;
  if (words.length >= 10 && /[,;:]/.test(text)) return true;
  return false;
}

export function normalizeEducationLocationMeta(value: unknown): {
  location?: string;
  expectedDate?: string;
  status?: string;
} {
  const raw = clean(value, 320);
  if (!raw) return {};

  const statusMatch = raw.match(/\b(in\s+progress|ongoing|expected|anticipated|graduation\s+expected|completion\s+expected)\b/i);
  const expectedMatch = raw.match(
    new RegExp('\\b(?:expected|anticipated|graduation(?:\\s+expected)?|completion(?:\\s+expected)?)\\b[^()|;,.]{0,36}?(' + MONTH + '\\s+' + YEAR + '|' + YEAR + ')', 'i'),
  );
  const expectedDate = clean(expectedMatch?.[1] || '', 80) || undefined;

  let location = raw
    .replace(/\([^)]*\b(?:in\s+progress|ongoing|expected|anticipated|graduation|completion)\b[^)]*\)/gi, ' ')
    .replace(/\b(?:in\s+progress|ongoing|expected|anticipated|graduation\s+expected|completion\s+expected)\b.*$/i, ' ')
    .replace(/[;|]+\s*$/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[,;|\s]+|[,;|\s]+$/g, '')
    .trim();

  if (expectedDate && canonical(location) === canonical(expectedDate)) location = '';
  if (MONTH_YEAR.test(location) && location.split(/\s+/).length <= 3) location = '';

  return {
    location: location || undefined,
    expectedDate,
    status: statusMatch ? clean(statusMatch[1], 80) : undefined,
  };
}

function normalizedEvidence(value: unknown): string {
  return clean(value, 500000)
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}+#.]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function allIndexes(haystack: string, needle: string): number[] {
  if (!needle) return [];
  const out: number[] = [];
  let offset = 0;
  while (offset <= haystack.length - needle.length) {
    const index = haystack.indexOf(needle, offset);
    if (index < 0) break;
    out.push(index);
    offset = index + Math.max(1, needle.length);
  }
  return out;
}

export function minimumEvidenceDistance(a: unknown, b: unknown, source: string): number {
  const haystack = normalizedEvidence(source);
  const left = normalizedEvidence(a);
  const right = normalizedEvidence(b);
  if (!haystack || !left || !right) return Number.POSITIVE_INFINITY;

  const leftIndexes = allIndexes(haystack, left);
  const rightIndexes = allIndexes(haystack, right);
  if (!leftIndexes.length || !rightIndexes.length) return Number.POSITIVE_INFINITY;

  let distance = Number.POSITIVE_INFINITY;
  for (const x of leftIndexes) {
    for (const y of rightIndexes) {
      distance = Math.min(distance, Math.abs(x - y));
    }
  }
  return distance;
}

export function minimumEvidenceLineDistance(a: unknown, b: unknown, source: string): number {
  const left = normalizedEvidence(a);
  const right = normalizedEvidence(b);
  if (!left || !right) return Number.POSITIVE_INFINITY;

  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n').map(normalizedEvidence);
  const leftLines: number[] = [];
  const rightLines: number[] = [];

  lines.forEach((line, index) => {
    if (line && line.includes(left)) leftLines.push(index);
    if (line && line.includes(right)) rightLines.push(index);
  });

  if (!leftLines.length || !rightLines.length) return Number.POSITIVE_INFINITY;

  let distance = Number.POSITIVE_INFINITY;
  for (const x of leftLines) {
    for (const y of rightLines) distance = Math.min(distance, Math.abs(x - y));
  }
  return distance;
}
