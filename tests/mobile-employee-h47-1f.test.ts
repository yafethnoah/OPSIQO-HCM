import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read=(p:string)=>readFileSync(p,'utf8');
describe('H47.1F mobile reproducible build baseline',()=>{
  it('publishes H47.1F release and app versions',()=>{
    const identity=read('src/lib/release/identity.ts');
    const pkg=JSON.parse(read('mobile/package.json'));
    const app=JSON.parse(read('mobile/app.json'));
    expect(identity).toContain("OPSIQO_PATCH_RELEASE = process.env.OPSIQO_PATCH_RELEASE || 'H47.1F'");
    expect(pkg.version).toBe('0.2.5');
    const [major, minor, patch] = String(app.expo.version).split(".").map(Number);
    expect([major, minor]).toEqual([0, 1]);
    expect(patch).toBeGreaterThanOrEqual(2);
    expect(app.expo.extra.h47Release).toBe('employee-mobile-v1.1f');
  });
  it('freezes mobile dependency resolution into package-lock v3',()=>{
    expect(existsSync('mobile/package-lock.json')).toBe(true);
    const pkg=JSON.parse(read('mobile/package.json'));
    const lock=JSON.parse(read('mobile/package-lock.json'));
    expect(lock.lockfileVersion).toBe(3);
    expect(lock.packages[''].name).toBe(pkg.name);
    expect(lock.packages[''].version).toBe(pkg.version);
    expect(lock.packages[''].dependencies).toEqual(pkg.dependencies);
    expect(lock.packages[''].devDependencies).toEqual(pkg.devDependencies);
  });
  it('separates UAT and production EAS runtime environments',()=>{
    const eas=JSON.parse(read('mobile/eas.json'));
    expect(eas.cli.appVersionSource).toBe('remote');
    expect(eas.build.uat.environment).toBe('preview');
    expect(eas.build.uat.channel).toBe('uat');
    expect(eas.build.uat.env.EXPO_PUBLIC_OPSIQO_API_BASE_URL).toBe('https://uat.opsiqo.ca');
    expect(eas.build.production.environment).toBe('production');
    expect(eas.build.production.env.EXPO_PUBLIC_OPSIQO_API_BASE_URL).toBeUndefined();
  });
  it('uses npm ci for final mobile certification',()=>{
    const runner=read('RUN_OPSIQO_H47_1F_VALIDATION.ps1');
    expect(runner).toContain("Frozen mobile package-lock.json is missing");
    expect(runner).toContain('npm ci --no-audit --no-fund');
    expect(runner).toContain('npx expo install --check');
    expect(runner).toContain('npx expo-doctor');
  });
  it('keeps H47.1E historical checks successor-safe',()=>{
    expect(read('tests/mobile-employee-h47-1e.test.ts')).toContain('H47.1E-or-later');
    expect(read('tests/mobile-employee-h47-1e.test.ts')).toContain('[E-Z]');
  });
});
