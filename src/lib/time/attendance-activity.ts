export type AttendanceActivityRangeInput={
  from?:string;
  to?:string;
  timeZone?:string;
};

export type AttendanceActivityRange={
  from:string;
  to:string;
  timeZone:string;
  startIso:string;
  endExclusiveIso:string;
  mode:'today'|'history';
};

const DATE_KEY=/^\d{4}-\d{2}-\d{2}$/;

function validDateKey(value:string){
  if(!DATE_KEY.test(value))return false;
  const d=new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}

function validateTimeZone(timeZone:string){
  try{
    new Intl.DateTimeFormat('en-CA',{timeZone}).format(new Date());
    return timeZone;
  }catch{
    throw new Error('invalid_time_zone');
  }
}

function partsInZone(iso:string,timeZone:string){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone,
    year:'numeric',
    month:'2-digit',
    day:'2-digit',
    hour:'2-digit',
    minute:'2-digit',
    second:'2-digit',
    hourCycle:'h23',
  }).formatToParts(new Date(iso));
  const get=(type:string)=>Number(parts.find(p=>p.type===type)?.value||0);
  return{
    year:get('year'),
    month:get('month'),
    day:get('day'),
    hour:get('hour'),
    minute:get('minute'),
    second:get('second'),
  };
}

export function attendanceLocalDate(iso:string,timeZone:string){
  const zone=validateTimeZone(timeZone);
  const p=partsInZone(iso,zone);
  return `${String(p.year).padStart(4,'0')}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
}

export function addAttendanceDays(date:string,days:number){
  if(!validDateKey(date))throw new Error('invalid_date');
  const d=new Date(`${date}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}

export function attendanceZonedDayStart(date:string,timeZone:string){
  if(!validDateKey(date))throw new Error('invalid_date');
  const zone=validateTimeZone(timeZone);
  const [year,month,day]=date.split('-').map(Number);
  const desired=Date.UTC(year!,month!-1,day!,0,0,0);
  let candidate=desired;

  // Iteratively solve "local midnight in zone" without relying on server locale.
  for(let i=0;i<4;i++){
    const p=partsInZone(new Date(candidate).toISOString(),zone);
    const represented=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
    const delta=represented-desired;
    if(delta===0)break;
    candidate-=delta;
  }

  return new Date(candidate).toISOString();
}

export function normalizeAttendanceActivityRange(
  input:AttendanceActivityRangeInput={},
  currentIso=new Date().toISOString(),
):AttendanceActivityRange{
  const timeZone=validateTimeZone(String(input.timeZone||'UTC').trim()||'UTC');
  const today=attendanceLocalDate(currentIso,timeZone);
  const from=String(input.from||today).trim();
  const to=String(input.to||from).trim();

  if(!validDateKey(from)||!validDateKey(to))throw new Error('invalid_date');
  if(from>to)throw new Error('invalid_date_order');

  const startDays=Date.parse(`${from}T00:00:00.000Z`);
  const endDays=Date.parse(`${to}T00:00:00.000Z`);
  const spanDays=Math.round((endDays-startDays)/86400000)+1;
  if(spanDays>366)throw new Error('range_too_large');

  const startIso=attendanceZonedDayStart(from,timeZone);
  const endExclusiveIso=attendanceZonedDayStart(addAttendanceDays(to,1),timeZone);

  return{
    from,
    to,
    timeZone,
    startIso,
    endExclusiveIso,
    mode:from===today&&to===today?'today':'history',
  };
}
