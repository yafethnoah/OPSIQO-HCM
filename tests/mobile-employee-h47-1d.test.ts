import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('H47.1D mobile tab icon type compatibility', () => {
  it('preserves H47.1D-or-later patch lineage', () => {
    const identity = read('src/lib/release/identity.ts');
    expect(identity).toContain("OPSIQO_FEATURE_RELEASE = process.env.OPSIQO_FEATURE_RELEASE || 'H47'");
    expect(identity).toMatch(/OPSIQO_PATCH_RELEASE = process\.env\.OPSIQO_PATCH_RELEASE \|\| 'H47\.1[D-Z]'/);
  });

  it('matches the Expo Router tabBarIcon ColorValue contract', () => {
    const layout = read('mobile/app/(app)/_layout.tsx');
    expect(layout).toContain("type ColorValue");
    expect(layout).toContain('focused: boolean');
    expect(layout).toContain('color: ColorValue');
    expect(layout).toContain('size: number');
    expect(layout).not.toContain('props:{color:string}');
    expect(layout).not.toContain('props: { color: string }');
  });

  it('uses the navigation-provided icon size instead of a fixed glyph size', () => {
    const layout = read('mobile/app/(app)/_layout.tsx');
    expect(layout).toContain('fontSize: Math.max(14, size - 4)');
    expect(layout).toContain('lineHeight: size');
  });

  it('keeps prior H47.1C certification checks successor-safe', () => {
    const historicalTest = read('tests/mobile-employee-h47-1c.test.ts');
    const historicalAudit = read('scripts/opsiqo-h47-1c-mobile-toolchain-audit.mjs');
    expect(historicalTest).toContain('H47.1C-or-later patch lineage');
    expect(historicalTest).toContain('[C-Z]');
    expect(historicalAudit).toContain('H47.1C-or-later patch lineage');
    expect(historicalAudit).toContain('[C-Z]');
  });

  it('bumps the native employee app patch version', () => {
    const pkg = JSON.parse(read('mobile/package.json'));
    expect(Number(pkg.version.split('.')[2])).toBeGreaterThanOrEqual(3);
  });
});
