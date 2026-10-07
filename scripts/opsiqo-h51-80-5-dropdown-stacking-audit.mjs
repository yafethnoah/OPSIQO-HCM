import fs from 'node:fs';

const cssPath='src/app/globals.css';
const uiPath='src/components/hr-forms-operational-workspace.tsx';

if(!fs.existsSync(cssPath))throw new Error('globals.css missing');
if(!fs.existsSync(uiPath))throw new Error('HR Forms operational workspace missing');

const css=fs.readFileSync(cssPath,'utf8');
const ui=fs.readFileSync(uiPath,'utf8');

const checks=[
  [/\.opsiqoSelect\.isOpen\s*\{[^}]*z-index\s*:\s*10000\s*!important\s*;?[^}]*\}/s,'open select root z-index'],
  [/\.opsiqoSelect\.isOpen\s+\.opsiqoSelectMenu\s*\{[^}]*z-index\s*:\s*10001\s*!important\s*;?[^}]*\}/s,'open menu z-index'],
  [/\.hrFormsStudioStep\s*\{[^}]*overflow\s*:\s*visible\s*!important\s*;?[^}]*\}/s,'Step 2 overflow visible'],
  [/\.hrFormsStudioStep\s+\.field\s*\{[^}]*overflow\s*:\s*visible\s*!important\s*;?[^}]*\}/s,'field overflow visible']
];

for(const [pattern,label] of checks){
  if(!pattern.test(css))throw new Error(`H51.80.5.1 stacking rule missing: ${label}`);
}

if(!ui.includes('className="card stack hrFormsStudioStep" onSubmit={generate}')){
  throw new Error('Step 2 stacking class missing from operational workspace');
}

console.log('OPSIQO H51.80.5.1 DROPDOWN STACKING AUDIT: PASS');