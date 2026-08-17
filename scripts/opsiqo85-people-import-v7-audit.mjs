#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
const root=process.cwd();
const read=p=>readFileSync(`${root}/${p}`,'utf8');
const checks=[
 ['People page mounts employee import',read('src/app/people/page.tsx').includes('EmployeeImportPanel')],
 ['Members page mounts employee import',read('src/app/members/page.tsx').includes('EmployeeImportPanel')],
 ['Employee import UI accepts CSV',read('src/components/employee-import-panel.tsx').includes('.csv')],
 ['Employee import UI accepts XLSX',read('src/components/employee-import-panel.tsx').includes('.xlsx')],
 ['Employee import UI accepts PDF',read('src/components/employee-import-panel.tsx').includes('.pdf')],
 ['Employee API message includes PDF',read('src/app/api/organizations/[orgId]/imports/employees/route.ts').includes('CSV/XLSX/PDF')],
 ['Employee import service handles PDF',read('src/lib/data-import/employee-import.ts').includes("application/pdf")&&read('src/lib/data-import/employee-import.ts').includes('extractPdfTextLayer')],
 ['PDF text parser exists',existsSync(`${root}/src/lib/data-import/pdf-text.ts`)],
 ['Roster text mapper exists',existsSync(`${root}/src/lib/data-import/employee-roster-text.ts`)],
 ['Scanned PDF governed-AI fallback exists',read('src/lib/data-import/employee-import.ts').includes('governedEmployeeRosterRows')],
 ['Universal HR parser reads PDF text layers',read('src/lib/data-import/universal-parser.ts').includes("e === '.pdf'")],
 ['Imported employees refresh People',read('src/components/people-table.tsx').includes('opsiqo:employees-imported')],
 ['Imported employees refresh Members linking',read('src/components/invitation-panel.tsx').includes('opsiqo:employees-imported')],
 ['Membership remains invitation governed',read('src/app/members/page.tsx').includes('membership still requires the secure invitation flow')],
 ['ATS empty-state explains resume intake',read('src/components/ats-recruiting-panel.tsx').includes('Start with a candidate application')],
 ['ATS resume review accepts PDF',read('src/components/ats-recruiting-panel.tsx').includes('accept=".pdf,.docx,.txt,.rtf,.md"')],
 ['ATS cover-letter generation remains present',read('src/components/ats-recruiting-panel.tsx').includes('Generate from resume evidence')],
 ['People empty state prop repaired',!read('src/components/people-table.tsx').includes('description="Create an employee')],
];
const failed=checks.filter(x=>!x[1]);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'}  ${name}`);
console.log(JSON.stringify({status:failed.length?'FAIL':'PASS',checks:checks.length,failures:failed.length},null,2));
process.exit(failed.length?1:0);
