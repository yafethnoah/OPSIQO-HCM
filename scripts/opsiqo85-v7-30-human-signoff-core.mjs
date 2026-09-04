const forbiddenKey=/(password|passwd|token|secret|private[_-]?key|cookie|api[_-]?key|credential)/i;
const forbiddenValue=/(-----BEGIN [A-Z ]*PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{16,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bAIza[0-9A-Za-z_-]{20,}|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,})/;
const cleanString=v=>String(v??'').trim();
const validDate=v=>{const s=cleanString(v);if(!s)return false;const d=new Date(s);return Number.isFinite(d.getTime())&&/^\d{4}-\d{2}-\d{2}T/.test(s)};
function scanSecrets(value,path='root',issues=[]){
  if(Array.isArray(value)){value.forEach((v,i)=>scanSecrets(v,`${path}[${i}]`,issues));return issues}
  if(value&&typeof value==='object'){
    for(const [k,v] of Object.entries(value)){if(forbiddenKey.test(k))issues.push(`${path}.${k}: secret-like field names are not permitted`);scanSecrets(v,`${path}.${k}`,issues)}
    return issues;
  }
  if(typeof value==='string'&&forbiddenValue.test(value))issues.push(`${path}: secret-like value detected`);
  return issues;
}
function approval(section,{referenceField}={}){
  const issues=[];if(!section||typeof section!=='object')return{valid:false,approved:false,issues:['section missing']};
  const approved=section.approved===true;
  if(typeof section.approved!=='boolean')issues.push('approved must be boolean');
  if(approved){
    if(cleanString(section.reviewedBy).length<2)issues.push('reviewedBy required when approved');
    if(!validDate(section.reviewedAt))issues.push('reviewedAt must be an ISO timestamp when approved');
    if(!Array.isArray(section.evidenceRefs)||section.evidenceRefs.filter(x=>cleanString(x)).length===0)issues.push('at least one non-empty evidenceRefs entry is required when approved');
    if(referenceField&&!cleanString(section[referenceField]))issues.push(`${referenceField} required when approved`);
  }
  return{valid:issues.length===0,approved,issues};
}
export function validateHumanSignoff(data){
  const issues=[];if(!data||typeof data!=='object')return{valid:false,approvals:{},issues:['sign-off document must be a JSON object']};
  if(String(data.version||'')!=='7.30')issues.push('version must equal 7.30');
  issues.push(...scanSecrets(data));
  const spec={manualAccessibility:{},connectorUat:{},releaseChangeApproval:{referenceField:'changeReference'},productionDeployment:{referenceField:'releaseReference'}};
  const approvals={};
  for(const [name,options] of Object.entries(spec)){const r=approval(data[name],options);approvals[name]=r;if(!r.valid)issues.push(...r.issues.map(x=>`${name}: ${x}`))}
  return{valid:issues.length===0,approvals,issues};
}
export function validApproved(result,name){return Boolean(result?.valid&&result?.approvals?.[name]?.valid&&result.approvals[name].approved)}
