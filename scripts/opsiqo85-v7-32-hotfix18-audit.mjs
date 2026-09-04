#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const copilot=read('src/components/ai-copilot-workspace.tsx');
const pkg=JSON.parse(read('package.json'));
const runner=read('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1');
const childStart=copilot.indexOf('function Copilot(');
const childEnd=copilot.indexOf('function Recommendation(', childStart);
const child=childStart>=0&&childEnd>childStart?copilot.slice(childStart,childEnd):'';
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

check('AI Copilot declares one workspace translation root', copilot.includes('const translationRoot=useRef<HTMLDivElement>(null)')&&copilot.includes("useLegacySurfaceTranslation('ai_copilot',translationRoot)"));
check('AI Copilot loading root remains translated', copilot.includes('if(!data)return <div ref={translationRoot} className="stack">'));
check('AI Copilot loaded workspace root retains translation ref', copilot.includes('return <div ref={translationRoot} className="stack">\n    <section className="card">'));
check('Nested Copilot child no longer references out-of-scope translationRoot', child.length>0&&!child.includes('ref={translationRoot}'));
check('Ask OPSIQO textarea keeps explicit accessible name', child.includes('aria-label="Ask OPSIQO question"'));
check('Package exposes H18 audit', pkg.scripts?.['opsiqo85:v7.32:hotfix18:audit']==='node scripts/opsiqo85-v7-32-hotfix18-audit.mjs');
check('Package exposes H18 targeted test', pkg.scripts?.['test:opsiqo-one-v7.32-hotfix18']==='vitest run tests/opsiqo85/opsiqo-one-v7-32-hotfix18.test.ts');
check('Canonical runner executes H18 audit and targeted test', runner.includes('opsiqo85:v7.32:hotfix18:audit')&&runner.includes('test:opsiqo-one-v7.32-hotfix18'));

for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'} ${c.name}`);
const passed=checks.filter(c=>c.ok).length;
console.log(`\nOPSIQO V7.32 Hotfix 18 audit: ${passed}/${checks.length} PASS`);
if(passed!==checks.length)process.exit(1);
