export interface DocumentBrandProfile {
  companyName: string;
  legalName?: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  footer?: string;
}

export interface ProfessionalDocumentField {
  lineIndex: number;
  label: string;
  value: string;
  section?: string;
  multiline: boolean;
}

export interface ProfessionalDocumentBlock {
  kind: 'title' | 'section' | 'paragraph' | 'field' | 'blank';
  lineIndex: number;
  text?: string;
  field?: ProfessionalDocumentField;
}

export interface ParsedProfessionalDocument {
  title: string;
  blocks: ProfessionalDocumentBlock[];
  fields: ProfessionalDocumentField[];
  paragraphs: string[];
}

const DEFAULT_PRIMARY = '#1F3A5F';
const DEFAULT_ACCENT = '#1ABCBC';

export function normalizeHexColor(value: string | undefined, fallback: string): string {
  const candidate = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate.toUpperCase() : fallback;
}

export function defaultDocumentBrand(companyName = 'Organization'): DocumentBrandProfile {
  return {
    companyName: String(companyName || 'Organization').trim() || 'Organization',
    primaryColor: DEFAULT_PRIMARY,
    accentColor: DEFAULT_ACCENT,
  };
}

export function brandFromPlatformSettings(
  settings: Record<string, unknown> | null | undefined,
  fallbackCompanyName = 'Organization',
): DocumentBrandProfile {
  const base = defaultDocumentBrand(fallbackCompanyName);
  const text = (key: string) => String(settings?.[key] || '').trim();
  return {
    companyName: text('documentCompanyName') || base.companyName,
    legalName: text('documentLegalName') || undefined,
    logoUrl: safeLogoUrl(text('documentLogoUrl')) || undefined,
    primaryColor: normalizeHexColor(text('documentPrimaryColor'), base.primaryColor),
    accentColor: normalizeHexColor(text('documentAccentColor'), base.accentColor),
    address: text('documentAddress') || undefined,
    phone: text('documentPhone') || undefined,
    email: text('documentEmail') || undefined,
    website: text('documentWebsite') || undefined,
    footer: text('documentFooter') || undefined,
  };
}

export function safeLogoUrl(value: string | undefined): string {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('/')) return url;
  if (/^https:\/\//i.test(url)) return url;
  return '';
}

function looksLikeField(line: string): boolean {
  const colon = line.indexOf(':');
  if (colon <= 0) return false;
  const label = line.slice(0, colon).trim();
  if (!label || label.length > 120) return false;
  if (/^https?:\/\//i.test(line)) return false;
  return true;
}

function isLongLabel(label: string): boolean {
  return /(detail|description|notes?|questions?|responsibilit|project|risk|evidence|restriction|obligation|communication|follow-up|comments?|summary|reason|action|handoff|exception|improve|worked well)/i.test(label);
}

export function parseProfessionalDocument(content: string): ParsedProfessionalDocument {
  const lines = String(content || '').split(/\r?\n/);
  const blocks: ProfessionalDocumentBlock[] = [];
  const fields: ProfessionalDocumentField[] = [];
  const paragraphs: string[] = [];
  let title = '';
  let section = '';

  lines.forEach((raw, lineIndex) => {
    const line = raw.trim();

    if (!line) {
      blocks.push({ kind: 'blank', lineIndex });
      return;
    }

    if (line.startsWith('# ')) {
      const text = line.slice(2).trim();
      if (!title) title = text;
      blocks.push({ kind: 'title', lineIndex, text });
      return;
    }

    if (line.startsWith('## ')) {
      section = line.slice(3).trim();
      blocks.push({ kind: 'section', lineIndex, text: section });
      return;
    }

    if (looksLikeField(line)) {
      const colon = line.indexOf(':');
      const label = line.slice(0, colon).trim();
      const value = line.slice(colon + 1).trim();
      const field: ProfessionalDocumentField = {
        lineIndex,
        label,
        value,
        section: section || undefined,
        multiline: isLongLabel(label) || value.length > 90,
      };
      fields.push(field);
      blocks.push({ kind: 'field', lineIndex, field });
      return;
    }

    if (!title && blocks.length === 0) {
      title = line;
      blocks.push({ kind: 'title', lineIndex, text: line });
      return;
    }

    paragraphs.push(line);
    blocks.push({ kind: 'paragraph', lineIndex, text: line });
  });

  return {
    title: title || 'HR working document',
    blocks,
    fields,
    paragraphs,
  };
}

export function updateProfessionalDocumentField(
  content: string,
  lineIndex: number,
  value: string,
): string {
  const lines = String(content || '').split(/\r?\n/);
  const line = lines[lineIndex] || '';
  const colon = line.indexOf(':');
  if (colon <= 0) return content;
  lines[lineIndex] = `${line.slice(0, colon).trim()}: ${String(value || '').replace(/\r?\n/g, ' ').trim()}`;
  return lines.join('\n');
}

export function professionalDocumentMissingFields(content: string): ProfessionalDocumentField[] {
  return parseProfessionalDocument(content).fields.filter((field) => !field.value.trim());
}

export function professionalDocumentComplete(content: string): boolean {
  const parsed = parseProfessionalDocument(content);
  return parsed.fields.length >= 4 && parsed.fields.every((field) => field.value.trim().length >= 1);
}

const esc = (value: string) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function brandContactLine(brand: DocumentBrandProfile): string {
  return [brand.address, brand.phone, brand.email, brand.website].filter(Boolean).join(' · ');
}

export function buildBrandedDocumentHtml(input: {
  title: string;
  content: string;
  brand: DocumentBrandProfile;
  documentReference?: string;
  generatedAt?: string;
}): string {
  const parsed = parseProfessionalDocument(input.content);
  const brand = input.brand;
  const logo = safeLogoUrl(brand.logoUrl);
  const contact = brandContactLine(brand);
  const body = parsed.blocks.map((block) => {
    if (block.kind === 'title' || block.kind === 'blank') return '';
    if (block.kind === 'section') {
      return `<h2>${esc(block.text || '')}</h2>`;
    }
    if (block.kind === 'paragraph') {
      return `<p>${esc(block.text || '')}</p>`;
    }
    const field = block.field!;
    return `<div class="fieldRow">
      <div class="fieldLabel">${esc(field.label)}</div>
      <div class="fieldValue ${field.value ? '' : 'missing'}">${field.value ? esc(field.value) : 'To be completed by HR'}</div>
    </div>`;
  }).join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(input.title)}</title>
<style>
@page{margin:18mm 16mm 18mm 16mm}
*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:0;font-size:10.5pt;line-height:1.45}
.letterhead{display:flex;align-items:center;justify-content:space-between;border-bottom:4px solid ${esc(brand.primaryColor)};padding:0 0 12px;margin-bottom:22px}
.logo{max-height:58px;max-width:170px;object-fit:contain}
.company{font-size:18pt;font-weight:700;color:${esc(brand.primaryColor)}}
.legal,.contact,.meta,.footer{font-size:8.5pt;color:#64748b}
.accent{height:5px;background:${esc(brand.accentColor)};margin-top:5px}
h1{font-size:19pt;color:${esc(brand.primaryColor)};margin:0 0 6px}
h2{font-size:11pt;color:${esc(brand.primaryColor)};margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid #d8e0e8}
p{margin:7px 0 11px}
.documentMeta{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;margin:12px 0 18px}
.fieldRow{display:grid;grid-template-columns:38% 62%;border:1px solid #dbe3ea;border-bottom:0;min-height:34px;page-break-inside:avoid}
.fieldRow:last-of-type{border-bottom:1px solid #dbe3ea}
.fieldLabel{font-weight:700;background:#f8fafc;padding:8px 10px}
.fieldValue{padding:8px 10px;white-space:pre-wrap}
.fieldValue.missing{color:#9a3412;background:#fff7ed;font-style:italic}
.review{margin-top:22px;padding:10px 12px;border-left:4px solid ${esc(brand.accentColor)};background:#f8fafc;font-size:9pt}
.footer{margin-top:26px;padding-top:8px;border-top:1px solid #dbe3ea;display:flex;justify-content:space-between;gap:18px}
</style>
</head>
<body>
<div class="letterhead">
  <div>${logo ? `<img class="logo" src="${esc(logo)}" alt="">` : `<div class="company">${esc(brand.companyName)}</div>`}</div>
  <div style="text-align:right">
    ${logo ? `<div class="company" style="font-size:13pt">${esc(brand.companyName)}</div>` : ''}
    ${brand.legalName ? `<div class="legal">${esc(brand.legalName)}</div>` : ''}
    ${contact ? `<div class="contact">${esc(contact)}</div>` : ''}
  </div>
</div>
<div class="accent"></div>
<h1>${esc(input.title || parsed.title)}</h1>
<div class="documentMeta">
  <div><strong>Document status:</strong> Working record · human review required</div>
  <div><strong>Generated:</strong> ${esc(input.generatedAt || new Date().toISOString().slice(0, 10))}</div>
  ${input.documentReference ? `<div><strong>Reference:</strong> ${esc(input.documentReference)}</div>` : ''}
  <div><strong>System:</strong> OPSIQO governed document engine</div>
</div>
${body}
<div class="review"><strong>Review control:</strong> This document is prepared from available organizational records and HR-entered information. Verify accuracy, policy, contractual, privacy and legal requirements before approval, signature or external use.</div>
<div class="footer">
  <span>${esc(brand.footer || `${brand.companyName} · Confidential HR document`)}</span>
  <span>Generated through OPSIQO</span>
</div>
</body>
</html>`;
}

export function buildWordCompatibleDocument(input: {
  title: string;
  content: string;
  brand: DocumentBrandProfile;
  documentReference?: string;
}): string {
  const html = buildBrandedDocumentHtml(input);
  return html.replace(
    '<html>',
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
  );
}
