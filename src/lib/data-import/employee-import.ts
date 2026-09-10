import { createHash, randomUUID } from 'node:crypto';
import type { ActorContext } from '@/domain/security';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { createEmployee, listOrgUnits, listPositions } from '@/lib/hr/service';
import { parseTabularFile, MAX_IMPORT_ROWS } from './tabular';
import { extractPdfDocument } from './pdf-engine';
import { parseEmployeeRosterText } from './employee-roster-text';
import { governedEmployeeRosterRows } from './universal-provider';

const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const now=()=>new Date().toISOString();
const norm=(s:string)=>s.trim().toLowerCase().replace(/[^a-z0-9@.+-]+/g,'');
const headerNorm=(s:string)=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'');

const ORG_UNIT_FAMILIES:Record<string,string[]>={
  executive:['executivemanagement','executiveleadership','leadership','executiveoffice'],
  people:['humanresources','hr','peopleculture','peopleandculture','peopleoperations','peopleteam'],
  commercial:['sales','salesclientoperations','salesandclientoperations','commercial','clientoperations','businessdevelopment'],
  marketing:['marketing','marketingcommunications','communicationsmarketing'],
  technology:['it','informationtechnology','technology','digitaltechnology','technologyoperations'],
};

function orgUnitFamily(value:string){
  const key=headerNorm(value);
  if(!key)return'';
  for(const[family,aliases]of Object.entries(ORG_UNIT_FAMILIES))if(aliases.includes(key))return family;
  return'';
}

const aliases:Record<string,string[]>={
  legalFirstName:['firstname','legalfirstname','first','givenname'],
  legalLastName:['lastname','legallastname','last','surname','familyname'],
  fullName:['name','employeename','fullname','workername','staffname'],
  workEmail:['workemail','email','companyemail','businessemail'],
  phone:['phone','mobile','telephone','phonenumber'],
  employeeNumber:['employeenumber','employeeid','staffid','staffnumber','personnelid','workernumber','employeecode','emp'],
  employmentType:['employmenttype','type','workertype','contracttype'],
  hireDate:['hiredate','startdate','employmentstartdate','dateofhire'],
  orgUnit:['orgunit','department','team','organizationunit','businessunit','division'],
  position:['position','jobtitle','title','role','positiontitle'],
  manager:['manager','manageremail','managerid','managernumber','supervisor','reportsto','line manager'],
};

function value(row:Record<string,string>,key:string){
  const map=Object.fromEntries(Object.entries(row).map(([k,v])=>[headerNorm(k),v]));
  for(const a of aliases[key]||[])if(map[headerNorm(a)]!==undefined)return map[headerNorm(a)]||'';
  return'';
}

function normalizeEmploymentType(v:string){
  const x=v.trim().toLowerCase();
  return ['permanent','temporary','contractor','intern','volunteer'].includes(x)?x:'permanent';
}

function normalizeDate(v:string){
  const x=v.trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(x))return x;
  const d=new Date(x);
  return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';
}

function addLookup(map:Map<string,string[]>,key:string,id:string){
  const k=norm(key);
  if(!k)return;
  map.set(k,[...(map.get(k)||[]),id]);
}

function splitName(v:string){
  const parts=v.trim().replace(/\s+/g,' ').split(' ').filter(Boolean);
  return{first:parts[0]||'',last:parts.slice(1).join(' ')};
}

function canonicalAiRows(rows:Array<Record<string,unknown>>){
  const headers=['legalFirstName','legalLastName','fullName','workEmail','phone','employeeNumber','employmentType','hireDate','orgUnit','position','manager'];
  return{headers,rows:rows.map(r=>Object.fromEntries(headers.map(h=>[h,String(r[h]??'')])))};
}

async function parseEmployeeSource(actor:ActorContext,file:File,bytes:Buffer){
  const lower=file.name.toLowerCase();
  if(lower.endsWith('.csv')||lower.endsWith('.xlsx')){
    return{
      ...parseTabularFile(file.name,bytes),
      parser:lower.endsWith('.csv')?'csv':'xlsx',
      warnings:[] as string[],
      sourceType:lower.endsWith('.csv')?'CSV':'XLSX',
    };
  }
  if(lower.endsWith('.pdf')||file.type==='application/pdf'){
    let text='';
    const warnings:string[]=[];
    let reliableText=false;

    try{
      const pdf=await extractPdfDocument(bytes);
      text=pdf.text;
      reliableText=pdf.hasUsableText;
      warnings.push(...pdf.warnings);
    }catch(e){
      warnings.push(e instanceof Error?e.message:'PDF.js extraction failed.');
    }

    /*
     * Deterministic extraction is useful evidence, but PDF AI analysis is
     * allowed to inspect the ORIGINAL PDF even when text was recovered.
     */
    const deterministic=parseEmployeeRosterText(reliableText?text:'');
    warnings.push(...deterministic.warnings);

    try{
      const ai=await governedEmployeeRosterRows(actor,{
        name:file.name,
        mimeType:'application/pdf',
        bytes,
        text:text||undefined,
      });

      if(ai?.rows.length){
        const parsed=canonicalAiRows(
          ai.rows as Array<Record<string,unknown>>
        );

        return{
          ...parsed,
          parser:`governed_ai_${ai.provider}`,
          warnings:[...new Set([...warnings,...ai.warnings])],
          sourceType:'PDF',
        };
      }
    }catch(e){
      warnings.push(
        e instanceof Error
          ? e.message
          : 'Governed AI PDF roster parsing failed.'
      );
    }

    if(deterministic.rows.length){
      return{
        headers:deterministic.headers,
        rows:deterministic.rows,
        parser:deterministic.parser,
        warnings,
        sourceType:'PDF',
      };
    }

    throw new ApiError(
      400,
      `The PDF could not be mapped to employee rows. ${
        warnings.filter(Boolean).join(' ') ||
        'Use a readable PDF, CSV or XLSX, or activate the approved AI document parser.'
      }`,
      'pdf_roster_unmapped'
    );
  }
  throw new ApiError(400,'Employee import supports CSV, XLSX and PDF files.','unsupported_employee_import_type');
}

type PreviewDraftRow={
  rowNumber:number;
  legalFirstName:string;
  legalLastName:string;
  workEmail:string;
  phone?:string;
  employeeNumber:string;
  employmentType:string;
  hireDate:string;
  orgUnitSource?:string;
  positionSource?:string;
  orgUnitId?:string;
  positionId?:string;
  managerReference?:string;
  managerWorkerId?:string;
  managerRowNumber?:number;
  reviewedFields?:string[];
  errors?:string[];
  warnings?:string[];
};

type EmployeeImportCorrection={
  legalFirstName?:unknown;
  legalLastName?:unknown;
  workEmail?:unknown;
  phone?:unknown;
  employeeNumber?:unknown;
  employmentType?:unknown;
  hireDate?:unknown;
  orgUnitId?:unknown;
  positionId?:unknown;
  managerWorkerId?:unknown;
};

type ValidationContext={
  units:any[];
  positions:any[];
  unitById:Map<string,any>;
  unitMap:Map<string,any>;
  unitsByFamily:Map<string,any[]>;
  positionById:Map<string,any>;
  posByKey:Map<string,any[]>;
  existingNums:Set<string>;
  existingEmails:Set<string>;
  managerLookup:Map<string,string[]>;
  workersById:Map<string,any>;
  managerChoices:Array<{id:string;displayName:string;employeeNumber:string;workEmail:string}>;
};

async function loadValidationContext(actor:ActorContext):Promise<ValidationContext>{
  const[units,positions,workersSnap]=await Promise.all([
    listOrgUnits(actor),
    listPositions(actor),
    adminDb().collection(`organizations/${actor.orgId}/workers`).limit(5000).get(),
  ]);

  const unitById=new Map<string,any>();
  const unitMap=new Map<string,any>();
  const unitsByFamily=new Map<string,any[]>();
  for(const u of units as any[]){
    unitById.set(String(u.id),u);
    for(const key of [headerNorm(String(u.name||'')),headerNorm(String(u.code||''))])if(key)unitMap.set(key,u);
    const family=orgUnitFamily(String(u.name||u.code||''));
    if(family)unitsByFamily.set(family,[...(unitsByFamily.get(family)||[]),u]);
  }

  const positionById=new Map<string,any>();
  const posByKey=new Map<string,any[]>();
  for(const p of positions as any[]){
    positionById.set(String(p.id),p);
    for(const key of [headerNorm(String(p.title||'')),headerNorm(String(p.positionCode||''))]){
      if(!key)continue;
      posByKey.set(key,[...(posByKey.get(key)||[]),p]);
    }
  }

  const existingNums=new Set<string>();
  const existingEmails=new Set<string>();
  const managerLookup=new Map<string,string[]>();
  const workersById=new Map<string,any>();
  const managerChoices:Array<{id:string;displayName:string;employeeNumber:string;workEmail:string}>=[];

  for(const d of workersSnap.docs){
    const x=d.data();
    const id=d.id;
    const number=String(x.employeeNumber||'');
    const email=String(x.workEmail||'');
    const name=String(x.displayName||[x.legalFirstName,x.legalLastName].filter(Boolean).join(' '));
    workersById.set(id,{id,...x,displayName:name});
    if(number){existingNums.add(headerNorm(number));addLookup(managerLookup,number,id)}
    if(email){existingEmails.add(email.trim().toLowerCase());addLookup(managerLookup,email,id)}
    if(name)addLookup(managerLookup,name,id);
    if(String(x.status||'active').toLowerCase()!=='terminated')managerChoices.push({id,displayName:name||number||email||id,employeeNumber:number,workEmail:email});
  }

  managerChoices.sort((a,b)=>a.displayName.localeCompare(b.displayName));
  return{units:units as any[],positions:positions as any[],unitById,unitMap,unitsByFamily,positionById,posByKey,existingNums,existingEmails,managerLookup,workersById,managerChoices};
}

function positionAvailable(p:any){
  return Number(p?.availableHeadcount||0)>0&&!['full','closed','frozen'].includes(String(p?.capacityState||'').toLowerCase());
}

function resolveInitialAssignment(row:PreviewDraftRow,ctx:ValidationContext){
  const unitName=String(row.orgUnitSource||'').trim();
  const positionName=String(row.positionSource||'').trim();
  if(!unitName||!positionName)return;

  let unit=ctx.unitMap.get(headerNorm(unitName)) as any;
  if(!unit){
    const family=orgUnitFamily(unitName);
    const aliasMatches=family?(ctx.unitsByFamily.get(family)||[]):[];
    if(aliasMatches.length===1){
      unit=aliasMatches[0];
      row.warnings=[
        ...(row.warnings||[]),
        `Organization unit "${unitName}" mapped to "${String(unit.name||unit.code||unit.id)}" by governed alias.`,
      ];
    }else if(aliasMatches.length>1){
      row.errors=[
        ...(row.errors||[]),
        `Organization unit match is ambiguous: ${unitName}`,
      ];
      return;
    }
  }
  if(!unit)return;

  row.orgUnitId=String(unit.id);
  const matches=(ctx.posByKey.get(headerNorm(positionName))||[]).filter(
    p=>String(p.orgUnitId)===String(unit.id)&&positionAvailable(p),
  );
  if(matches.length===1){
    row.positionId=String(matches[0].id);
  }else if(matches.length>1){
    row.errors=[
      ...(row.errors||[]),
      'Position match is ambiguous.',
    ];
  }
}

function parsedDraftRows(parsedRows:Array<Record<string,string>>,ctx:ValidationContext):PreviewDraftRow[]{
  return parsedRows.map((row,i)=>{
    const full=value(row,'fullName').trim();
    const split=splitName(full);
    const draft:PreviewDraftRow={
      rowNumber:i+2,
      legalFirstName:value(row,'legalFirstName').trim()||split.first,
      legalLastName:value(row,'legalLastName').trim()||split.last,
      workEmail:value(row,'workEmail').trim().toLowerCase(),
      phone:value(row,'phone').trim()||undefined,
      employeeNumber:value(row,'employeeNumber').trim(),
      employmentType:normalizeEmploymentType(value(row,'employmentType')),
      hireDate:normalizeDate(value(row,'hireDate')),
      orgUnitSource:value(row,'orgUnit').trim()||undefined,
      positionSource:value(row,'position').trim()||undefined,
      managerReference:value(row,'manager').trim()||undefined,
      reviewedFields:[],
    };
    resolveInitialAssignment(draft,ctx);
    return draft;
  });
}

function readyPayload(r:PreviewDraftRow){
  return{
    rowNumber:r.rowNumber,
    legalFirstName:r.legalFirstName,
    legalLastName:r.legalLastName,
    workEmail:r.workEmail,
    ...(r.phone?{phone:r.phone}:{}),
    ...(r.employeeNumber?{employeeNumber:r.employeeNumber}:{}),
    employmentType:r.employmentType,
    hireDate:r.hireDate,
    ...(r.orgUnitId?{orgUnitId:r.orgUnitId}:{}),
    ...(r.positionId?{positionId:r.positionId}:{}),
    ...(r.managerWorkerId?{managerWorkerId:r.managerWorkerId}:{}),
    ...(r.managerRowNumber?{managerRowNumber:r.managerRowNumber}:{}),
  };
}

function retainedReviewErrors(d:PreviewDraftRow){
  const reviewed=new Set(d.reviewedFields||[]);
  return(d.errors||[]).filter(message=>
    (
      !reviewed.has('orgUnitId')&&
      !d.orgUnitId&&
      message.startsWith('Organization unit match is ambiguous:')
    )||
    (
      !reviewed.has('positionId')&&
      !d.positionId&&
      message==='Position match is ambiguous.'
    )
  );
}

function retainedReviewWarnings(d:PreviewDraftRow){
  const reviewed=new Set(d.reviewedFields||[]);
  return(d.warnings||[]).filter(message=>
    !reviewed.has('orgUnitId')&&
    message.includes(' mapped to ')&&
    message.endsWith(' by governed alias.')
  );
}

function validateRows(drafts:PreviewDraftRow[],ctx:ValidationContext){
  // Validation must be idempotent. Never carry ordinary validation
  // findings forward from the prior preview; recompute them from the
  // corrected row. Preserve only unresolved governed reconciliation
  // evidence that cannot be reconstructed from authoritative IDs.
  const rows:PreviewDraftRow[]=drafts.map(d=>({
    ...d,
    errors:retainedReviewErrors(d),
    warnings:retainedReviewWarnings(d),
  }));
  const seenNums=new Set<string>();
  const seenEmails=new Set<string>();

  for(const r of rows){
    if(!r.legalFirstName)r.errors!.push('First name is required.');
    if(!r.legalLastName)r.errors!.push('Last name is required.');
    if(r.workEmail&&!/^\S+@\S+\.\S+$/.test(r.workEmail))r.errors!.push('Work email is invalid.');
    if(!r.workEmail)r.warnings!.push('Work email is optional.');
    if(!r.employeeNumber)r.warnings!.push('Employee number will be assigned automatically.');
    if(!r.hireDate)r.errors!.push('A valid hire date is required.');

    const nn=headerNorm(r.employeeNumber||'');
    if(nn&&(ctx.existingNums.has(nn)||seenNums.has(nn)))r.errors!.push('Duplicate employee number.');
    if(r.workEmail&&(ctx.existingEmails.has(r.workEmail)||seenEmails.has(r.workEmail)))r.errors!.push('Duplicate work email.');
    if(nn)seenNums.add(nn);
    if(r.workEmail)seenEmails.add(r.workEmail);

    const hasSourceUnit=Boolean(String(r.orgUnitSource||'').trim());
    const hasSourcePosition=Boolean(String(r.positionSource||'').trim());
    const hasUnit=Boolean(r.orgUnitId);
    const hasPosition=Boolean(r.positionId);

    if(hasSourceUnit!==hasSourcePosition&&!hasUnit&&!hasPosition){
      r.errors!.push('Organization unit and position must both be supplied or both left blank.');
    }

    if(hasUnit!==hasPosition){
      r.errors!.push('Select both an organization unit and an available position.');
    }else if(hasUnit&&hasPosition){
      const unit=ctx.unitById.get(String(r.orgUnitId));
      const position=ctx.positionById.get(String(r.positionId));
      if(!unit)r.errors!.push('Selected organization unit no longer exists.');
      if(!position)r.errors!.push('Selected position no longer exists.');
      if(unit&&position&&String(position.orgUnitId)!==String(unit.id))r.errors!.push('Selected position does not belong to the selected organization unit.');
      if(position&&!positionAvailable(position))r.errors!.push('Selected position has no available capacity.');
    }else if(hasSourceUnit&&hasSourcePosition){
      const hasOrgUnitResolutionError=r.errors!.some(message=>message.startsWith('Organization unit match is ambiguous:'));
      const hasPositionResolutionError=r.errors!.includes('Position match is ambiguous.');
      if(!r.orgUnitId&&!hasOrgUnitResolutionError){
        r.errors!.push(`Organization unit not found: ${r.orgUnitSource}`);
      }else if(r.orgUnitId&&!r.positionId&&!hasPositionResolutionError){
        r.errors!.push(`No available position found in ${r.orgUnitSource}: ${r.positionSource}`);
      }
    }

    if(r.managerWorkerId&&!ctx.workersById.has(String(r.managerWorkerId))){
      r.errors!.push('Selected manager no longer exists.');
      r.managerWorkerId=undefined;
    }
  }

  const batchManagerLookup=new Map<string,number[]>();
  for(const r of rows){
    for(const key of [r.employeeNumber,r.workEmail,`${r.legalFirstName} ${r.legalLastName}`]){
      const k=norm(String(key||''));
      if(!k)continue;
      batchManagerLookup.set(k,[...(batchManagerLookup.get(k)||[]),r.rowNumber]);
    }
  }

  for(const r of rows){
    if(r.managerWorkerId)continue;
    if(!r.managerReference){r.managerRowNumber=undefined;continue}
    const k=norm(r.managerReference);
    const existing=ctx.managerLookup.get(k)||[];
    const batch=(batchManagerLookup.get(k)||[]).filter(x=>x!==r.rowNumber);
    if(existing.length===1&&batch.length===0){r.managerWorkerId=existing[0];r.managerRowNumber=undefined}
    else if(existing.length===0&&batch.length===1){r.managerRowNumber=batch[0]}
    else if(existing.length+batch.length===0)r.errors!.push(`Manager not found: ${r.managerReference}`);
    else r.errors!.push(`Manager match is ambiguous: ${r.managerReference}`);
  }

  const byRow=new Map(rows.map(r=>[r.rowNumber,r]));
  const visiting=new Set<number>();
  const visited=new Set<number>();
  function visit(n:number,trail:number[]=[]){
    if(visited.has(n))return;
    if(visiting.has(n)){
      const cycle=trail.slice(trail.indexOf(n));
      for(const rowNumber of cycle){
        const r=byRow.get(rowNumber);
        if(r&&!r.errors!.includes('Manager hierarchy contains a cycle.'))r.errors!.push('Manager hierarchy contains a cycle.');
      }
      return;
    }
    visiting.add(n);
    const next=byRow.get(n)?.managerRowNumber;
    if(next)visit(next,[...trail,n]);
    visiting.delete(n);
    visited.add(n);
  }
  for(const r of rows)visit(r.rowNumber);

  for(const r of rows){
    r.errors=[...new Set(r.errors||[])];
    r.warnings=[...new Set(r.warnings||[])];
  }

  const readyRows=rows.filter(r=>r.errors!.length===0).map(readyPayload);
  return{rows,readyRows,readyCount:readyRows.length,blockedCount:rows.length-readyRows.length};
}

function previewOptions(ctx:ValidationContext){
  return{
    orgUnits:ctx.units.map(u=>({id:String(u.id),name:String(u.name||u.code||u.id),code:String(u.code||'')})).sort((a,b)=>a.name.localeCompare(b.name)),
    positions:ctx.positions.map(p=>({
      id:String(p.id),
      title:String(p.title||p.positionCode||p.id),
      orgUnitId:String(p.orgUnitId||''),
      availableHeadcount:Number(p.availableHeadcount||0),
      capacityState:String(p.capacityState||''),
    })),
    managers:ctx.managerChoices,
  };
}

function previewResponse(p:any,rows:PreviewDraftRow[],ctx:ValidationContext){
  return{
    previewId:p.id,
    fileName:p.fileName,
    fileSha256:p.fileSha256,
    headers:p.headers||[],
    parser:p.parser,
    sourceType:p.sourceType,
    warnings:p.sourceWarnings||[],
    rowCount:rows.length,
    readyCount:rows.filter(r=>(r.errors||[]).length===0).length,
    blockedCount:rows.filter(r=>(r.errors||[]).length>0).length,
    expiresAt:p.expiresAt,
    rows,
    options:previewOptions(ctx),
  };
}

export async function previewEmployeeImport(actor:ActorContext,file:File){
  if(file.size<=0||file.size>15*1024*1024)throw new ApiError(400,'Employee import file must be between 1 byte and 15 MB.','invalid_file_size');
  const bytes=Buffer.from(await file.arrayBuffer());
  const parsed=await parseEmployeeSource(actor,file,bytes);
  if(!parsed.rows.length)throw new ApiError(400,'The import file has no employee data rows.','empty_import');
  if(parsed.rows.length>MAX_IMPORT_ROWS)throw new ApiError(400,'Employee import exceeds the 500 row limit.','row_limit');

  const ctx=await loadValidationContext(actor);
  const drafts=parsedDraftRows(parsed.rows,ctx);
  const validated=validateRows(drafts,ctx);
  const previewId=randomUUID();
  const timestamp=now();
  const expiresAt=new Date(Date.now()+30*60_000).toISOString();
  const record={
    id:previewId,
    fileName:file.name,
    fileSha256:sha(bytes),
    headers:parsed.headers,
    parser:parsed.parser,
    sourceType:parsed.sourceType,
    sourceWarnings:parsed.warnings||[],
    rowCount:validated.rows.length,
    readyCount:validated.readyCount,
    blockedCount:validated.blockedCount,
    readyRows:validated.readyRows,
    previewRows:validated.rows,
    createdBy:actor.uid,
    createdAt:timestamp,
    expiresAt,
    status:'ready',
    correctionsVersion:0,
  };
  await adminDb().doc(`organizations/${actor.orgId}/employeeImportPreviews/${previewId}`).create(record);
  return previewResponse(record,validated.rows,ctx);
}

function correctionString(value:unknown){return typeof value==='string'?value.trim():''}

export async function updateEmployeeImportPreviewRow(actor:ActorContext,previewId:string,rowNumber:number,corrections:EmployeeImportCorrection){
  const db=adminDb();
  const ref=db.doc(`organizations/${actor.orgId}/employeeImportPreviews/${previewId}`);
  const snap=await ref.get();
  if(!snap.exists)throw new ApiError(404,'Employee import preview not found.','preview_not_found');
  const p=snap.data() as any;
  if(p.createdBy!==actor.uid)throw new ApiError(403,'Only the user who created this preview may review it.','preview_owner_required');
  if(Date.parse(p.expiresAt)<Date.now())throw new ApiError(409,'Employee import preview expired. Create a new preview.','preview_expired');
  if(p.status!=='ready')throw new ApiError(409,'Employee import preview is no longer editable.','preview_not_editable');

  const rows=(p.previewRows||[]) as PreviewDraftRow[];
  const index=rows.findIndex(r=>Number(r.rowNumber)===Number(rowNumber));
  if(index<0)throw new ApiError(404,'Employee import row not found.','preview_row_not_found');
  const current={...rows[index]};
  const reviewed=new Set<string>(current.reviewedFields||[]);

  if(Object.prototype.hasOwnProperty.call(corrections,'legalFirstName')){current.legalFirstName=correctionString(corrections.legalFirstName);reviewed.add('legalFirstName')}
  if(Object.prototype.hasOwnProperty.call(corrections,'legalLastName')){current.legalLastName=correctionString(corrections.legalLastName);reviewed.add('legalLastName')}
  if(Object.prototype.hasOwnProperty.call(corrections,'workEmail')){current.workEmail=correctionString(corrections.workEmail).toLowerCase();reviewed.add('workEmail')}
  if(Object.prototype.hasOwnProperty.call(corrections,'phone')){current.phone=correctionString(corrections.phone)||undefined;reviewed.add('phone')}
  if(Object.prototype.hasOwnProperty.call(corrections,'employeeNumber')){current.employeeNumber=correctionString(corrections.employeeNumber);reviewed.add('employeeNumber')}
  if(Object.prototype.hasOwnProperty.call(corrections,'employmentType')){current.employmentType=normalizeEmploymentType(correctionString(corrections.employmentType));reviewed.add('employmentType')}
  if(Object.prototype.hasOwnProperty.call(corrections,'hireDate')){current.hireDate=normalizeDate(correctionString(corrections.hireDate));reviewed.add('hireDate')}

  if(Object.prototype.hasOwnProperty.call(corrections,'orgUnitId')){
    const next=correctionString(corrections.orgUnitId);
    if(next!==String(current.orgUnitId||''))current.positionId=undefined;
    current.orgUnitId=next||undefined;
    reviewed.add('orgUnitId');
  }
  if(Object.prototype.hasOwnProperty.call(corrections,'positionId')){current.positionId=correctionString(corrections.positionId)||undefined;reviewed.add('positionId')}
  if(Object.prototype.hasOwnProperty.call(corrections,'managerWorkerId')){
    current.managerWorkerId=correctionString(corrections.managerWorkerId)||undefined;
    current.managerRowNumber=undefined;
    current.managerReference=undefined;
    reviewed.add('managerWorkerId');
  }
  current.reviewedFields=[...reviewed];

  const nextRows=[...rows];
  nextRows[index]=current;
  const ctx=await loadValidationContext(actor);
  const validated=validateRows(nextRows,ctx);
  const timestamp=now();
  const before={rowNumber:rows[index].rowNumber,errors:rows[index].errors,reviewedFields:rows[index].reviewedFields};
  const after=validated.rows[index];
  const audit=buildAudit(actor,{action:'employee.import.preview.correct',entityType:'employeeImportPreview',entityId:previewId,before,after:{rowNumber:after.rowNumber,errors:after.errors,reviewedFields:after.reviewedFields}});
  const batch=db.batch();
  batch.set(ref,{
    previewRows:validated.rows,
    readyRows:validated.readyRows,
    readyCount:validated.readyCount,
    blockedCount:validated.blockedCount,
    correctionsVersion:Number(p.correctionsVersion||0)+1,
    lastReviewedAt:timestamp,
    lastReviewedBy:actor.uid,
  },{merge:true});
  batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
  await batch.commit();

  return previewResponse({...p,readyCount:validated.readyCount,blockedCount:validated.blockedCount},validated.rows,ctx);
}

export async function commitEmployeeImport(actor:ActorContext,previewId:string){
  const db=adminDb();
  const ref=db.doc(`organizations/${actor.orgId}/employeeImportPreviews/${previewId}`);
  const snap=await ref.get();
  if(!snap.exists)throw new ApiError(404,'Employee import preview not found.','preview_not_found');
  const p=snap.data() as any;
  if(p.createdBy!==actor.uid)throw new ApiError(403,'Only the user who reviewed this preview may commit it.','preview_owner_required');
  if(Date.parse(p.expiresAt)<Date.now())throw new ApiError(409,'Employee import preview expired. Create a new preview.','preview_expired');
  if(p.status==='executing')throw new ApiError(409,'This import is already executing. Reconcile its outcome before retrying.','reconciliation_required');
  if(p.status==='completed')throw new ApiError(409,'This import was already committed.','import_already_completed');
  if(p.blockedCount>0)throw new ApiError(409,'Complete all rows that need review before committing this import.','import_has_blockers');

  await db.runTransaction(async tx=>{
    const s=await tx.get(ref);
    if(s.data()?.status!=='ready')throw new ApiError(409,'Import preview is no longer ready.','preview_not_ready');
    tx.set(ref,{status:'executing',executingAt:now()},{merge:true});
  });

  const created:any[]=[];
  const failures:any[]=[];
  const createdByRow=new Map<number,string>();
  const pending=[...(p.readyRows as any[])];

  while(pending.length&&!failures.length){
    let progressed=false;
    for(let i=0;i<pending.length;i++){
      const row=pending[i]!;
      if(row.managerRowNumber&&!createdByRow.has(row.managerRowNumber))continue;
      try{
        const payload={...row};
        delete payload.rowNumber;
        delete payload.managerRowNumber;
        if(row.managerRowNumber)payload.managerWorkerId=createdByRow.get(row.managerRowNumber);
        const result=await createEmployee(actor,payload);
        const workerId=(result as any).worker?.id||(result as any).id;
        created.push({row:row.rowNumber,workerId});
        createdByRow.set(row.rowNumber,workerId);
        pending.splice(i,1);
        i--;
        progressed=true;
      }catch(e){
        failures.push({row:row.rowNumber,message:e instanceof Error?e.message:'Creation failed'});
        break;
      }
    }
    if(!progressed&&!failures.length){
      failures.push({row:pending[0]?.rowNumber||0,message:'Manager dependency could not be resolved. Reconciliation is required.'});
      break;
    }
  }

  const timestamp=now();
  const batchId=randomUUID();
  const status=failures.length?'reconciliation_required':'completed';
  const receipt={id:batchId,previewId,status,createdCount:created.length,expectedCount:p.readyRows.length,failures,created,fileSha256:p.fileSha256,createdAt:timestamp,createdBy:actor.uid};
  const audit=buildAudit(actor,{action:'employee.import.commit',entityType:'employeeImport',entityId:batchId,after:receipt});
  const batch=db.batch();
  batch.set(ref,{status,...(status==='completed'?{completedAt:timestamp}:{}),reconciliationRequired:failures.length>0,receiptId:batchId},{merge:true});
  batch.create(db.doc(`organizations/${actor.orgId}/employeeImportBatches/${batchId}`),receipt);
  batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
  await batch.commit();
  if(failures.length)throw new ApiError(409,`Import stopped after ${created.length} employee(s). Reconciliation is required before retrying.`,'reconciliation_required');
  return receipt;
}
