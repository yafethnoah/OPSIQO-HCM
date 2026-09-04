import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const checks=[];
const add=(name,pass)=>checks.push({name,pass:!!pass});

const contract=read('src/lib/contract-import/service.ts');
const imports=read('src/lib/data-import/employee-import.ts');
const translations=read('src/lib/opsiqo-one/runtime-ui-translations-v7-32.json');

add('Contract import reuses deterministic PDF text-layer extraction', contract.includes("extractPdfTextLayer"));
add('Text-based PDF can survive governed AI failure', contract.includes("text&&text.trim().length>=40"));
add('Scanned PDF AI prerequisite is a semantic 422, not generic 503', contract.includes("new ApiError(422,'Scanned PDF contract parsing requires"));
add('Deterministic PDF does not claim model-provided provenance', contract.includes("sanitizeExtraction(raw,text,isPdf&&!!ai)"));

add('Governed organization-unit alias families exist', imports.includes('ORG_UNIT_FAMILIES'));
add('Organization unit exact matching remains present', imports.includes('unitMap.get(headerNorm(unitName))'));
add('Alias mapping requires one unique family candidate', imports.includes('aliasMatches.length===1'));
add('Ambiguous alias matches remain blocked', imports.includes('Organization unit match is ambiguous'));
add('Unavailable positions remain filtered', imports.includes("!['full','closed','frozen'].includes"));

for(const text of [
  'Contract Import',
  'Import an employment contract, extract structured terms with source evidence, review every value, and create a controlled OPSIQO contract profile and module prefill proposal.',
  'Ask OPSIQO or tell it what to do…',
  'FIND',
  'Page, task or module…',
  'Organization Launchpad',
  'AI Governance Center',
  'Scanned PDF contract parsing requires an active governed AI model and ai.use permission. Text-based PDFs can use deterministic fallback extraction.',
  'Organization unit "{source}" mapped to "{target}" by governed alias.'
]) add('Runtime translation exists: '+text, translations.includes(JSON.stringify(text)));

const failures=checks.filter(x=>!x.pass);
console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',checks:checks.length,failures},null,2));
if(failures.length)process.exit(1);
