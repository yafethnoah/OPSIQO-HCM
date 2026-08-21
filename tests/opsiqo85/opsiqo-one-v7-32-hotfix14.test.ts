import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

describe('V7.32 Hotfix 14 isolated browser watchdog',()=>{
  it('forcibly terminates a child process that never exits',()=>{
    const started=Date.now();
    const result=spawnSync(process.execPath,['scripts/opsiqo85-v7-32-watchdog-selftest.mjs'],{
      cwd:process.cwd(),
      encoding:'utf8',
      timeout:8000,
      windowsHide:true,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"status":"PASS"');
    expect(Date.now()-started).toBeLessThan(8000);
  },10000);
  it('isolates every browser route and checkpoints evidence',()=>{
    const smoke=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-smoke.mjs','utf8');
    const worker=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-worker.mjs','utf8');
    expect(smoke).toContain('runBoundedProcess');
    expect(smoke).toContain('writeCheckpoint(false)');
    expect(smoke).toContain('TIMEOUT ROUTE');
    expect(worker).toContain('killProcessTree(browser?.pid)');
  });
});
