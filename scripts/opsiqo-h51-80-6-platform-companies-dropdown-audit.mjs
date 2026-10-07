import fs from 'node:fs';

const file='src/components/platform-tenant-workspace.tsx';
if(!fs.existsSync(file))throw new Error('PlatformTenantWorkspace source missing.');

const source=fs.readFileSync(file,'utf8');

const required=[
  "import { OpsiqoSelect } from '@/components/opsiqo-select';",
  "environment,setEnvironment]=useState('test')",
  'type="hidden" name="environment" value={environment}',
  'ariaLabel="Environment"',
  "value:'test',label:'Test'",
  "value:'uat',label:'UAT'",
  "value:'production',label:'Production'",
  "setEnvironment('test')"
];

for(const marker of required){
  if(!source.includes(marker))throw new Error(`H51.80.6 marker missing: ${marker}`);
}

if(/<select\b/.test(source))throw new Error('Native select remains in Platform Companies workspace.');

console.log('OPSIQO H51.80.6 PLATFORM COMPANIES DROPDOWN AUDIT: PASS');
