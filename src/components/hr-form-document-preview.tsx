'use client';
import type { CSSProperties } from 'react';

type Field={id:string;kind:string;label:string;helpText?:string;required?:boolean;defaultValue?:unknown;scoring?:{anchors?:Record<string,string>;weight?:number};children?:Field[]};
type Template={formCode:string;title:string;description?:string;version:string;status:string;sensitivity:string;category:string;fields:Field[]};

const paper:CSSProperties={background:'#fff',color:'#111827',border:'1px solid #dbe3ea',boxShadow:'0 10px 32px rgba(15,23,42,.10)',borderRadius:8,maxWidth:900,margin:'0 auto',padding:'42px 48px',minHeight:900};
const line:CSSProperties={borderBottom:'1px solid #9ca3af',minHeight:28,marginTop:7};
const label:CSSProperties={fontSize:13,fontWeight:700,marginBottom:4};
const helper:CSSProperties={fontSize:12,color:'#64748b',marginTop:4};

export function HrFormDocumentPreview({template,organization='Organization'}:{template:Template;organization?:string}){
  return <article style={paper}>
    <header style={{borderBottom:'3px solid #1ABCBC',paddingBottom:18,marginBottom:26}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'flex-start'}}>
        <div><div style={{fontWeight:800,letterSpacing:1,color:'#1F3A5F'}}>{organization.toUpperCase()}</div><h1 style={{fontSize:26,margin:'8px 0 4px'}}>{template.title}</h1><div style={{fontSize:13,color:'#64748b'}}>{template.description}</div></div>
        <div style={{fontSize:12,textAlign:'right',lineHeight:1.7}}><div><strong>Form:</strong> {template.formCode}</div><div><strong>Version:</strong> {template.version}</div><div><strong>Status:</strong> {template.status}</div><div><strong>Class:</strong> {template.sensitivity}</div></div>
      </div>
    </header>
    <div>{template.fields.map(f=><RenderField key={f.id} field={f}/>)}</div>
    <footer style={{borderTop:'1px solid #cbd5e1',marginTop:34,paddingTop:12,fontSize:11,color:'#64748b',display:'flex',justifyContent:'space-between'}}><span>Generated and governed through OPSIQO</span><span>Human review required</span></footer>
  </article>;
}
function RenderField({field}:{field:Field}){
  if(field.kind==='section')return <section style={{margin:'26px 0'}}><h2 style={{fontSize:16,background:'#f1f5f9',borderLeft:'4px solid #1ABCBC',padding:'9px 12px',marginBottom:14}}>{field.label}</h2>{field.helpText?<p style={helper}>{field.helpText}</p>:null}<div>{field.children?.map(c=><RenderField key={c.id} field={c}/>)}</div></section>;
  if(field.kind==='instruction')return <div style={{margin:'14px 0'}}><div style={{fontWeight:700}}>{field.label}</div>{field.helpText?<div style={helper}>{field.helpText}</div>:null}</div>;
  if(['acknowledgement','checkbox','yes_no'].includes(field.kind))return <div style={{display:'flex',gap:9,margin:'10px 0',alignItems:'flex-start'}}><span style={{fontSize:20,lineHeight:1}}>☐</span><div><div>{field.label}{field.required?' *':''}</div>{field.helpText?<div style={helper}>{field.helpText}</div>:null}</div></div>;
  if(field.kind==='scale_1_5')return <div style={{margin:'14px 0'}}><div style={label}>{field.label}{field.required?' *':''} {field.scoring?.weight?`(${field.scoring.weight}%)`:''}</div><div style={{display:'flex',gap:18,fontSize:14}}>☐ 1　☐ 2　☐ 3　☐ 4　☐ 5</div>{field.scoring?.anchors?<div style={helper}>{Object.entries(field.scoring.anchors).map(([k,v])=>`${k}: ${v}`).join('　|　')}</div>:null}</div>;
  if(['repeating_rows','table'].includes(field.kind))return <div style={{margin:'16px 0'}}><div style={label}>{field.label}</div>{field.helpText?<div style={helper}>{field.helpText}</div>:null}<table style={{width:'100%',borderCollapse:'collapse',marginTop:8}}><tbody>{[0,1,2,3].map(i=><tr key={i}><td style={{border:'1px solid #cbd5e1',height:32,width:'25%'}}></td><td style={{border:'1px solid #cbd5e1'}}></td><td style={{border:'1px solid #cbd5e1'}}></td></tr>)}</tbody></table></div>;
  if(['signature','initials'].includes(field.kind))return <div style={{display:'grid',gridTemplateColumns:'1fr 180px',gap:24,margin:'18px 0'}}><div><div style={label}>{field.label}</div><div style={line}></div></div><div><div style={label}>Date</div><div style={line}></div></div></div>;
  if(field.kind==='textarea')return <div style={{margin:'14px 0'}}><div style={label}>{field.label}{field.required?' *':''}</div>{field.helpText?<div style={helper}>{field.helpText}</div>:null}<div style={{...line,minHeight:56}}></div><div style={line}></div></div>;
  return <div style={{margin:'12px 0'}}><div style={label}>{field.label}{field.required?' *':''}</div><div style={line}>{field.defaultValue!=null?<span style={{fontSize:13,color:'#334155'}}>{String(field.defaultValue)}</span>:null}</div>{field.helpText?<div style={helper}>{field.helpText}</div>:null}</div>;
}
