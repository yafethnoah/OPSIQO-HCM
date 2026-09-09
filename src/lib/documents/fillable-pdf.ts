import {
  defaultDocumentBrand,
  normalizeHexColor,
  parseProfessionalDocument,
  type DocumentBrandProfile,
} from './professional-document';

export interface FillablePdfField {
  name: string;
  label: string;
  value: string;
  multiline?: boolean;
  section?: string;
}

export interface FillablePdfInput {
  title: string;
  subtitle?: string;
  content: string;
  brand?: DocumentBrandProfile;
  documentReference?: string;
}

const ascii=(value:string)=>String(value||'').replace(/[^\x20-\x7E]/g,'?');
const pdfEscape=(value:string)=>ascii(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const safeName=(value:string,index:number)=>String(value||`field_${index+1}`).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60)||`field_${index+1}`;

function hexRgb(value:string):[number,number,number]{
  const hex=normalizeHexColor(value,'#1F3A5F').slice(1);
  return [
    parseInt(hex.slice(0,2),16)/255,
    parseInt(hex.slice(2,4),16)/255,
    parseInt(hex.slice(4,6),16)/255,
  ];
}

const n=(value:number)=>Number(value.toFixed(3));

export function fillableFieldsFromTemplate(content:string):FillablePdfField[]{
  const parsed=parseProfessionalDocument(content);
  const seen=new Set<string>();
  return parsed.fields.map((field,index)=>{
    let name=safeName(field.label,index),suffix=2;
    while(seen.has(name)){name=`${safeName(field.label,index)}_${suffix++}`;}
    seen.add(name);
    return{
      name,
      label:field.label,
      value:field.value,
      multiline:field.multiline,
      section:field.section,
    };
  });
}

function joinBytes(parts:Uint8Array[]):Uint8Array{
  const length=parts.reduce((sum,part)=>sum+part.length,0),out=new Uint8Array(length);
  let offset=0;
  for(const part of parts){out.set(part,offset);offset+=part.length;}
  return out;
}

const enc=new TextEncoder();
const bytes=(value:string)=>enc.encode(value);

type PagePlan={
  pageId:number;
  contentId:number;
  widgetIds:number[];
  fields:FillablePdfField[];
  pageNumber:number;
};

export function buildFillablePdf(input:FillablePdfInput):Uint8Array{
  const fields=fillableFieldsFromTemplate(input.content).slice(0,60);
  const brand=input.brand||defaultDocumentBrand();
  const primary=hexRgb(brand.primaryColor);
  const accent=hexRgb(brand.accentColor);
  const title=pdfEscape(input.title.slice(0,120));
  const subtitle=pdfEscape((input.subtitle||'Professional editable HR working document - human review required').slice(0,150));
  const company=pdfEscape((brand.companyName||'Organization').slice(0,100));
  const contact=pdfEscape([brand.address,brand.phone,brand.email,brand.website].filter(Boolean).join(' | ').slice(0,150));
  const reference=pdfEscape(String(input.documentReference||'').slice(0,100));
  const parsed=parseProfessionalDocument(input.content);
  const intro=pdfEscape((parsed.paragraphs[0]||'Complete all fields, using N/A where a field is not applicable.').slice(0,180));

  const perPage=10;
  const pageFields:Array<FillablePdfField[]>=fields.length
    ? Array.from({length:Math.ceil(fields.length/perPage)},(_,index)=>fields.slice(index*perPage,(index+1)*perPage))
    : [[]];

  let nextId=5;
  const pages:PagePlan[]=pageFields.map((page,index)=>{
    const pageId=nextId++;
    const contentId=nextId++;
    const widgetIds=page.map(()=>nextId++);
    return{pageId,contentId,widgetIds,fields:page,pageNumber:index+1};
  });
  const allWidgetIds=pages.flatMap(page=>page.widgetIds);
  const objects:string[]=[];
  objects[1]=`<< /Type /Catalog /Pages 2 0 R /AcroForm 4 0 R >>`;
  objects[2]=`<< /Type /Pages /Kids [${pages.map(page=>`${page.pageId} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3]=`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  objects[4]=`<< /Fields [${allWidgetIds.map(id=>`${id} 0 R`).join(' ')}] /NeedAppearances true /DR << /Font << /Helv 3 0 R >> >> /DA (/Helv 10 Tf 0 g) >>`;

  pages.forEach((page)=>{
    const annots=page.widgetIds.map(id=>`${id} 0 R`).join(' ');
    const firstY=590;
    const rowHeight=48;
    const stream:string[]=[
      `${n(primary[0])} ${n(primary[1])} ${n(primary[2])} rg`,
      '0 738 612 54 re f',
      'BT',
      '/F1 15 Tf',
      '1 1 1 rg',
      `48 762 Td (${company}) Tj`,
      'ET',
      `${n(accent[0])} ${n(accent[1])} ${n(accent[2])} rg`,
      '0 732 612 6 re f',
      '0 0 0 rg',
      'BT',
      '/F1 16 Tf',
      `48 704 Td (${title}) Tj`,
      '/F1 8 Tf',
      `0 -17 Td (${subtitle}) Tj`,
      contact?`0 -13 Td (${contact}) Tj`:'0 -13 Td () Tj',
      reference?`0 -13 Td (Reference: ${reference}) Tj`:'0 -13 Td () Tj',
      '/F1 8 Tf',
      `0 -17 Td (${intro}) Tj`,
      'ET',
    ];

    page.fields.forEach((field,index)=>{
      const y=firstY-index*rowHeight;
      stream.push(
        'BT',
        '/F1 8 Tf',
        `48 ${y+18} Td (${pdfEscape(field.label.slice(0,74))}) Tj`,
        'ET',
      );
    });

    stream.push(
      'BT',
      '/F1 7 Tf',
      `48 34 Td (${pdfEscape(brand.footer||`${brand.companyName} - Confidential HR document`)}) Tj`,
      `430 0 Td (Page ${page.pageNumber} of ${pages.length}) Tj`,
      'ET',
    );

    const contentStream=stream.join('\n');
    objects[page.pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /Helv 3 0 R >> >> /Annots [${annots}] /Contents ${page.contentId} 0 R >>`;
    objects[page.contentId]=`<< /Length ${bytes(contentStream).length} >>\nstream\n${contentStream}\nendstream`;

    page.fields.forEach((field,index)=>{
      const id=page.widgetIds[index]!;
      const y=firstY-index*rowHeight;
      const flags=field.multiline?4096:0;
      objects[id]=`<< /Type /Annot /Subtype /Widget /FT /Tx /T (${pdfEscape(field.name)}) /TU (${pdfEscape(field.label)}) /V (${pdfEscape(field.value)}) /Rect [230 ${y} 564 ${y+28}] /P ${page.pageId} 0 R /F 4 /Ff ${flags} /DA (/Helv 9 Tf 0 g) /MK << /BC [${n(primary[0])} ${n(primary[1])} ${n(primary[2])}] /BG [1 1 1] >> >>`;
    });
  });

  const chunks:Uint8Array[]=[bytes('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n')];
  const offsets:number[]=[0];
  let cursor=chunks[0]!.length;
  for(let id=1;id<nextId;id++){
    if(!objects[id])throw new Error(`Missing PDF object ${id}`);
    const chunk=bytes(`${id} 0 obj\n${objects[id]}\nendobj\n`);
    offsets[id]=cursor;
    chunks.push(chunk);
    cursor+=chunk.length;
  }

  const xrefOffset=cursor;
  const xref=[
    `xref\n0 ${nextId}\n`,
    '0000000000 65535 f \n',
    ...offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`),
    `trailer\n<< /Size ${nextId} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  ].join('');
  chunks.push(bytes(xref));
  return joinBytes(chunks);
}
