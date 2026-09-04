import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('H47.1B historical certification compatibility', () => {
  it('preserves the H47.1B-or-later patch lineage', () => {
    const identity = read('src/lib/release/identity.ts');
    expect(identity).toContain("OPSIQO_FEATURE_RELEASE = process.env.OPSIQO_FEATURE_RELEASE || 'H47'");
    expect(identity).toMatch(/OPSIQO_PATCH_RELEASE = process\.env\.OPSIQO_PATCH_RELEASE \|\| 'H47\.1[A-Z]?'/);
  });

  it('keeps H41 fail-closed field clearing as the first failed-parse action', () => {
    const ui = read('src/components/resume-intake-assistant.tsx');
    expect(ui).toMatch(/catch \(e\) \{\s*clearParsedValues\(form\)/);
  });

  it('keeps the H45 readiness test valid for successor feature releases', () => {
    const test = read('tests/recruiting-uat-readiness-h45.test.ts');
    expect(test).toContain('H45-or-later runtime marker');
    expect(test).toContain('toBeGreaterThanOrEqual(45)');
    expect(test).not.toContain("OPSIQO_FEATURE_RELEASE = process.env.OPSIQO_FEATURE_RELEASE || 'H45'");
  });
});
