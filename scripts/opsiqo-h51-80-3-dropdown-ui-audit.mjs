import fs from 'node:fs';

const workspace='src/components/hr-forms-operational-workspace.tsx';
const select='src/components/opsiqo-select.tsx';
const css='src/app/globals.css';

for(const p of [workspace,select,css])if(!fs.existsSync(p))throw new Error(`H51.80.3 missing ${p}`);

const w=fs.readFileSync(workspace,'utf8');
const s=fs.readFileSync(select,'utf8');
const c=fs.readFileSync(css,'utf8');

if(!w.includes("import { OpsiqoSelect } from '@/components/opsiqo-select';"))throw new Error('Custom OPSIQO dropdown import missing.');
if(!w.includes('ariaLabel="What should be created?"'))throw new Error('Creation-mode custom dropdown missing.');
if(/What should be created\?<\/span><select/.test(w))throw new Error('Native creation-mode select is still present.');
for(const marker of ['aria-haspopup="listbox"','role="listbox"','role="option"',"event.key==='Escape'","event.key==='ArrowDown'"])if(!s.includes(marker))throw new Error(`Accessible dropdown behavior missing: ${marker}`);
for(const marker of ['.opsiqoSelectMenu','.opsiqoSelectTrigger','.opsiqoSelectOption','max-height:min(280px,40vh)','background:#07121f'])if(!c.includes(marker))throw new Error(`Dropdown CSS marker missing: ${marker}`);
console.log('OPSIQO H51.80.3 HR FORMS DROPDOWN UI AUDIT: PASS');
