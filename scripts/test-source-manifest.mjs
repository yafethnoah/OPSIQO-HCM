#!/usr/bin/env node
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root=resolve('.');
const dir=mkdtempSync(join(tmpdir(),'opsiqo-manifest-test-'));
const script=join(dir,'source-manifest.mjs');
try{
  cpSync(join(root,'scripts','source-manifest.mjs'),script);
  writeFileSync(join(dir,'a.txt'),'alpha\n');
  const run=(...args)=>spawnSync(process.execPath,[script,...args],{cwd:dir,encoding:'utf8'});
  const generated=run('generate');
  if(generated.status!==0)throw new Error(`generate failed\n${generated.stdout}\n${generated.stderr}`);
  const verified=run('verify');
  if(verified.status!==0)throw new Error(`verify failed\n${verified.stdout}\n${verified.stderr}`);
  writeFileSync(join(dir,'a.txt'),'tampered\n');
  const tampered=run('verify');
  if(tampered.status!==2||!`${tampered.stdout}${tampered.stderr}`.includes('hash:a.txt'))throw new Error('hash tamper was not rejected');
  writeFileSync(join(dir,'a.txt'),'alpha\n');
  writeFileSync(join(dir,'extra.txt'),'extra\n');
  const extra=run('verify');
  if(extra.status!==2||!`${extra.stdout}${extra.stderr}`.includes('unlisted:extra.txt'))throw new Error('unlisted file was not rejected');
  console.log(JSON.stringify({status:'PASS',baseline:'verified',hashTamper:'rejected',unlistedFile:'rejected'},null,2));
}finally{rmSync(dir,{recursive:true,force:true});}
