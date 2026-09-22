import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('H51.76 iOS SDK57 + push hardening',()=>{
  it('pins Expo SDK 57 packages to doctor-compatible patch versions',()=>{
    const pkg=JSON.parse(read('mobile/package.json'));
    expect(pkg.dependencies.expo).toBe('57.0.24');
    expect(pkg.dependencies['expo-build-properties']).toBe('57.0.21');
    expect(pkg.dependencies['expo-constants']).toBe('57.0.19');
    expect(pkg.dependencies['expo-image-picker']).toBe('57.0.19');
    expect(pkg.dependencies['expo-location']).toBe('57.0.19');
    expect(pkg.dependencies['expo-notifications']).toBe('57.0.20');
    expect(pkg.dependencies['expo-router']).toBe('57.0.22');
    expect(pkg.dependencies['expo-updates']).toBe('57.0.23');
  });

  it('marks all server-originated attendance pushes as iOS time-sensitive',()=>{
    for(const path of [
      'src/lib/mobile/service.ts',
      'src/lib/time/attendance-admin-service.ts',
      'src/lib/time/attendance-reminder-server.ts',
    ]){
      const source=read(path);
      expect(source).toContain("interruptionLevel:'time-sensitive'");
    }
  });

  it('preserves local iOS time-sensitive alarms and foreground presentation',()=>{
    const app=read('mobile/app.json');
    const local=read('mobile/src/notifications/attendance-reminders.ts');
    const layout=read('mobile/app/_layout.tsx');
    expect(app).toContain('com.apple.developer.usernotifications.time-sensitive');
    expect(local).toContain('"timeSensitive"');
    expect(layout).toContain('Notifications.setNotificationHandler');
    expect(layout).toContain('shouldPlaySound: true');
    expect(layout).toContain('shouldShowBanner: true');
  });

  it('preserves native push token registration and repair/test UX',()=>{
    const device=read('mobile/src/mobile/device.ts');
    const settings=read('mobile/src/components/attendance-alarm-settings.tsx');
    expect(device).toContain('getExpoPushTokenAsync');
    expect(settings).toContain('Repair & test server notifications');
    expect(settings).toContain('Schedule 1-minute timing test');
  });

  it('does not install the web application as a mobile dependency',()=>{
    const pkg=JSON.parse(read('mobile/package.json'));
    const lock=read('mobile/package-lock.json');
    expect(pkg.dependencies?.['opsiqo-hcm-v3-production-evidence']).toBeUndefined();
    expect(lock).not.toContain('opsiqo-hcm-v3-production-evidence');
    expect(lock).not.toContain('"file:.."');
  });
});
