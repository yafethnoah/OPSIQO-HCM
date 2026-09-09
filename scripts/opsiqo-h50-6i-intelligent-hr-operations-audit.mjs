import fs from 'node:fs';

const checks=[
 ['fillable PDF engine','src/lib/documents/fillable-pdf.ts',['/AcroForm','/FT /Tx','/NeedAppearances true']],
 ['guided PDF UI','src/components/separation-task-workspace.tsx',['Download fillable PDF','buildFillablePdf','Detailed steps to complete']],
 ['offboarding plan','src/components/separation-workspace.tsx',['Offboarding execution plan','Prepare all task workspaces','Completion criteria:']],
 ['offboarding forms','src/lib/separation/task-workspace.ts',['Final HR clearance and sign-off','Post-employment confidentiality reminder','Manager offboarding clearance','IT access and device clearance','Property and facilities clearance']],
 ['import trust','src/components/import-center-workspace.tsx',['Improve with AI / re-parse','Source evidence','high_confidence','review_required']],
 ['HR Today','src/components/hr-today-actions.tsx',['HR TODAY · INTELLIGENT COMMAND CENTRE','Bulk execution safeguard']],
 ['daily brief integration','src/components/daily-brief-workspace.tsx',['HrTodayActions','<HrTodayActions']],
 ['governed next action','src/lib/ai-intelligence/section-assist.ts',['NEXT_ACTION_PRESET','What should I do next?','if (!match) return null;']],
 ['release identity','src/lib/release/identity.ts',["'H50.6I'"]],
];
let failures=0;
for(const [label,path,needles] of checks){
  if(!fs.existsSync(path)){console.error(`FAIL ${label}: missing ${path}`);failures++;continue;}
  const source=fs.readFileSync(path,'utf8');
  for(const needle of needles){if(!source.includes(needle)){console.error(`FAIL ${label}: missing ${needle}`);failures++;}}
  if(!failures)console.log(`PASS ${label}`);
}
if(failures){console.error(`H50.6I AUDIT: FAIL (${failures})`);process.exit(1);}
console.log('H50.6I INTELLIGENT HR OPERATIONS AUDIT: PASS');
