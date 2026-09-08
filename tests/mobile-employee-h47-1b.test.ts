import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const MINIMUM_PATCH = 'H47.1B';
const releaseScore=(identity:string)=>{
  const match=identity.match(/OPSIQO_PATCH_RELEASE = process\.env\.OPSIQO_PATCH_RELEASE \|\| 'H(\d+)\.(\d+)([A-Z]?)'/);
  expect(match).not.toBeNull();
  const major=Number(match?.[1]||0);
  const minor=Number(match?.[2]||0);
  const letter=match?.[3]?match[3].charCodeAt(0)-64:0;
  return major*100000+minor*100+letter;
};
const featureMajor=(identity:string)=>{
  const match=identity.match(/OPSIQO_FEATURE_RELEASE = process\.env\.OPSIQO_FEATURE_RELEASE \|\| 'H(\d+)(?:\.\d+[A-Z]?)?'/);
  expect(match).not.toBeNull();
  return Number(match?.[1]||0);
};

describe('H47.1B historical certification compatibility', () => {
  it('preserves the H47.1B-or-later patch lineage', () => {
    const identity = read('src/lib/release/identity.ts');
    expect(featureMajor(identity)).toBeGreaterThanOrEqual(47);
    expect(releaseScore(identity)).toBeGreaterThanOrEqual(47*100000+1*100+2);
  });

  it('keeps H41 fail-closed field clearing as the first failed-parse action', () => {
    const ui = read('src/components/resume-intake-assistant.tsx');
    expect(ui).toMatch(/catch \(e\) \{\s*clearParsedValues\(form\)/);
  });

  it('keeps the H45 readiness test valid for successor feature releases', () => {
    const test = read('tests/recruiting-uat-readiness-h45.test.ts');
    expect(test).toContain('H45-or-later runtime marker');
    expect(test).toContain('toBeGreaterThanOrEqual(45)');
    expect(test).toContain('(?:\\.\\d+[A-Z]?)?');
  });
});
