import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const MINIMUM_PATCH = 'H47.1D';

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

describe('H47.1D-or-later mobile tab icon type compatibility', () => {
  it('preserves H47.1D-or-later patch lineage', () => {
    const identity = read('src/lib/release/identity.ts');
    expect(featureMajor(identity)).toBeGreaterThanOrEqual(47);
    expect(releaseScore(identity)).toBeGreaterThanOrEqual(47*100000+1*100+4);
  });

  it('matches the Expo Router tabBarIcon ColorValue contract', () => {
    const layout = read('mobile/app/(app)/_layout.tsx');
    expect(layout).toContain('type ColorValue');
    expect(layout).toContain('focused: boolean');
    expect(layout).toContain('color: ColorValue');
    expect(layout).toContain('size: number');
    expect(layout).not.toContain('props:{color:string}');
    expect(layout).not.toContain('props: { color: string }');
  });

  it('uses the navigation-provided icon size for either legacy glyphs or successor SVG icons', () => {
    const layout = read('mobile/app/(app)/_layout.tsx');
    const svgIcon = read('mobile/src/components/pulse-tab-icon.tsx');

    const legacy =
      layout.includes('fontSize: Math.max(14, size - 4)') &&
      layout.includes('lineHeight: size');

    const successorSvg =
      layout.includes('PulseTabIcon') &&
      layout.includes('size={size}') &&
      svgIcon.includes('width={size}') &&
      svgIcon.includes('height={size}');

    expect(legacy || successorSvg).toBe(true);
  });

  it('keeps prior H47.1C certification checks successor-safe', () => {
    const historicalTest = read('tests/mobile-employee-h47-1c.test.ts');
    const historicalAudit = read('scripts/opsiqo-h47-1c-mobile-toolchain-audit.mjs');
    expect(historicalTest).toContain("MINIMUM_PATCH = 'H47.1C'");
    expect(historicalAudit).toContain('H47.1C-or-later patch lineage');
    expect(historicalAudit).toContain('[C-Z]');
  });

  it('keeps the native employee app patch version at the certified-or-later level', () => {
    const pkg = JSON.parse(read('mobile/package.json'));
    expect(Number(pkg.version.split('.')[2])).toBeGreaterThanOrEqual(3);
  });
});