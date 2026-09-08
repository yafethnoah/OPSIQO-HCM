import type { ParsedResumeProfile } from '@/domain/ats';
import type {
  StructuredResumeProfile,
  ResumeEmploymentEntry,
  ResumeEducationEntry,
} from '@/domain/structured-resume';

export interface StructuredResumeAssessment {
  quality: number;
  coverage: number;
  recordCount: number;
  issues: string[];
  criticalIssues: string[];
}

const ALL_HEADINGS = new Set([
  'professional summary','summary','profile','professional profile',
  'professional experience','work experience','experience','employment history','career history',
  'skills','technical skills','core competencies','competencies','expertise',
  'education','academic background','academic qualifications','qualifications',
  'certifications','certificates','licences','licenses',
  'languages','language skills','projects','selected projects','key projects',
  'volunteer experience','volunteering','community experience','community involvement',
  'awards','honours','honors','achievements','publications','presentations',
  'additional information','professional affiliations','memberships','interests',
]);

const EXPERIENCE_HEADINGS = ['professional experience','work experience','experience','employment history','career history'];
const EDUCATION_HEADINGS = ['education','academic background','academic qualifications','qualifications'];
const SKILLS_HEADINGS = ['skills','technical skills','core competencies','competencies','expertise'];
const CERTIFICATION_HEADINGS = ['certifications','certificates','licences','licenses'];
const LANGUAGE_HEADINGS = ['languages','language skills'];

const DEGREE_HINT = /\b(?:bachelor(?:'s)?|master(?:'s)?|doctor(?:ate|al)?|ph\.?d\.?|mba|m\.?sc\.?|b\.?sc\.?|b\.?a\.?|b\.?s\.?|m\.?a\.?|m\.?s\.?|diploma|degree|post[- ]?graduate|graduate certificate)\b/i;
const INSTITUTION_HINT = /\b(?:university|college|institute|school|academy|polytechnic|faculty|conservatory)\b/i;
const TITLE_HINT = /\b(?:chief|ceo|president|vice president|vp|director|manager|specialist|officer|coordinator|advisor|adviser|consultant|partner|lead|head|supervisor|analyst|generalist|pharmacist|engineer|developer|administrator|executive|founder|co-founder)\b/i;
const ROLE_DESCRIPTOR = /^(?:founding leader|founder|co-founder|team leader|project leader|executive leader|senior leader|department head|board member|consultant|advisor|adviser)$/i;
const ACTION_SENTENCE = /^(?:assessed|analyzed|analysed|built|created|delivered|designed|developed|directed|drove|established|evaluated|expanded|implemented|improved|increased|launched|led|managed|negotiated|oversaw|prepared|reduced|restructured|supported|trained|transformed|updated|worked|coordinated|conducted|administered|achieved|maintained|monitored|introduced|streamlined|supervised)\b/i;
const DATE_TOKEN = /\b(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(?:19|20)\d{2}\b/i;
const DATE_RANGE = new RegExp(`${DATE_TOKEN.source}\\s*(?:-|–|—|to)\\s*(?:(?:present|current|now)|${DATE_TOKEN.source})`, 'i');
const LOCATION_HINT = /(?:,\s*[A-Z]{2}\b)|\b(?:ontario|canada|jordan|syria|damascus|amman|toronto|mississauga|ottawa|montreal|vancouver|remote|hybrid)\b/i;

function clean(v: unknown, max = 5000): string {
  return String(v ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
}

function cleanHeading(v: string) {
  return clean(v, 160).toLowerCase().replace(/[:|]+$/g, '').replace(/\s+/g, ' ').trim();
}

function sectionBody(source: string, aliases: string[]): string {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n');
  const wanted = new Set(aliases.map(cleanHeading));
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (wanted.has(cleanHeading(lines[i] || ''))) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return '';
  const out: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const raw = lines[i] || '';
    if (ALL_HEADINGS.has(cleanHeading(raw))) break;
    out.push(raw);
  }
  return out.join('\n').trim();
}

function normalizeEvidence(v: string) {
  return clean(v, 500000).toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function supported(value: unknown, source: string, threshold = 0.68): string | undefined {
  const text = clean(value, 5000);
  if (!text) return undefined;
  const src = normalizeEvidence(source);
  const exact = normalizeEvidence(text);
  if (exact.length >= 3 && src.includes(exact)) return text;
  const words = exact.match(/[a-z0-9+#.]{2,}/g) || [];
  if (!words.length) return undefined;
  const unique = [...new Set(words)];
  const hit = unique.filter((w) => src.includes(w)).length;
  return hit / unique.length >= threshold ? text : undefined;
}

function indexOfEvidence(value: string, source: string) {
  const needle = normalizeEvidence(value);
  if (!needle) return -1;
  return normalizeEvidence(source).indexOf(needle);
}

function coLocated(a: string | undefined, b: string | undefined, source: string, maxDistance = 900) {
  if (!a || !b) return false;
  const ai = indexOfEvidence(a, source);
  const bi = indexOfEvidence(b, source);
  return ai >= 0 && bi >= 0 && Math.abs(ai - bi) <= maxDistance;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((v) => clean(v, 400)).filter(Boolean))];
}

function splitParts(line: string) {
  return line
    .split(/\s*(?:\||•|—|–)\s*|\s+-\s+/)
    .map((v) => clean(v, 400))
    .filter(Boolean);
}

function parseEducation(source: string): ResumeEducationEntry[] {
  const body = sectionBody(source, EDUCATION_HEADINGS);
  if (!body) return [];
  const lines = body.split('\n').map((v) => clean(v, 700)).filter(Boolean);
  const out: ResumeEducationEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (ACTION_SENTENCE.test(line) && !DEGREE_HINT.test(line)) continue;

    const parts = splitParts(line);
    let degree = '';
    let institution = '';
    let fieldOfStudy: string | undefined;
    let dateText: string | undefined;

    if (parts.length >= 2) {
      const degreeIndex = parts.findIndex((p) => DEGREE_HINT.test(p));
      const institutionIndex = parts.findIndex((p) => INSTITUTION_HINT.test(p));
      if (degreeIndex >= 0) degree = parts[degreeIndex]!;
      if (institutionIndex >= 0) institution = parts[institutionIndex]!;
      if (degreeIndex >= 0 && institutionIndex >= 0) {
        const between = parts.filter((_, idx) => idx !== degreeIndex && idx !== institutionIndex && !DATE_TOKEN.test(parts[idx]!));
        fieldOfStudy = between[0];
      }
      dateText = parts.find((p) => DATE_TOKEN.test(p));
    }

    if (!degree && DEGREE_HINT.test(line)) degree = line;
    if (!institution && INSTITUTION_HINT.test(line)) institution = line;

    if (degree && !institution) {
      for (let j = i + 1; j <= Math.min(i + 2, lines.length - 1); j++) {
        const candidate = lines[j]!;
        if (INSTITUTION_HINT.test(candidate) && !ACTION_SENTENCE.test(candidate)) {
          institution = candidate;
          if (j === i + 2 && lines[i + 1] && !DATE_TOKEN.test(lines[i + 1]!) && !ACTION_SENTENCE.test(lines[i + 1]!)) {
            fieldOfStudy = lines[i + 1]!;
          }
          break;
        }
      }
    }

    if (!degree || !institution) continue;
    if (ACTION_SENTENCE.test(degree) || ACTION_SENTENCE.test(institution)) continue;

    const record: ResumeEducationEntry = {
      degree: clean(degree, 260),
      institution: clean(institution, 280),
    };
    if (fieldOfStudy && !INSTITUTION_HINT.test(fieldOfStudy) && !ACTION_SENTENCE.test(fieldOfStudy)) {
      record.fieldOfStudy = clean(fieldOfStudy, 260);
    }
    if (dateText) {
      const m = dateText.match(DATE_RANGE);
      if (m) {
        const [start, end] = m[0].split(/\s*(?:-|–|—|to)\s*/i);
        record.startDate = clean(start, 80);
        record.endDate = clean(end, 80);
      } else {
        record.graduationDate = clean(dateText, 80);
      }
    }
    out.push(record);
  }

  return dedupeEducation(out).slice(0, 40);
}

function dedupeEducation(items: ResumeEducationEntry[]) {
  const seen = new Set<string>();
  return items.filter((x) => {
    const key = `${cleanHeading(x.degree)}|${cleanHeading(x.institution)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function employerCandidate(line: string) {
  const value = clean(line, 260);
  if (!value || DATE_TOKEN.test(value) || LOCATION_HINT.test(value) || ACTION_SENTENCE.test(value)) return false;
  if (ROLE_DESCRIPTOR.test(value)) return false;
  if (TITLE_HINT.test(value) && value.split(/\s+/).length <= 8) return false;
  return value.length <= 140;
}

function titleCandidate(line: string) {
  const value = clean(line, 240);
  return Boolean(value && TITLE_HINT.test(value) && !ACTION_SENTENCE.test(value) && !DATE_TOKEN.test(value));
}

function parseEmploymentBlock(lines: string[]): ResumeEmploymentEntry | null {
  const values = lines.map((v) => clean(v, 1200)).filter(Boolean);
  if (!values.length) return null;

  let positionTitle = '';
  let employer = '';
  let startDate: string | undefined;
  let endDate: string | undefined;
  let current = false;
  let location: string | undefined;

  const dateIndex = values.findIndex((v) => DATE_RANGE.test(v));
  if (dateIndex >= 0) {
    const match = values[dateIndex]!.match(DATE_RANGE)?.[0] || '';
    const parts = match.split(/\s*(?:-|–|—|to)\s*/i);
    startDate = clean(parts[0], 80) || undefined;
    endDate = clean(parts[1], 80) || undefined;
    current = /present|current|now/i.test(endDate || '');
    if (current) endDate = undefined;
  }

  const metaEnd = dateIndex >= 0 ? dateIndex : Math.min(values.length, 4);
  const metadata = values.slice(0, metaEnd);
  positionTitle = metadata.find(titleCandidate) || '';
  const titleIndex = metadata.indexOf(positionTitle);
  const employerPool = metadata.filter((v, idx) => idx !== titleIndex);
  employer = employerPool.find(employerCandidate) || '';

  if (!positionTitle && values[0] && titleCandidate(values[0])) positionTitle = values[0];
  if (!employer && positionTitle) {
    const idx = values.indexOf(positionTitle);
    const nearby = [values[idx + 1], values[idx - 1]].filter((v): v is string => Boolean(v));
    employer = nearby.find(employerCandidate) || '';
  }

  const locationLine = values.find((v, idx) => idx !== dateIndex && LOCATION_HINT.test(v) && !ACTION_SENTENCE.test(v));
  if (locationLine) location = locationLine;

  const responsibilities = values
    .slice(dateIndex >= 0 ? dateIndex + 1 : Math.min(metadata.length, 3))
    .filter((v) => ACTION_SENTENCE.test(v) || /^[•·▪◦*-]/.test(v))
    .map((v) => v.replace(/^[•·▪◦*-]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 40);

  if (!positionTitle || !employer) return null;
  return { positionTitle, employer, current, startDate, endDate, location, responsibilities };
}

function parseEmployment(source: string): ResumeEmploymentEntry[] {
  const body = sectionBody(source, EXPERIENCE_HEADINGS);
  if (!body) return [];
  const rawBlocks = body.split(/\n\s*\n+/).map((b) => b.split('\n').filter((v) => clean(v))).filter((b) => b.length);

  let blocks = rawBlocks;
  if (blocks.length <= 1) {
    const lines = body.split('\n').map((v) => clean(v, 1200)).filter(Boolean);
    blocks = [];
    let current: string[] = [];
    for (const line of lines) {
      if (DATE_RANGE.test(line) && current.length >= 2) {
        current.push(line);
        blocks.push(current);
        current = [];
      } else if (blocks.length && current.length === 0 && ACTION_SENTENCE.test(line)) {
        blocks[blocks.length - 1]!.push(line);
      } else {
        current.push(line);
      }
    }
    if (current.length >= 2) blocks.push(current);
  }

  const out = blocks.map(parseEmploymentBlock).filter((x): x is ResumeEmploymentEntry => Boolean(x));
  const seen = new Set<string>();
  return out.filter((x) => {
    const key = `${cleanHeading(x.positionTitle)}|${cleanHeading(x.employer)}|${cleanHeading(x.startDate || '')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 60);
}

function sectionLines(source: string, headings: string[], max: number) {
  return uniqueStrings(
    sectionBody(source, headings)
      .split(/\n|;/)
      .map((v) => v.replace(/^[•·▪◦*-]\s*/, '').trim())
      .filter((v) => v && !ACTION_SENTENCE.test(v)),
  ).slice(0, max);
}

export function deterministicStructuredResume(profile: Pick<ParsedResumeProfile, 'sourceText'|'skills'|'certifications'>): StructuredResumeProfile {
  const source = String(profile.sourceText || '');
  const skillsFromSection = sectionLines(source, SKILLS_HEADINGS, 200);
  const certificationsFromSection = sectionLines(source, CERTIFICATION_HEADINGS, 60);
  const languages = sectionLines(source, LANGUAGE_HEADINGS, 40).map((language) => {
    const parts = splitParts(language);
    return { language: parts[0] || language, proficiency: parts[1] };
  });

  return {
    employmentHistory: parseEmployment(source),
    educationHistory: parseEducation(source),
    skills: uniqueStrings([...(skillsFromSection.length ? skillsFromSection : profile.skills || [])]).slice(0, 200),
    certifications: uniqueStrings([...(certificationsFromSection.length ? certificationsFromSection : profile.certifications || [])])
      .map((name) => ({ name }))
      .slice(0, 60),
    languages,
    projects: [],
    volunteerExperience: [],
    awards: [],
    publications: [],
    additionalInformation: '',
  };
}

function safeEmployment(items: StructuredResumeProfile['employmentHistory'], source: string) {
  return (items || []).flatMap((raw) => {
    const positionTitle = supported(raw.positionTitle, source, 0.72) || '';
    let employer = supported(raw.employer, source, 0.72) || '';
    if (ROLE_DESCRIPTOR.test(employer) || ACTION_SENTENCE.test(employer)) employer = '';
    if (positionTitle && employer && !coLocated(positionTitle, employer, source, 1300)) employer = '';
    const responsibilities = (raw.responsibilities || [])
      .flatMap((v) => {
        const x = supported(v, source, 0.68);
        return x ? [x] : [];
      })
      .slice(0, 40);
    if (!positionTitle && !employer && !responsibilities.length) return [];
    return [{
      ...raw,
      positionTitle,
      employer,
      startDate: supported(raw.startDate, source, 0.7),
      endDate: supported(raw.endDate, source, 0.7),
      location: supported(raw.location, source, 0.7),
      city: supported(raw.city, source, 0.7),
      region: supported(raw.region, source, 0.7),
      country: supported(raw.country, source, 0.7),
      responsibilities,
      reasonForLeaving: supported(raw.reasonForLeaving, source, 0.8),
    }];
  });
}

function safeEducation(items: StructuredResumeProfile['educationHistory'], source: string) {
  return (items || []).flatMap((raw) => {
    let degree = supported(raw.degree, source, 0.72) || '';
    let institution = supported(raw.institution, source, 0.72) || '';
    let fieldOfStudy = supported(raw.fieldOfStudy, source, 0.72);
    if (ACTION_SENTENCE.test(degree) && !DEGREE_HINT.test(degree)) degree = '';
    if (ACTION_SENTENCE.test(institution)) institution = '';
    if (degree && institution && !coLocated(degree, institution, source, 1000)) institution = '';
    if (!degree && !institution) return [];
    return [{
      ...raw,
      degree,
      institution,
      fieldOfStudy,
      startDate: supported(raw.startDate, source, 0.7),
      endDate: supported(raw.endDate, source, 0.7),
      graduationDate: supported(raw.graduationDate, source, 0.7),
      location: supported(raw.location, source, 0.7),
    }];
  });
}

export function sanitizeStructuredResume(input: StructuredResumeProfile, source: string): StructuredResumeProfile {
  const safeSimple = <T extends object, K extends keyof T>(items: T[], anchor: K, max: number): T[] =>
    (items || []).filter((item) => Boolean(supported(item[anchor] as unknown, source, 0.68))).slice(0, max);

  return {
    employmentHistory: safeEmployment(input.employmentHistory || [], source),
    educationHistory: safeEducation(input.educationHistory || [], source),
    skills: uniqueStrings((input.skills || []).flatMap((v) => supported(v, source, 0.65) ? [v] : [])).slice(0, 200),
    certifications: safeSimple(input.certifications || [], 'name', 60),
    languages: safeSimple(input.languages || [], 'language', 40),
    projects: safeSimple(input.projects || [], 'name', 50),
    volunteerExperience: safeSimple(input.volunteerExperience || [], 'organization', 50),
    awards: safeSimple(input.awards || [], 'title', 50),
    publications: safeSimple(input.publications || [], 'title', 50),
    additionalInformation: supported(input.additionalInformation, source, 0.65),
  };
}

export function mergeStructuredResume(
  primary: StructuredResumeProfile | undefined,
  fallback: StructuredResumeProfile,
  source: string,
): StructuredResumeProfile {
  const p = primary ? sanitizeStructuredResume(primary, source) : undefined;
  const choose = <T>(a: T[] | undefined, b: T[]) => a && a.length ? a : b;
  return sanitizeStructuredResume({
    employmentHistory: choose(p?.employmentHistory, fallback.employmentHistory),
    educationHistory: choose(p?.educationHistory, fallback.educationHistory),
    skills: choose(p?.skills, fallback.skills),
    certifications: choose(p?.certifications, fallback.certifications),
    languages: choose(p?.languages, fallback.languages),
    projects: choose(p?.projects, fallback.projects),
    volunteerExperience: choose(p?.volunteerExperience, fallback.volunteerExperience),
    awards: choose(p?.awards, fallback.awards),
    publications: choose(p?.publications, fallback.publications),
    additionalInformation: p?.additionalInformation || fallback.additionalInformation,
  }, source);
}

function categoryHints(source: string) {
  const normalized = String(source || '').toLowerCase();
  const hasHeading = (headings: string[]) => headings.some((h) => new RegExp(`(?:^|\\n)\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?(?:\\n|$)`, 'i').test(normalized));
  return {
    employmentHistory: hasHeading(EXPERIENCE_HEADINGS),
    educationHistory: hasHeading(EDUCATION_HEADINGS),
    skills: hasHeading(SKILLS_HEADINGS),
    certifications: hasHeading(CERTIFICATION_HEADINGS),
    languages: hasHeading(LANGUAGE_HEADINGS),
  };
}

export function assessStructuredResume(input: StructuredResumeProfile, source: string): StructuredResumeAssessment {
  const sr = sanitizeStructuredResume(input, source);
  const issues: string[] = [];
  const criticalIssues: string[] = [];
  const scores: number[] = [];

  for (const [i, x] of sr.employmentHistory.entries()) {
    let score = 0;
    if (x.positionTitle) score += 20; else criticalIssues.push(`Employment ${i + 1}: position title unresolved.`);
    if (x.employer) score += 25; else criticalIssues.push(`Employment ${i + 1}: employer unresolved.`);
    if (x.current || x.startDate || x.endDate) score += 15; else issues.push(`Employment ${i + 1}: dates need review.`);
    if (x.responsibilities.length) score += 30; else issues.push(`Employment ${i + 1}: responsibilities need review.`);
    if (x.location) score += 5;
    if (x.positionTitle && x.employer && coLocated(x.positionTitle, x.employer, source, 1300)) score += 5;
    scores.push(score);
  }

  for (const [i, x] of sr.educationHistory.entries()) {
    let score = 0;
    if (x.degree) score += 30; else criticalIssues.push(`Education ${i + 1}: degree unresolved.`);
    if (x.institution) score += 35; else criticalIssues.push(`Education ${i + 1}: institution unresolved.`);
    if (x.fieldOfStudy) score += 15; else issues.push(`Education ${i + 1}: field of study needs review.`);
    if (x.startDate || x.endDate || x.graduationDate) score += 10;
    if (x.location) score += 5;
    if (x.degree && x.institution && coLocated(x.degree, x.institution, source, 1000)) score += 5;
    scores.push(score);
  }

  if (sr.skills.length) scores.push(85);
  if (sr.certifications.length) scores.push(85);
  if (sr.languages.length) scores.push(85);
  if (sr.projects.length) scores.push(80);
  if (sr.volunteerExperience.length) scores.push(80);
  if (sr.awards.length) scores.push(80);
  if (sr.publications.length) scores.push(80);

  const hints = categoryHints(source);
  const expected = Object.entries(hints).filter(([, value]) => value);
  const present = expected.filter(([key]) => {
    const value = sr[key as keyof typeof sr];
    return Array.isArray(value) && value.length > 0;
  }).length;
  const coverage = expected.length ? Math.round((present / expected.length) * 99) : (scores.length ? 80 : 0);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const quality = Math.min(99, Math.max(0, Math.round(average * 0.8 + coverage * 0.2)));

  if (hints.employmentHistory && !sr.employmentHistory.length) criticalIssues.push('Experience section detected but no reliable employment records were built.');
  if (hints.educationHistory && !sr.educationHistory.length) criticalIssues.push('Education section detected but no reliable education records were built.');

  const recordCount =
    sr.employmentHistory.length + sr.educationHistory.length + sr.skills.length +
    sr.certifications.length + sr.languages.length + sr.projects.length +
    sr.volunteerExperience.length + sr.awards.length + sr.publications.length;

  return {
    quality,
    coverage,
    recordCount,
    issues: [...new Set(issues)].slice(0, 40),
    criticalIssues: [...new Set(criticalIssues)].slice(0, 40),
  };
}
