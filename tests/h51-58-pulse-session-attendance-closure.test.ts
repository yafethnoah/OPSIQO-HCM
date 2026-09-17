import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('H51.58 Pulse persistent session + attendance closure', () => {
  it('restores the dedicated mobile self-service actor without changing web actor policy', () => {
    const auth = read('src/lib/auth/session.ts');

    expect(auth).toContain('export async function actorFromRequest');
    expect(auth).toContain('enforcePlatformIdentityPolicy(identity,role,platform)');
    expect(auth).toContain('sessionTimeoutMinutes');

    const start = auth.indexOf('export async function actorFromMobileSelfServiceRequest');
    const end = auth.indexOf('const TEAM_PERMISSION_FALLBACK', start);
    const mobile = auth.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(mobile).toContain('permissionsForRole(\'employee\')');
    expect(mobile).toContain('resolveMobileWorkerId');
    expect(mobile).not.toContain('sessionTimeoutMinutes');
    expect(mobile).not.toContain('enforcePlatformIdentityPolicy(');
    expect(mobile).not.toContain('enforcePrivilegedIdentityPolicy(');
  });

  it('uses structured Firebase bearer-token 401 handling for one-time mobile refresh', () => {
    const server = read('src/lib/auth/session.ts');
    const client = read('mobile/src/api/client.ts');

    expect(server).toContain('verifyFirebaseBearerToken');
    expect(server).toContain("'invalid_auth_token'");
    expect(client).toContain('forceIdTokenRefresh');
    expect(client).toContain('attempt.response.status === 401');
  });

  it('restores the mobile-only bootstrap and attendance routes', () => {
    const bootstrap = read('src/app/api/organizations/[orgId]/mobile/bootstrap/route.ts');
    const clock = read('src/app/api/organizations/[orgId]/mobile/time/clock/route.ts');
    const breaks = read('src/app/api/organizations/[orgId]/mobile/time/breaks/route.ts');

    expect(bootstrap).toContain('actorFromMobileSelfServiceRequest');
    expect(clock).toContain('actorFromMobileSelfServiceRequest');
    expect(clock).toContain("requirePermission(actor, 'time.clock')");
    expect(breaks).toContain('actorFromMobileSelfServiceRequest');
    expect(breaks).toContain('recordBreak');
  });

  it('keeps the web clock route separate and governed', () => {
    const webClock = read('src/app/api/organizations/[orgId]/time/clock/route.ts');
    expect(webClock).toContain('actorFromRequest');
    expect(webClock).not.toContain('actorFromMobileSelfServiceRequest');
  });

  it('restores certified Pulse 1.0.2 persistent-session source and mobile endpoint contract', () => {
    const app = JSON.parse(read('mobile/app.json'));
    const session = read('mobile/src/auth/session.ts');
    const hero = read('mobile/src/components/attendance-hero.tsx');
    const offline = read('mobile/src/mobile/offline-attendance.ts');

    expect(app.expo.version).toBe('1.0.2');
    expect(app.expo.extra.h50MobileSelfServiceTrack)
      .toBe('h50.2b-no-mfa-visible-attendance-fast-bootstrap');
    expect(session).toContain(
      'MOBILE_SESSION_POLICY = "persistent_until_sign_out_or_revocation"',
    );
    expect(hero).toContain('/mobile/time/clock');
    expect(hero).toContain('/mobile/time/breaks');
    expect(offline).toContain('/mobile/time/clock');
  });

  it('keeps last-good mobile bootstrap data visible during refresh', () => {
    const hook = read('mobile/src/hooks/use-bootstrap.ts');
    expect(hook).toContain('const bootstrapCache = new Map');
    expect(hook).toContain('const bootstrapRequests = new Map');
    expect(hook).toContain('Never blank a healthy screen');
    expect(hook).toContain('setData(lastGood)');
  });

  it('isolates self attendance and requires a resolved worker for clock capability', () => {
    const service = read('src/lib/mobile/service.ts');
    expect(service).toContain('function selfAttendance(');
    expect(service).toContain("clock: Boolean(workerId && can('time.clock'))");
  });

  it('contains every H51.58 mobile self-service route', () => {
    for (const path of [
      'src/app/api/organizations/[orgId]/mobile/time/clock/route.ts',
      'src/app/api/organizations/[orgId]/mobile/time/breaks/route.ts',
      'src/app/api/organizations/[orgId]/mobile/leave/requests/route.ts',
      'src/app/api/organizations/[orgId]/mobile/expenses/route.ts',
      'src/app/api/organizations/[orgId]/mobile/expenses/[claimId]/route.ts',
    ]) {
      expect(existsSync(path), path).toBe(true);
    }
  });
});