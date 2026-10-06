const encoder = new TextEncoder();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, value, true); return b;
}
function u32(value: number) {
  const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, value >>> 0, true); return b;
}
function concat(parts: Uint8Array[]) {
  const total = parts.reduce((n,p)=>n+p.length,0), out = new Uint8Array(total);
  let offset=0; for(const p of parts){out.set(p,offset);offset+=p.length;} return out;
}
function zipEntry(name: string, data: Uint8Array, offset: number) {
  const nameBytes=encoder.encode(name), crc=crc32(data);
  const local=concat([
    u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(nameBytes.length),u16(0),nameBytes,data
  ]);
  const central=concat([
    u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),
    u16(nameBytes.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nameBytes
  ]);
  return {local,central};
}
function xml(v: unknown) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function para(text: string, bold=false) {
  return `<w:p><w:r>${bold?'<w:rPr><w:b/></w:rPr>':''}<w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
}

export function buildSimpleDocx(input:{title:string; lines:Array<{label?:string;value:string}>}):Uint8Array {
  const contentTypes=encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  const rels=encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  const body=[
    para(input.title,true),
    para('Generated through OPSIQO · Human review required'),
    ...input.lines.map(x=>para(x.label?`${x.label}: ${x.value}`:x.value)),
  ].join('');
  const doc=encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`);
  const entries=[
    ['[Content_Types].xml',contentTypes],
    ['_rels/.rels',rels],
    ['word/document.xml',doc],
  ] as const;
  const locals:Uint8Array[]=[], centrals:Uint8Array[]=[]; let offset=0;
  for(const [name,data] of entries){const e=zipEntry(name,data,offset);locals.push(e.local);centrals.push(e.central);offset+=e.local.length;}
  const central=concat(centrals), end=concat([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(central.length),u32(offset),u16(0)]);
  return concat([...locals,central,end]);
}
