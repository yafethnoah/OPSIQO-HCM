import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (path: string) => readFileSync(path, 'utf8');
const MINIMUM_PATCH = 'H47.1C';
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

describe('H47.1C mobile toolchain compatibility', () => {
  it('preserves the H47.1C-or-later patch lineage', () => {
    const identity = read('src/lib/release/identity.ts');
    expect(featureMajor(identity)).toBeGreaterThanOrEqual(47);
    expect(releaseScore(identity)).toBeGreaterThanOrEqual(47*100000+1*100+3);
  });

  it('uses TypeScript 6 compatible path aliases without baseUrl', () => {
    const config = JSON.parse(read('mobile/tsconfig.json'));
    expect(config.compilerOptions.baseUrl).toBeUndefined();
    expect(config.compilerOptions.paths['@/*']).toEqual(['./src/*']);
  });

  it('pins the Expo-recommended native compatibility versions seen by certification', () => {
    const pkg = JSON.parse(read('mobile/package.json'));
    expect(pkg.dependencies['react-native']).toBe('0.86.3');
    expect(pkg.dependencies['react-native-safe-area-context']).toBe('~5.7.0');
    expect(pkg.dependencies['react-native-screens']).toBe('~4.26.0');
  });

  it('uses an isolated mobile install and non-mutating dependency check', () => {
    const runner = read('RUN_OPSIQO_H47_1C_VALIDATION.ps1');
    expect(runner).toContain('npm install --no-package-lock --no-audit --no-fund');
    expect(runner).toContain("$env:CI = '1'");
    expect(runner).toContain('expo install --check');
    expect(runner).not.toContain('expo install --fix');
  });
});
