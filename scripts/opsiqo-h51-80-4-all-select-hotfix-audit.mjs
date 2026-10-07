import fs from 'node:fs';

const operational='src/components/hr-forms-operational-workspace.tsx';
const fill='src/components/hr-form-fill-workspace.tsx';
const select='src/components/opsiqo-select.tsx';

for(const p of [operational,fill,select]){
  if(!fs.existsSync(p))throw new Error(`H51.80.4 missing ${p}`);
}

const o=fs.readFileSync(operational,'utf8');
const f=fs.readFileSync(fill,'utf8');
const s=fs.readFileSync(select,'utf8');

if((o.match(/<select\b/g)||[]).length!==0)throw new Error('Native select remains in operational workspace.');
if((f.match(/<select\b/g)||[]).length!==0)throw new Error('Native select remains in fill workspace.');

for(const marker of [
  'ariaLabel="Use this vacancy, employee or position"',
  'ariaLabel="Assign or pre-fill employee"',
  'ariaLabel="Field type"',
  'ariaLabel="Assign or pre-fill pack employee"',
  'name="kind" value={advancedKind}'
]){
  if(!o.includes(marker))throw new Error(`Operational marker missing: ${marker}`);
}

for(const marker of [
  "import { OpsiqoSelect } from '@/components/opsiqo-select';",
  'ariaLabel={field.label}',
  "value===''?'':value==='yes'"
]){
  if(!f.includes(marker))throw new Error(`Fill-mode marker missing: ${marker}`);
}

for(const marker of [
  'aria-haspopup="listbox"',
  'role="listbox"',
  'role="option"',
  "event.key==='Escape'",
  "event.key==='ArrowDown'"
]){
  if(!s.includes(marker))throw new Error(`Accessible OPSIQO select marker missing: ${marker}`);
}

console.log('OPSIQO H51.80.4 ALL HR FORMS SELECTS AUDIT: PASS');