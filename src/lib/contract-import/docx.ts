import { inflateRawSync } from 'node:zlib';
function u16(b:Buffer,o:number){return b.readUInt16LE(o)}
function u32(b:Buffer,o:number){return b.readUInt32LE(o)}
function decodeXml(s:string){return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&')}
function xmlToText(xml:string){return decodeXml(xml.replace(/<w:tab\b[^>]*\/>/g,'\t').replace(/<w:(?:br|cr)\b[^>]*\/>/g,'\n').replace(/<\/w:(?:p|tr)>/g,'\n').replace(/<\/w:tc>/g,'\t').replace(/<[^>]+>/g,'')).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
const MAX_XML_UNCOMPRESSED=8*1024*1024;
const MAX_DOCX_TEXT=3*1024*1024;
function entries(buf:Buffer){
 let eocd=-1;for(let i=Math.max(0,buf.length-65557);i<=buf.length-22;i++){if(u32(buf,i)===0x06054b50)eocd=i}
 if(eocd<0)throw new Error('Invalid DOCX ZIP container.');
 const total=u16(buf,eocd+10),central=u32(buf,eocd+16),out:Array<{name:string;method:number;size:number;uncompressed:number;local:number}>=[];let o=central;
 for(let i=0;i<total;i++){if(u32(buf,o)!==0x02014b50)throw new Error('Invalid DOCX central directory.');const method=u16(buf,o+10),size=u32(buf,o+20),uncompressed=u32(buf,o+24),nameLen=u16(buf,o+28),extraLen=u16(buf,o+30),commentLen=u16(buf,o+32),local=u32(buf,o+42),name=buf.subarray(o+46,o+46+nameLen).toString('utf8');out.push({name,method,size,uncompressed,local});o+=46+nameLen+extraLen+commentLen}return out;
}
function readEntry(buf:Buffer,e:{method:number;size:number;uncompressed:number;local:number}){const o=e.local;if(e.uncompressed>MAX_XML_UNCOMPRESSED)throw new Error('DOCX XML part exceeds the safe extraction limit.');if(u32(buf,o)!==0x04034b50)throw new Error('Invalid DOCX local entry.');const nameLen=u16(buf,o+26),extraLen=u16(buf,o+28),start=o+30+nameLen+extraLen,data=buf.subarray(start,start+e.size);if(e.method===0)return data;if(e.method===8)return inflateRawSync(data,{maxOutputLength:MAX_XML_UNCOMPRESSED} as any);throw new Error(`Unsupported DOCX compression method ${e.method}.`)}
export function extractDocxText(buf:Buffer){
 const wanted=/^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/;const pieces:string[]=[];for(const e of entries(buf)){if(wanted.test(e.name))pieces.push(xmlToText(readEntry(buf,e).toString('utf8')))}
 const text=pieces.filter(Boolean).join('\n\n').trim();if(Buffer.byteLength(text,'utf8')>MAX_DOCX_TEXT)throw new Error('Extracted DOCX text exceeds the safe contract limit.');if(text.length<20)throw new Error('No readable text was found in the DOCX contract.');return text;
}
export function extractRtfText(buf:Buffer){return buf.toString('utf8').replace(/\\par[d]?/g,'\n').replace(/\\'[0-9a-fA-F]{2}/g,m=>String.fromCharCode(parseInt(m.slice(2),16))).replace(/\\[a-zA-Z]+-?\d* ?/g,'').replace(/[{}]/g,'').replace(/\n{3,}/g,'\n\n').trim()}
