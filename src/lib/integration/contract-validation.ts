export interface ContractValidationIssue { path:string; code:string; message:string }
export interface ContractValidationResult { valid:boolean; issues:ContractValidationIssue[] }
function typeOf(v:unknown){if(v===null)return 'null';if(Array.isArray(v))return 'array';if(Number.isInteger(v))return 'integer';return typeof v==='number'?'number':typeof v}
function walk(schema:any,value:any,path:string,issues:ContractValidationIssue[],depth:number){
  if(depth>12){issues.push({path,code:'max_depth',message:'Contract validation depth exceeded.'});return}
  if(!schema||typeof schema!=='object')return;
  const t=schema.type;
  if(t){const actual=typeOf(value);const allowed=Array.isArray(t)?t:[t];if(!allowed.includes(actual)&&!(actual==='integer'&&allowed.includes('number'))){issues.push({path,code:'type',message:`Expected ${allowed.join('|')}; received ${actual}.`});return}}
  if(schema.enum&&Array.isArray(schema.enum)&&!schema.enum.some((x:any)=>JSON.stringify(x)===JSON.stringify(value)))issues.push({path,code:'enum',message:'Value is outside the allowed enumeration.'});
  if(typeof value==='string'){
    if(typeof schema.minLength==='number'&&value.length<schema.minLength)issues.push({path,code:'minLength',message:`Minimum length is ${schema.minLength}.`});
    if(typeof schema.maxLength==='number'&&value.length>schema.maxLength)issues.push({path,code:'maxLength',message:`Maximum length is ${schema.maxLength}.`});
    if(typeof schema.pattern==='string'){try{if(!new RegExp(schema.pattern).test(value))issues.push({path,code:'pattern',message:'String does not match the contract pattern.'})}catch{issues.push({path,code:'invalid_pattern',message:'Schema pattern is invalid.'})}}
  }
  if(value&&typeof value==='object'&&!Array.isArray(value)){
    const req=Array.isArray(schema.required)?schema.required:[];for(const k of req)if(!(k in value))issues.push({path:`${path}.${k}`,code:'required',message:'Required field is missing.'});
    const props=schema.properties&&typeof schema.properties==='object'?schema.properties:{};for(const[k,s]of Object.entries(props))if(k in value)walk(s,(value as any)[k],`${path}.${k}`,issues,depth+1);
    if(schema.additionalProperties===false)for(const k of Object.keys(value))if(!(k in props))issues.push({path:`${path}.${k}`,code:'additionalProperties',message:'Unexpected field is not allowed by this contract.'});
  }
  if(Array.isArray(value)&&schema.items)for(let i=0;i<Math.min(value.length,1000);i++)walk(schema.items,value[i],`${path}[${i}]`,issues,depth+1);
}
export function validateContractRecord(schema:Record<string,unknown>,value:unknown):ContractValidationResult{const issues:ContractValidationIssue[]=[];walk(schema,value,'$',issues,0);return{valid:issues.length===0,issues:issues.slice(0,100)}}
export function validateSchemaEnvelope(schema:Record<string,unknown>){const issues:string[]=[];if(schema['$schema']!=='https://json-schema.org/draft/2020-12/schema')issues.push('The contract must declare JSON Schema 2020-12 in $schema.');if(!schema.type)issues.push('The contract must declare a root type.');return{valid:issues.length===0,issues}}
