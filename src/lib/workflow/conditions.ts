import type { DomainEvent } from '@/domain/automation';
import type { WorkflowDefinition } from '@/domain/workflow';

function eventField(event:DomainEvent,field:string):unknown{
  if(field==='entityType')return event.entityType;
  if(field==='entityId')return event.entityId;
  if(!field.startsWith('payload.'))return undefined;
  const parts=field.slice('payload.'.length).split('.').filter(Boolean);
  let current:unknown=event.payload;
  for(const part of parts){
    if(!current||typeof current!=='object')return undefined;
    current=(current as Record<string,unknown>)[part];
  }
  return current;
}

function conditionMatches(actual:unknown,operator:string,expected:unknown):boolean{
  if(operator==='exists')return actual!==undefined&&actual!==null&&actual!=='';
  if(operator==='eq')return String(actual??'')===String(expected??'');
  if(operator==='neq')return String(actual??'')!==String(expected??'');
  if(operator==='contains'){
    if(Array.isArray(actual))return actual.map(String).includes(String(expected));
    return String(actual??'').toLowerCase().includes(String(expected??'').toLowerCase());
  }
  if(operator==='in'){
    const values=Array.isArray(expected)?expected:[expected];
    return values.map(String).includes(String(actual));
  }
  const a=Number(actual),b=Number(expected);
  if(!Number.isFinite(a)||!Number.isFinite(b))return false;
  if(operator==='gt')return a>b;
  if(operator==='gte')return a>=b;
  if(operator==='lt')return a<b;
  if(operator==='lte')return a<=b;
  return false;
}

export function workflowMatchesEvent(workflow:WorkflowDefinition,event:DomainEvent):boolean{
  const conditions=workflow.conditions||[];
  if(!conditions.length)return true;
  const matches=conditions.map(c=>conditionMatches(eventField(event,c.field),c.operator,c.value));
  return (workflow.conditionMode||'all')==='any'?matches.some(Boolean):matches.every(Boolean);
}
