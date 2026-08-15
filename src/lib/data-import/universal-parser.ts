import type {
  ImportFieldProposal,
  ImportedFormField,
  ImportLibraryKind,
  UniversalImportAnalysis,
  ZipImportEntryAnalysis,
} from '@/domain/import-library';
import { extractDocxText, extractRtfText } from '@/lib/contract-import/docx';
import { parseTabularFile } from './tabular';
import { listSafeZipEntries, readSafeZipEntry } from './zip';
import { extractPdfTextLayer } from './pdf-text';

const VERSION = 'UNIVERSAL_IMPORT_V2' as const;
const MAX_TEXT = 600_000;
const now = () => new Date().toISOString();
const clean = (s: string) => s.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const ext = (name: string) => name.toLowerCase().slice(name.lastIndexOf('.'));
const humanTitle = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

const KIND_KEYWORDS: Record<ImportLibraryKind, string[]> = {
  policy: ['policy', 'purpose', 'scope', 'effective date', 'policy statement', 'responsibilities'],
  procedure: ['procedure', 'purpose', 'scope', 'steps', 'responsibility', 'process'],
  sop: ['standard operating procedure', 'sop', 'procedure steps', 'work instruction'],
  contract: ['agreement', 'employment agreement', 'contract', 'employee', 'employer', 'termination'],
  form: ['form', 'employee name', 'signature', 'date:', 'approved by', 'request'],
  template: ['template', 'placeholder', 'insert', 'example'],
  employee_document: ['employee document'],
  training_record: ['training', 'course', 'completion date', 'certificate', 'expiry'],
  organization_reference: ['organization', 'department', 'division', 'org unit', 'manager'],
  position_reference: ['position', 'job title', 'position code', 'job family', 'grade'],
  job_description: ['job description', 'responsibilities', 'qualifications', 'requirements', 'reports to'],
  employee_roster: ['employee number', 'employee id', 'work email', 'hire date', 'department'],
  zip_library: ['zip library'],
  other: [],
};

const TARGET_MODULE: Record<ImportLibraryKind, string> = {
  policy: 'Compliance / Policy Library', procedure: 'Process Library', sop: 'Process Library', contract: 'Contract Import Studio',
  form: 'Digital Forms', template: 'Digital Forms', employee_document: 'Employee Documents', training_record: 'Learning',
  organization_reference: 'Organization Design', position_reference: 'Positions', job_description: 'Recruiting / Job Architecture',
  employee_roster: 'Core HR', zip_library: 'Import Center', other: 'Evidence Center',
};

const EMPLOYEE_COLUMN_ALIASES: Record<string,string[]> = {
  legalFirstName: ['first name','firstname','legal first name','given name'],
  legalLastName: ['last name','lastname','legal last name','surname','family name'],
  workEmail: ['email','work email','company email','business email'],
  phone: ['phone','mobile','telephone','phone number'],
  employeeNumber: ['employee number','employee id','staff id','staff number','personnel id','worker number','employee code','emp #'],
  employmentType: ['employment type','worker type','contract type'],
  hireDate: ['hire date','start date','employment start date','date of hire'],
  orgUnit: ['org unit','department','team','organization unit','business unit','division'],
  position: ['position','job title','title','role','position title'],
  manager: ['manager','manager email','manager id','manager number','supervisor','reports to','line manager'],
};
function employeeHeaderTarget(header:string){const h=norm(header);for(const [target,aliases] of Object.entries(EMPLOYEE_COLUMN_ALIASES))if(aliases.some(a=>norm(a)===h))return target;return undefined;}
function employeeRosterFields(name:string,bytes:Buffer){const parsed=parseTabularFile(name,bytes),fields:ImportFieldProposal[]=[];const unmapped:string[]=[];for(const header of parsed.headers){const target=employeeHeaderTarget(header);if(!target){unmapped.push(header);continue}const samples=parsed.rows.map(r=>r[header]||'').filter(Boolean).slice(0,3);fields.push({sourceLabel:header,targetModule:TARGET_MODULE.employee_roster,targetField:target,value:samples,confidence:0.94,evidence:samples.join(' | ').slice(0,500)||header,requiresHumanConfirmation:true});}return{fields,unmapped,rowCount:parsed.rows.length};}


function filenameKind(name: string): { kind: ImportLibraryKind; confidence: number } {
  const n = norm(humanTitle(name));
  const checks: Array<[ImportLibraryKind, RegExp]> = [
    ['job_description', /\b(job description|job profile|jd)\b/], ['sop', /\b(sop|standard operating procedure)\b/],
    ['procedure', /\b(procedure|process|work instruction)\b/], ['policy', /\bpolicy\b/], ['contract', /\b(contract|agreement|offer letter)\b/],
    ['training_record', /\b(training|certificate|course record)\b/], ['position_reference', /\b(position|job list|position list)\b/],
    ['organization_reference', /\b(org chart|organization|department list|org unit)\b/], ['employee_roster', /\b(employee|worker|staff).*(roster|list|master)\b/],
    ['form', /\b(form|request|checklist)\b/], ['template', /\btemplate\b/],
  ];
  for (const [kind, re] of checks) if (re.test(n)) return { kind, confidence: 0.7 };
  return { kind: 'other', confidence: 0.2 };
}

export function classifyImport(name: string, text = ''): { kind: ImportLibraryKind; confidence: number } {
  if (ext(name) === '.zip') return { kind: 'zip_library', confidence: 1 };
  const fromName = filenameKind(name);
  const hay = norm(`${humanTitle(name)}\n${text.slice(0, 80_000)}`);
  let best = fromName;
  for (const [kind, words] of Object.entries(KIND_KEYWORDS) as Array<[ImportLibraryKind, string[]]>) {
    if (!words.length) continue;
    const hits = words.filter(w => hay.includes(norm(w))).length;
    const score = Math.min(0.98, 0.28 + hits / Math.max(4, words.length));
    if (hits >= 2 && score > best.confidence) best = { kind, confidence: score };
  }
  if (/\bfirst name\b/.test(hay) && /\blast name\b/.test(hay) && /\b(email|work email)\b/.test(hay)) best = { kind: 'employee_roster', confidence: 0.92 };
  return best;
}

function lineValue(text: string, labels: string[]): { value?: string; evidence?: string } {
  const escaped = labels.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`^(?:${escaped})\\s*[:#-]\\s*(.+)$`, 'im');
  const m = re.exec(text);
  return m ? { value: m[1]!.trim().slice(0, 2000), evidence: m[0]!.trim().slice(0, 500) } : {};
}

function field(targetModule: string, targetField: string, sourceLabel: string, x: { value?: string; evidence?: string }, confidence = 0.88): ImportFieldProposal | null {
  if (!x.value) return null;
  return { sourceLabel, targetModule, targetField, value: x.value, confidence, evidence: x.evidence, requiresHumanConfirmation: true };
}

function section(text: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|\\n)\\s*(?:\\d+[.)]\\s*)?${escaped}\\s*[:\\n]([\\s\\S]*?)(?=\\n\\s*(?:\\d+[.)]\\s*)?[A-Z][A-Z &/()-]{3,}[:\\n]|$)`, 'i');
    const m = re.exec(text);
    if (m?.[1]?.trim()) return m[1].trim().slice(0, 12_000);
  }
  return '';
}

function commonFields(kind: ImportLibraryKind, text: string, name: string) {
  const target = TARGET_MODULE[kind];
  const out: ImportFieldProposal[] = [];
  const defs: Array<[string, string, string[]]> = [
    ['title', 'Title', ['Title', 'Policy Title', 'Procedure Title', 'Document Title', 'Job Title', 'Course Title']],
    ['code', 'Code', ['Code', 'Document Code', 'Policy Code', 'Procedure Code', 'Position Code']],
    ['version', 'Version', ['Version', 'Version No', 'Revision']],
    ['effectiveDate', 'Effective Date', ['Effective Date', 'Effective']],
    ['reviewDate', 'Review Date', ['Review Date', 'Next Review']],
    ['owner', 'Owner', ['Owner', 'Document Owner', 'Process Owner', 'Policy Owner']],
    ['approver', 'Approver', ['Approved By', 'Approver']],
    ['approvalDate', 'Approval Date', ['Approval Date', 'Approved Date']],
  ];
  for (const [targetField, sourceLabel, labels] of defs) {
    const f = field(target, targetField, sourceLabel, lineValue(text, labels));
    if (f) out.push(f);
  }
  if (!out.some(x => x.targetField === 'title')) out.unshift({ sourceLabel: 'File name', targetModule: target, targetField: 'title', value: humanTitle(name), confidence: 0.72, evidence: name, requiresHumanConfirmation: true });
  return out;
}

function policyProcedureFields(kind: ImportLibraryKind, text: string, name: string) {
  const target = TARGET_MODULE[kind];
  const fields = commonFields(kind, text, name);
  const sections: Array<{ name: string; text: string; confidence: number }> = [];
  const names = ['Purpose', 'Scope', 'Definitions', 'Responsibilities', 'Policy Statement', 'Requirements', 'Procedure', 'Exceptions', 'Records', 'Training', 'Related Documents', 'References'];
  for (const n of names) {
    const value = section(text, [n]);
    if (value) {
      sections.push({ name: n, text: value, confidence: 0.78 });
      fields.push({ sourceLabel: n, targetModule: target, targetField: n.toLowerCase().replace(/\s+/g, '_'), value, confidence: 0.78, evidence: value.slice(0, 350), requiresHumanConfirmation: true });
    }
  }
  const steps: Array<{ order: number; instruction: string; ownerRole?: string; evidence?: string }> = [];
  if (kind === 'procedure' || kind === 'sop') {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const m = /^\s*(\d{1,3})[.)-]\s+(.{5,1000})$/.exec(line);
      if (m) steps.push({ order: Number(m[1]), instruction: m[2]!.trim(), evidence: line.trim() });
      if (steps.length >= 100) break;
    }
  }
  return { fields, sections, steps };
}

function inferFormType(label: string): ImportedFormField['type'] {
  const x = norm(label);
  if (x.includes('email')) return 'email';
  if (x.includes('phone') || x.includes('mobile')) return 'phone';
  if (x.includes('date')) return 'date';
  if (x.includes('signature') || x.includes('signed')) return 'signature';
  if (x.includes('approve') || x.includes('manager approval')) return 'approval';
  if (x.includes('amount') || x.includes('number') || x.includes('hours') || x.includes('quantity')) return 'number';
  if (x.includes('reason') || x.includes('description') || x.includes('comments') || x.includes('details') || x.includes('notes')) return 'long_text';
  return 'text';
}

function formFields(text: string): ImportedFormField[] {
  const found = new Map<string, ImportedFormField>();
  const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  for (const line of lines) {
    let label = '';
    let required = /\*\s*$/.test(line) || /\brequired\b/i.test(line);
    const colon = /^([A-Za-z][A-Za-z0-9 /&()'-]{2,70})\s*:\s*(?:_+|\s*)$/.exec(line);
    const blank = /^([A-Za-z][A-Za-z0-9 /&()'-]{2,70})\s+_{3,}$/.exec(line);
    const check = /^(?:☐|□|\[\s?\])\s*(.{2,70})$/.exec(line);
    if (colon) label = colon[1]!.trim();
    else if (blank) label = blank[1]!.trim();
    else if (check) label = check[1]!.trim();
    if (!label) continue;
    const key = norm(label).replace(/\s+/g, '_').slice(0, 60);
    if (!found.has(key)) found.set(key, { label, proposedKey: key, type: check ? 'checkbox' : inferFormType(label), required, confidence: 0.76, evidence: line });
    if (found.size >= 120) break;
  }
  return [...found.values()];
}

function titleFromText(text: string, fallback: string) {
  const first = text.split(/\r?\n/).map(x => x.trim()).find(x => x.length >= 4 && x.length <= 180);
  return first || humanTitle(fallback);
}

function textFromFile(name: string, bytes: Buffer): string {
  const e = ext(name);
  if (e === '.docx') return clean(extractDocxText(bytes));
  if (e === '.rtf') return clean(extractRtfText(bytes));
  if (['.txt', '.md', '.json', '.csv'].includes(e)) return clean(bytes.toString('utf8'));
  if (e === '.pdf') return clean(extractPdfTextLayer(bytes));
  if (e === '.xlsx') {
    const parsed = parseTabularFile(name, bytes);
    const text = [parsed.headers.join(' | '), ...parsed.rows.slice(0, 500).map(r => parsed.headers.map(h => r[h] || '').join(' | '))].join('\n');
    return clean(text);
  }
  return '';
}

function analyzeZip(name: string, bytes: Buffer): UniversalImportAnalysis {
  const entries = listSafeZipEntries(bytes).filter(e => !e.name.endsWith('/'));
  const zipEntries: ZipImportEntryAnalysis[] = [];
  for (const e of entries.slice(0, 300)) {
    let text = '';
    const warnings: string[] = [];
    const extension = ext(e.name);
    const parseable = ['.docx', '.rtf', '.txt', '.md', '.json', '.csv', '.xlsx', '.pdf'].includes(extension);
    if (parseable) {
      try { text = textFromFile(e.name, readSafeZipEntry(bytes, e)); } catch (err) { warnings.push(err instanceof Error ? err.message : 'Entry could not be parsed.'); }
    } else if (extension === '.zip') warnings.push('Nested ZIP archives are inventoried but not recursively expanded.');
    const detected = classifyImport(e.name, text);
    zipEntries.push({ path: e.name, size: e.uncompressedSize, detectedKind: detected.kind, confidence: detected.confidence, title: titleFromText(text, e.name), parseable: Boolean(text), warnings });
  }
  const grouped = new Map<string, number>();
  for (const e of zipEntries) grouped.set(e.detectedKind, (grouped.get(e.detectedKind) || 0) + 1);
  const summary = [...grouped.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${k.replaceAll('_', ' ')}`).join('; ');
  return { version: VERSION, detectedKind: 'zip_library', classificationConfidence: 1, language: 'unknown', title: humanTitle(name), summary: `${zipEntries.length} governed source file(s) inventoried${summary ? `: ${summary}` : ''}.`, targetModule: TARGET_MODULE.zip_library, fields: [], sections: [], steps: [], formFields: [], zipEntries, warnings: entries.length > 300 ? ['Only the first 300 ZIP entries are shown in the review preview.'] : [], parser: 'deterministic', analyzedAt: now(), humanReviewRequired: true };
}

export function deterministicUniversalImportAnalysis(input: { name: string; bytes: Buffer; declaredKind?: ImportLibraryKind }): UniversalImportAnalysis {
  if (ext(input.name) === '.zip') return analyzeZip(input.name, input.bytes);
  const text = textFromFile(input.name, input.bytes);
  const detected = classifyImport(input.name, text);
  const kind = detected.kind === 'other' && input.declaredKind && input.declaredKind !== 'other' ? input.declaredKind : detected.kind;
  const warnings: string[] = [];
  if (!text && ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext(input.name))) warnings.push('No machine-readable text was detected. Scanned/image content requires the governed AI parser when configured; deterministic analysis can classify the file name only.');
  let fields = commonFields(kind, text, input.name);
  let sections: UniversalImportAnalysis['sections'] = [];
  let steps: UniversalImportAnalysis['steps'] = [];
  let detectedFormFields: ImportedFormField[] = [];
  if (['policy', 'procedure', 'sop'].includes(kind)) {
    const parsed = policyProcedureFields(kind, text, input.name);
    fields = parsed.fields; sections = parsed.sections; steps = parsed.steps;
  }
  if (kind === 'form' || kind === 'template') detectedFormFields = formFields(text);
  if (kind === 'job_description') {
    for (const n of ['Responsibilities', 'Requirements', 'Qualifications', 'Preferred Qualifications', 'Skills', 'Education', 'Experience', 'Certifications', 'Reports To']) {
      const v = section(text, [n]);
      if (v) { sections.push({ name: n, text: v, confidence: 0.8 }); fields.push({ sourceLabel: n, targetModule: TARGET_MODULE[kind], targetField: n.toLowerCase().replace(/\s+/g, '_'), value: v, confidence: 0.8, evidence: v.slice(0, 350), requiresHumanConfirmation: true }); }
    }
  }
  if (kind === 'training_record') {
    const defs: Array<[string,string[]]> = [['employee',['Employee','Employee Name']],['course',['Course','Course Title','Training']],['provider',['Provider','Training Provider']],['completionDate',['Completion Date','Completed']],['expiryDate',['Expiry Date','Expires']],['certificateNumber',['Certificate','Certificate Number']]];
    for (const [targetField, labels] of defs) { const f = field(TARGET_MODULE[kind], targetField, labels[0]!, lineValue(text, labels)); if (f) fields.push(f); }
  }
  if (kind === 'employee_roster' && ['.csv','.xlsx'].includes(ext(input.name))) {
    try {
      const roster = employeeRosterFields(input.name, input.bytes);
      fields = roster.fields;
      if (roster.unmapped.length) warnings.push(`Unmapped employee columns require human mapping: ${roster.unmapped.slice(0,20).join(', ')}.`);
      if (!roster.fields.length) warnings.push('No recognized employee columns were detected. Use the governed Employee Import mapping workflow.');
    } catch (e) { warnings.push(e instanceof Error ? e.message : 'Employee roster column mapping failed.'); }
  }
  return {
    version: VERSION, detectedKind: kind, classificationConfidence: Math.max(detected.confidence, kind === input.declaredKind ? 0.65 : 0), language: 'unknown',
    title: String(fields.find(x => x.targetField === 'title')?.value || titleFromText(text, input.name)), summary: text ? text.slice(0, 700).replace(/\s+/g, ' ') : `Source ${input.name} staged for governed analysis.`,
    targetModule: TARGET_MODULE[kind], fields, sections, steps, formFields: detectedFormFields, zipEntries: [], warnings, parser: 'deterministic', analyzedAt: now(), humanReviewRequired: true,
  };
}

export function mergeUniversalAnalyses(base: UniversalImportAnalysis, ai: UniversalImportAnalysis): UniversalImportAnalysis {
  const key = (f: ImportFieldProposal) => `${f.targetModule}:${f.targetField}`;
  const fields = new Map(base.fields.map(f => [key(f), f]));
  for (const f of ai.fields) {
    const existing = fields.get(key(f));
    if (!existing || f.confidence > existing.confidence) fields.set(key(f), f);
  }
  const forms = new Map(base.formFields.map(f => [f.proposedKey, f]));
  for (const f of ai.formFields) if (!forms.has(f.proposedKey) || f.confidence > forms.get(f.proposedKey)!.confidence) forms.set(f.proposedKey, f);
  return { ...base, ...ai, fields: [...fields.values()], formFields: [...forms.values()], sections: ai.sections.length ? ai.sections : base.sections, steps: ai.steps.length ? ai.steps : base.steps, zipEntries: base.zipEntries.length ? base.zipEntries : ai.zipEntries, warnings: [...new Set([...base.warnings, ...ai.warnings])], parser: 'hybrid', humanReviewRequired: true };
}

export function extractUniversalText(name: string, bytes: Buffer) { return textFromFile(name, bytes); }
export const UNIVERSAL_IMPORT_VERSION = VERSION;
