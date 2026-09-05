import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('H50.1I OPSIQO Pulse branding and App Check', () => {
  it('uses the approved Pulse logo and launcher icon', () => {
    const signIn = read('mobile/app/sign-in.tsx');
    const app = JSON.parse(read('mobile/app.json'));

    expect(signIn).toContain('opsiqo-pulse-logo.png');
    expect(signIn).not.toContain('<Text style={s.mark}>O</Text>');
    expect(app.expo.name).toBe('OPSIQO Pulse');
    expect(app.expo.icon).toBe('./assets/opsiqo-pulse-icon.png');
    const [major, minor, patch] = String(app.expo.version).split('.').map(Number);
    expect([major, minor]).toEqual([0, 1]);
    expect(patch).toBeGreaterThanOrEqual(3);

    expect(
      fs.existsSync(path.join(root, 'mobile/assets/opsiqo-pulse-logo.png'))
    ).toBe(true);

    expect(
      fs.existsSync(path.join(root, 'mobile/assets/opsiqo-pulse-icon.png'))
    ).toBe(true);
  });

  it('uses the RNFirebase modular App Check API with App Attest', () => {
    const app = JSON.parse(read('mobile/app.json'));
    const appConfig = read('mobile/app.config.js');
    const appCheck = read('mobile/src/security/app-check.ts');

    expect(
      app.expo.ios.entitlements[
        'com.apple.developer.devicecheck.appattest-environment'
      ]
    ).toBe('production');

    expect(appConfig).toContain('module.exports = ({ config }) =>');
    expect(appConfig).toContain('...config');
    expect(appConfig).toContain('...config.ios');
    expect(appConfig).toContain('GOOGLE_SERVICES_PLIST');
    expect(appConfig).not.toContain("require('./app.json')");
    expect(appCheck).toContain('ReactNativeFirebaseAppCheckProvider');
    expect(appCheck).toContain('initializeAppCheck');
    expect(appCheck).toContain('getToken');
    expect(appCheck).toContain("provider: 'appAttest'");
    expect(appCheck).not.toContain(
      "import appCheck from '@react-native-firebase/app-check'"
    );
    expect(appCheck).not.toContain("provider: 'debug'");
    expect(appCheck).not.toMatch(/console\.(log|info|debug)/);
  });

  it('sends App Check on OPSIQO API and Firebase Auth requests', () => {
    const api = read('mobile/src/api/client.ts');
    const session = read('mobile/src/auth/session.ts');

    expect(api).toContain("'X-Firebase-AppCheck'");
    expect(session.match(/'X-Firebase-AppCheck'/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('pins the vetted React Native Firebase pair', () => {
    const pkg = JSON.parse(read('mobile/package.json'));

    expect(pkg.dependencies['@react-native-firebase/app']).toBe('26.3.3');
    expect(pkg.dependencies['@react-native-firebase/app-check']).toBe('26.3.3');
  });
});