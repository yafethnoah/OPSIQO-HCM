export interface FillablePdfField {
  name: string;
  label: string;
  value: string;
  multiline?: boolean;
}

export interface FillablePdfInput {
  title: string;
  subtitle?: string;
  content: string;
}

const ascii=(value:string)=>String(value||'').replace(/[^\x20-\x7E]/g,'?');
const pdfEscape=(value:string)=>ascii(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const safeName=(value:string,index:number)=>String(value||`field_${index+1}`).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60)||`field_${index+1}`;

export function fillableFieldsFromTemplate(content:string):FillablePdfField[]{
  const seen=new Set<string>();
  return String(content||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).flatMap((line,index)=>{
    const colon=line.indexOf(':');
    if(colon<=0)return[];
    const label=line.slice(0,colon).trim();
    const value=line.slice(colon+1).trim();
    if(!label||label.length>100)return[];
    let name=safeName(label,index),suffix=2;
    while(seen.has(name)){name=`${safeName(label,index)}_${suffix++}`;}
    seen.add(name);
    return[{name,label,value,multiline:value.length>100}];
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

export function buildFillablePdf(input:FillablePdfInput):Uint8Array{
  const fields=fillableFieldsFromTemplate(input.content).slice(0,18);
  const title=pdfEscape(input.title.slice(0,120));
  const subtitle=pdfEscape((input.subtitle||'OPSIQO governed working form · human review required').slice(0,150));
  const pageHeight=792;
  const firstY=690;
  const rowHeight=34;
  const widgetStart=7;
  const widgetIds=fields.map((_,i)=>widgetStart+i);
  const annots=widgetIds.map(id=>`${id} 0 R`).join(' ');
  const fieldRefs=annots;

  const streamLines=[
    'BT',
    '/F1 16 Tf',
    `50 752 Td (${title}) Tj`,
    '/F1 9 Tf',
    `0 -18 Td (${subtitle}) Tj`,
    'ET',
  ];
  fields.forEach((field,index)=>{
    const y=firstY-index*rowHeight;
    streamLines.push('BT','/F1 9 Tf',`50 ${y+13} Td (${pdfEscape(field.label.slice(0,72))}) Tj`,'ET');
  });
  const contentStream=streamLines.join('\n');
  const objects:string[]=[];
  objects[1]=`<< /Type /Catalog /Pages 2 0 R /AcroForm 5 0 R >>`;
  objects[2]=`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`;
  objects[3]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 4 0 R /Helv 4 0 R >> >> /Annots [${annots}] /Contents 6 0 R >>`;
  objects[4]=`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  objects[5]=`<< /Fields [${fieldRefs}] /NeedAppearances true /DR << /Font << /Helv 4 0 R >> >> /DA (/Helv 10 Tf 0 g) >>`;
  objects[6]=`<< /Length ${bytes(contentStream).length} >>\nstream\n${contentStream}\nendstream`;
  fields.forEach((field,index)=>{
    const id=widgetIds[index]!;
    const y=firstY-index*rowHeight;
    const flags=field.multiline?4096:0;
    objects[id]=`<< /Type /Annot /Subtype /Widget /FT /Tx /T (${pdfEscape(field.name)}) /TU (${pdfEscape(field.label)}) /V (${pdfEscape(field.value)}) /Rect [220 ${y} 560 ${y+24}] /P 3 0 R /F 4 /Ff ${flags} /DA (/Helv 10 Tf 0 g) /MK << /BC [0.65 0.65 0.65] /BG [1 1 1] >> >>`;
  });

  const chunks:Uint8Array[]=[bytes('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n')];
  const offsets:number[]=[0];
  let cursor=chunks[0]!.length;
  for(let id=1;id<objects.length;id++){
    const chunk=bytes(`${id} 0 obj\n${objects[id]}\nendobj\n`);
    offsets[id]=cursor;chunks.push(chunk);cursor+=chunk.length;
  }
  const xrefOffset=cursor;
  const xref=[
    `xref\n0 ${objects.length}\n`,
    '0000000000 65535 f \n',
    ...offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`),
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  ].join('');
  chunks.push(bytes(xref));
  return joinBytes(chunks);
}
