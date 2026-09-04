import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('H47.1E-or-later Expo Doctor workspace isolation', () => {
  it('preserves H47.1E-or-later patch lineage and mobile package version', () => {
    const identity = read('src/lib/release/identity.ts');
    const pkg = JSON.parse(read('mobile/package.json'));
    expect(identity).toContain("OPSIQO_FEATURE_RELEASE = process.env.OPSIQO_FEATURE_RELEASE || 'H47'");
    expect(identity).toMatch(/OPSIQO_PATCH_RELEASE = process\.env\.OPSIQO_PATCH_RELEASE \|\| 'H47\.1[E-Z]'/);
    expect(Number(pkg.version.split('.')[2])).toBeGreaterThanOrEqual(4);
  });

  it('removes the obsolete SDK 57 newArchEnabled config field', () => {
    const app = JSON.parse(read('mobile/app.json'));
    expect(Object.hasOwn(app.expo, 'newArchEnabled')).toBe(false);
  });

  it('declares Expo Router linking peer explicitly', () => {
    const pkg = JSON.parse(read('mobile/package.json'));
    expect(pkg.dependencies['expo-linking']).toBe('~57.0.9');
  });

  it('certifies mobile dependencies in an isolated temporary project', () => {
    const runner = read('RUN_OPSIQO_H47_1E_VALIDATION.ps1');
    expect(runner).toContain('[System.IO.Path]::GetTempPath()');
    expect(runner).toContain('opsiqo-h471e-mobile-');
    expect(runner).toContain('$TempMobile');
    expect(runner).toContain('npm install --no-audit --no-fund');
    expect(runner).toContain("Test-Path '.\\package-lock.json'");
    expect(runner).toContain('npx expo install --check');
    expect(runner).toContain('npx expo-doctor');
    expect(runner).toContain('Remove-Item -LiteralPath $TempRoot -Recurse -Force');
  });

  it('keeps H47.1D historical coverage successor-safe', () => {
    const historicalTest = read('tests/mobile-employee-h47-1d.test.ts');
    const historicalAudit = read('scripts/opsiqo-h47-1d-mobile-tab-icon-audit.mjs');
    expect(historicalTest).toContain('H47.1D-or-later patch lineage');
    expect(historicalTest).toContain('[D-Z]');
    expect(historicalAudit).toContain('H47.1D-or-later patch lineage');
    expect(historicalAudit).toContain('[D-Z]');
  });
});
