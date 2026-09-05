export const ATTENDANCE_CHANGED_EVENT='opsiqo:attendance-changed';
export const ATTENDANCE_REFRESH_INTERVAL_MS=15000;

export type AttendanceChangeReason='clock_in'|'clock_out'|'break_start'|'break_end'|'manual_entry'|'offline_sync';
export type AttendanceChangeDetail={reason:AttendanceChangeReason;occurredAt:string};

export function announceAttendanceChanged(reason:AttendanceChangeReason){
 if(typeof window==='undefined')return;
 const detail:AttendanceChangeDetail={reason,occurredAt:new Date().toISOString()};
 window.dispatchEvent(new CustomEvent<AttendanceChangeDetail>(ATTENDANCE_CHANGED_EVENT,{detail}));
}
