import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { mobileDeviceSchema } from '@/lib/mobile/schemas';
const read=(p:string)=>readFileSync(p,'utf8');
describe('H47 OPSIQO Employee Mobile',()=>{
  it('validates mobile device registration inputs',()=>{
    expect(mobileDeviceSchema.parse({platform:'ios',installationId:'install-1234567890',biometricCapable:true}).platform).toBe('ios');
    expect(()=>mobileDeviceSchema.parse({platform:'desktop',installationId:'short'})).toThrow();
  });
  it('keeps native client behind OPSIQO APIs',()=>{
    const api=read('mobile/src/api/client.ts');
    expect(api).toContain("Authorization',`Bearer ${token}`");
    expect(api).toContain("x-org-id");
    expect(api).not.toContain('firebase/firestore');
  });
  it('stores authentication state using native secure storage',()=>{
    const auth=read('mobile/src/auth/session.ts');
    expect(auth).toContain('expo-secure-store');
    expect(auth).toContain('AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY');
  });
  it('does not continuously track location',()=>{
    const time=read('mobile/app/(app)/time.tsx');
    expect(time).toContain('getCurrentPositionAsync');
    expect(time).not.toContain('watchPositionAsync');
    expect(time).not.toContain('startLocationUpdatesAsync');
  });
  it('uses local biometric verification without transmitting biometric templates',()=>{
    const device=read('mobile/src/mobile/device.ts');
    const time=read('mobile/app/(app)/time.tsx');
    expect(device).toContain('authenticateAsync');
    expect(time).toContain("native_biometric");
    expect(`${device}\n${time}`.toLowerCase()).not.toContain('biometric template');
  });
  it('supports employee leave and expense request workflows',()=>{
    const requests=read('mobile/app/(app)/requests.tsx');
    expect(requests).toContain('/leave/requests');
    expect(requests).toContain('/expenses');
    expect(requests).toContain("action:'submit'");
    expect(requests).toContain("form.append('receipts'");
  });
  it('hashes mobile installation identifiers on the server',()=>{
    const service=read('src/lib/mobile/service.ts');
    expect(service).toContain("createHash('sha256').update(installationId)");
    expect(service).not.toContain('installationId: input.installationId');
  });
});
