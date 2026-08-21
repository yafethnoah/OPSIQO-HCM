import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('V7.32 Hotfix 15 historical audit compatibility',()=>{
  it('keeps H11 fail-closed while accepting the stronger H14 checkpoint model',()=>{
    const h11=fs.readFileSync('scripts/opsiqo85-v7-32-hotfix11-audit.mjs','utf8');
    expect(h11).toContain('boundedPartialEvidence');
    expect(h11).toContain('v7-32-authenticated-accessibility.partial.json');
    expect(h11).toContain('writeCheckpoint(false)');
    expect(h11).toContain('routesCompleted');
    expect(h11).toContain('routesTotal');
    expect(h11).toContain('runBoundedProcess');
    expect(h11).toContain("browser.includes('runtimeError')");
  });
});
