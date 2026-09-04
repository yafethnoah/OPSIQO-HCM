#!/usr/bin/env node
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const excluded = new Set(['node_modules','.next','artifacts','coverage','.firebase','dist','build','.git']);
const files=[];
function walk(dir){
  for(const name of readdirSync(dir)){
    if(excluded.has(name)) continue;
    const p=join(dir,name); const st=statSync(p);
    if(st.isDirectory()) walk(p);
    else if(st.isFile() && name.toLowerCase().endsWith('.ps1')) files.push(p);
  }
}
walk(root);

const encodingFailures=[];
for(const file of files){
  const b=readFileSync(file);
  const hasBom=b.length>=3 && b[0]===0xef && b[1]===0xbb && b[2]===0xbf;
  const payload=hasBom?b.subarray(3):b;
  if(!hasBom && payload.some(v=>v>0x7f)){
    encodingFailures.push(`${relative(root,file)}: BOM-less PowerShell contains non-ASCII bytes`);
  }
  try { new TextDecoder('utf-8',{fatal:true}).decode(payload); }
  catch { encodingFailures.push(`${relative(root,file)}: invalid UTF-8 payload`); }
}

if(encodingFailures.length){
  console.error('OPSIQO Windows PowerShell 5.1 compatibility: FAIL');
  for(const item of encodingFailures) console.error(` - ${item}`);
  process.exit(1);
}

let nativeParse='not-run (non-Windows packaging environment)';
if(process.platform==='win32'){
  const temp=mkdtempSync(join(tmpdir(),'opsiqo-ps-parse-'));
  const checker=join(temp,'parse-all.ps1');
  const checkerText = [
    "$ErrorActionPreference='Stop'",
    "$root=$env:OPSIQO_PS_PARSE_ROOT",
    "$failures=New-Object System.Collections.Generic.List[string]",
    "Get-ChildItem -LiteralPath $root -Filter '*.ps1' -File -Recurse | Where-Object { $_.FullName -notmatch '\\\\(node_modules|\\.next|artifacts|coverage|\\.firebase|dist|build|\\.git)\\\\' } | ForEach-Object {",
    "  $tokens=$null; $errors=$null",
    "  [System.Management.Automation.Language.Parser]::ParseFile($_.FullName,[ref]$tokens,[ref]$errors) | Out-Null",
    "  foreach($e in @($errors)){ $failures.Add(($_.FullName + ':' + $e.Extent.StartLineNumber + ':' + $e.Message)) | Out-Null }",
    "}",
    "if($failures.Count -gt 0){ $failures | ForEach-Object { Write-Error $_ }; exit 1 }",
    "Write-Host ('Native Windows PowerShell parser PASS: ' + (Get-ChildItem -LiteralPath $root -Filter '*.ps1' -File -Recurse).Count + ' files')",
  ].join('\r\n');
  writeFileSync(checker,checkerText,{encoding:'ascii'});
  const env={...process.env,OPSIQO_PS_PARSE_ROOT:root};
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',checker],{cwd:root,env,encoding:'utf8'});
  rmSync(temp,{recursive:true,force:true});
  if(result.stdout) process.stdout.write(result.stdout);
  if(result.status!==0){
    if(result.stderr) process.stderr.write(result.stderr);
    console.error('OPSIQO Windows PowerShell native parser: FAIL');
    process.exit(result.status ?? 1);
  }
  nativeParse='PASS';
}

console.log(`OPSIQO Windows PowerShell 5.1 encoding audit: PASS (${files.length} .ps1 files)`);
console.log(`Native parser: ${nativeParse}`);
console.log('Boundary: BOM-less .ps1 files must be ASCII-only; UTF-8 BOM files are accepted and validated as UTF-8.');
