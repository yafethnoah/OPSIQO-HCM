import { inflateSync } from 'node:zlib';

const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_STREAM_BYTES = 6 * 1024 * 1024;
const MAX_TEXT = 1_200_000;

function decodeLiteral(input: string) {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const c = input[i]!;
    if (c !== '\\') { out += c; continue; }
    const n = input[++i];
    if (n == null) break;
    if (n === 'n') out += '\n'; else if (n === 'r') out += '\r'; else if (n === 't') out += '\t';
    else if (n === 'b') out += '\b'; else if (n === 'f') out += '\f';
    else if (n === '(' || n === ')' || n === '\\') out += n;
    else if (/[0-7]/.test(n)) { let oct = n; for (let j = 0; j < 2 && /[0-7]/.test(input[i + 1] || ''); j++) oct += input[++i]!; out += String.fromCharCode(parseInt(oct, 8)); }
    else if (n === '\r' && input[i + 1] === '\n') i++;
    else if (n === '\n' || n === '\r') { /* continuation */ }
    else out += n;
  }
  return out;
}
function decodeHex(hex: string) {
  const clean = hex.replace(/\s+/g, ''); if (!clean || /[^0-9a-f]/i.test(clean)) return '';
  const b = Buffer.from(clean.length % 2 ? `${clean}0` : clean, 'hex');
  if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) { const chars:number[]=[]; for(let i=2;i+1<b.length;i+=2) chars.push((b[i]!<<8)|b[i+1]!); return String.fromCharCode(...chars); }
  return b.toString('latin1');
}
function extractTextOperators(content:string){
  const pieces:string[]=[]; let last=0;
  const token=/\((?:\\.|[^\\()])*\)\s*Tj|<([0-9A-Fa-f\s]+)>\s*Tj|\[((?:.|\r|\n)*?)\]\s*TJ|\((?:\\.|[^\\()])*\)\s*['"]|T\*|\b(?:Td|TD)\b/g;
  for(const m of content.matchAll(token)){ if((m.index??0)-last>4000)pieces.push('\n'); const whole=m[0]!;
    if(/T\*|\b(?:Td|TD)\b/.test(whole))pieces.push('\n');
    else if(whole.startsWith('[')){const inside=m[2]||'';for(const sm of inside.matchAll(/\((?:\\.|[^\\()])*\)|<([0-9A-Fa-f\s]+)>/g)){const raw=sm[0]!;pieces.push(raw.startsWith('(')?decodeLiteral(raw.slice(1,-1)):decodeHex(sm[1]||''));}pieces.push(' ');}
    else if(whole.startsWith('<'))pieces.push(decodeHex(m[1]||''));
    else{const lit=whole.match(/^\((.*)\)\s*(?:Tj|['"])/s)?.[1];if(lit!=null)pieces.push(decodeLiteral(lit));}
    last=m.index??last;
  }
  return pieces.join(' ');
}
function contentStreams(bytes:Buffer){const src=bytes.toString('latin1'),out:Buffer[]=[];const re=/stream\r?\n/g;let match:RegExpExecArray|null;while((match=re.exec(src))){const start=match.index+match[0].length,end=src.indexOf('endstream',start);if(end<0)break;if(end-start>MAX_STREAM_BYTES){re.lastIndex=end+9;continue;}const dictStart=Math.max(0,src.lastIndexOf('<<',match.index)),dict=src.slice(dictStart,match.index);let rawEnd=end;if(src[rawEnd-1]==='\n')rawEnd--;if(src[rawEnd-1]==='\r')rawEnd--;const raw=bytes.subarray(start,rawEnd);try{if(/\/Filter\s*(?:\/FlateDecode|\[\s*\/FlateDecode)/.test(dict))out.push(inflateSync(raw,{maxOutputLength:MAX_STREAM_BYTES} as any));else if(!/\/Filter\b/.test(dict))out.push(raw);}catch{}re.lastIndex=end+9;if(out.length>=500)break;}return out;}
export function extractPdfTextLayer(bytes:Buffer){if(bytes.length<=0||bytes.length>MAX_PDF_BYTES)throw new Error('PDF must be between 1 byte and 15 MB.');if(bytes.subarray(0,5).toString('latin1')!=='%PDF-')throw new Error('Invalid PDF signature.');const streams=contentStreams(bytes);let text=streams.map(b=>extractTextOperators(b.toString('latin1'))).join('\n');if(text.trim().length<40)text=extractTextOperators(bytes.toString('latin1'));return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').replace(/[ \t]{2,}/g,' ').replace(/\s*\n\s*/g,'\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,MAX_TEXT);}
