import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { workLocationSchema, expenseClaimSchema } from '@/lib/time/frontline-schemas';
import { timePolicySchema } from '@/lib/time/schemas';

const frontline=()=>readFileSync('src/lib/time/frontline-service.ts','utf8');
const time=()=>readFileSync('src/lib/time/service.ts','utf8');
const ui=()=>readFileSync('src/components/frontline-operations-panel.tsx','utf8');
const offline=()=>readFileSync('src/lib/time/offline-attendance.ts','utf8');

describe('H46 smart time attendance and expense intelligence',()=>{
  it('validates bounded geofences and monitoring-policy prerequisites',()=>{
    expect(()=>workLocationSchema.parse({code:'HQ',name:'Head Office',latitude:43.6,longitude:-79.6,radiusMeters:10,timezone:'America/Toronto',enabled:true,requireDeviceVerification:false,allowOfflineClock:false,requirePhotoProof:false})).toThrow();
    const base={name:'Ontario standard',jurisdiction:'ON',timezone:'America/Toronto',weekStartsOn:1,standardDailyHours:8,regularWeeklyHours:40,overtimeThresholdHours:44,overtimeMultiplier:1.5,maxDailyHours:13,maxWeeklyHours:60,minDailyRestHours:8,minBetweenShiftsHours:11,weeklyRestHours:24,mealBreakAfterHours:5,mealBreakMinutes:30,roundingMinutes:1,complianceMode:'advisory' as const,captureGeolocation:true,geofenceMode:'advisory' as const,requireDeviceVerification:false,allowOfflineClock:false,requirePhotoProof:false,enabled:true};
    expect(()=>timePolicySchema.parse(base)).toThrow(/monitoring/i);
    expect(timePolicySchema.parse({...base,electronicMonitoringPolicyId:'policy-1'}).geofenceMode).toBe('advisory');
  });

  it('keeps offline attendance encrypted and idempotent',()=>{
    const o=offline(),t=time();
    expect(o).toContain("name:'AES-GCM'");
    expect(o).toContain("false,['encrypt','decrypt']");
    expect(o).toContain('offlineEventId');
    expect(t).toContain('attendanceOfflineEventIndex');
    expect(t).toContain('offline_event_duplicate');
    expect(t).toContain("'offline_sync':'web_clock'");
  });

  it('supports explicit breaks and prevents clock-out while on break',()=>{
    const f=frontline(),t=time();
    expect(f).toContain("action:'time.break.start'");
    expect(f).toContain("action:'time.break.end'");
    expect(f).toContain('newBreakMinutes');
    expect(t).toContain("before.breakState==='on_break'");
  });

  it('schedules human-approved shifts with overlap leave and overtime safeguards',()=>{
    const f=frontline(),u=ui();
    expect(f).toContain('shift_overlap');
    expect(f).toContain('shift_leave_conflict');
    expect(f).toContain('scheduledByWeek');
    expect(f).toContain('overtimeThresholdHours');
    expect(u).toContain('does not assign or cancel shifts autonomously');
    expect(u).toContain("time.manage.team");
  });

  it('records privacy-bounded geofence evidence and integrity risk signals',()=>{
    const f=frontline(),u=ui();
    expect(f).toContain('haversineMeters');
    expect(f).toContain('impossible_travel_speed');
    expect(f).toContain('outside_geofence');
    expect(f).toContain('device_verification_required');
    expect(u).toContain('does not continuously track employees outside attendance events');
  });

  it('stores attendance photos as evidence without facial or personality analysis',()=>{
    const f=frontline(),u=ui();
    expect(f).toContain("cacheControl:'private,max-age=0,no-store'");
    expect(f).toContain('attendance_photo_required');
    expect(u).toContain('not analyzed for facial characteristics, emotion or personality');
  });

  it('validates expense values and preserves independent approvals',()=>{
    expect(expenseClaimSchema.parse({expenseDate:'2026-09-03',category:'Travel',currency:'cad',amount:50,businessPurpose:'Client meeting',receiptRequired:true}).currency).toBe('CAD');
    const f=frontline();
    expect(f).toContain('duplicate_receipt');
    expect(f).toContain('Self-approval of expenses is not permitted');
    expect(f).toContain('Independent finance approval is required');
    expect(f).toContain("status:'finance_approved'");
  });

  it('provides an audited expense CSV export and API-only client workflow',()=>{
    const f=frontline(),u=ui(),route=readFileSync('src/app/api/organizations/[orgId]/expenses/export/route.ts','utf8');
    expect(f).toContain('export async function exportExpenseCsv');
    expect(f).toContain("action:'expense.claim.export'");
    expect(route).toContain("requirePermission(actor,'expense.manage')");
    expect(u).toContain('Export last 90 days CSV');
    expect(u).not.toContain('firebase/firestore');
  });
});
