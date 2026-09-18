# OPSIQO H51.60 â€” Pulse Navigation + Reminder UX Repair

Parent: H51.59 9b876af6077e44f6728b23d9cad6f1eac731b4b2

Fixes:
- Replaces corrupted/mojibake tab glyphs with deterministic SVG icons.
- Removes the duplicate Home reminder scheduler so the authenticated global reminder coordinator is authoritative.
- Adds bottom content clearance so Clock Reminders and Clock Alarm controls are not hidden behind the tab bar.
- Makes the no-published-shift state explicit and provides a direct path to Time > Clock alarms.
- Modernizes the historical H47.1D tab-icon regression so it remains successor-safe for SVG navigation icons.
- Preserves H51.59 notification scheduling, persistent session, attendance, and foreground-only location behavior.
- Does not change Expo/native dependency versions. Current Expo SDK 57 patch drift remains a separate native-build concern.