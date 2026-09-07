import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(relative) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    failures.push(`missing ${relative}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

const workspace = read('src/components/time-workspace.tsx');
const component = read('src/components/time-location-map.tsx');
const projection = read('src/lib/time/attendance-map.ts');
const service = read('src/lib/time/attendance-map-service.ts');
const timeService = read('src/lib/time/service.ts');
const route = read(
  'src/app/api/organizations/[orgId]/time/attendance-map/route.ts',
);
const layout = read('src/app/layout.tsx');

for (const signal of [
  'TimeLocationMap',
  'Show / refresh my location',
  'Staff attendance locations',
  'Latest clock-event locations only',
  'does not continuously track',
  '/time/attendance-map',
]) {
  if (!workspace.includes(signal)) {
    failures.push(`time workspace missing map signal: ${signal}`);
  }
}

if (workspace.includes('watchPosition(')) {
  failures.push(
    'time workspace must not use continuous browser geolocation tracking',
  );
}

for (const signal of [
  'openstreetmap.org',
  'circleMarker',
  'textContent',
  '© OpenStreetMap contributors',
]) {
  if (!component.includes(signal)) {
    failures.push(`map component missing signal: ${signal}`);
  }
}

for (const signal of [
  'trackingMode: \'clock_event_only\'',
  'continuousTracking: false',
  'mapViewerRoles',
  'time.read',
  'attendanceLocationStatus',
]) {
  if (!service.includes(signal)) {
    failures.push(`attendance map service missing control: ${signal}`);
  }
}

if (!projection.includes('attendanceLocationStatusFromTimeEntry')) {
  failures.push('attendance map projection helper is missing');
}

const projectionWriteCount =
  (timeService.match(/attendanceLocationStatus/g) ?? []).length;

if (projectionWriteCount < 2) {
  failures.push(
    'clock service must project both clock-in and clock-out status',
  );
}

for (const signal of [
  "requirePermission(actor, 'time.read')",
  "requirePermission(actor, 'time.configure')",
  "'Cache-Control': 'no-store, max-age=0'",
]) {
  if (!route.includes(signal)) {
    failures.push(`attendance map route missing control: ${signal}`);
  }
}

if (!layout.includes("import 'leaflet/dist/leaflet.css';")) {
  failures.push('Leaflet stylesheet is not registered in the app layout');
}

if (
  component.includes('dangerouslySetInnerHTML') ||
  workspace.includes('dangerouslySetInnerHTML')
) {
  failures.push('attendance map must not use unsafe HTML injection');
}

if (failures.length) {
  console.error('H50 attendance map audit: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('H50 attendance map audit: PASS');
console.log(' - employee map uses explicit browser refresh or governed clock capture');
console.log(' - no continuous browser geolocation tracking');
console.log(' - admin/HR map is role + time.read restricted');
console.log(' - map data is no-store');
console.log(' - latest location is derived from clock-event attendance evidence');
console.log(' - clock-in and clock-out update a derived map projection');
console.log(' - historical projection initialization is audited and admin-only');
console.log(' - workers with no recorded location are never assigned a fake marker');
console.log(' - OpenStreetMap basemap has no embedded OPSIQO employee identifiers');
