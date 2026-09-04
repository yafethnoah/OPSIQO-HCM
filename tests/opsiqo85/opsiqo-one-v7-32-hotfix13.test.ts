import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
const smoke=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-smoke.mjs','utf8');
const worker=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-worker.mjs','utf8');
const bounded=fs.readFileSync('scripts/opsiqo85-v7-32-bounded-process.mjs','utf8');
const browserSource=smoke+'\n'+worker+'\n'+bounded;
describe('V7.32 Hotfix 13 bounded authenticated browser UAT',()=>{
  it('bounds every CDP command instead of allowing an infinite pending promise',()=>{
    expect(browserSource).toContain('Timed out waiting for CDP ${method}');
    expect(browserSource).toContain('this.pending.delete(id)');
  });
  it('uses a bounded route status probe rather than a second same-page fetch',()=>{
    expect(browserSource).toContain('probeRoute');
    expect(browserSource).toContain('HTTP status=');
    expect(browserSource).not.toContain('fetch(location.href');
  });
  it('records route runtime failures and kills stalled route process trees',()=>{
    expect(browserSource).toContain("id:'route-runtime'");
    expect(browserSource).toContain('killProcessTree');
  });
});
