# OPSIQO H51.71 — Time & Leave UAT Closure

Parent: H51.70 `d2007252c27edf280b4c9c148038e65277f65303`

This release closes issues observed in the H51.70 UAT recording.

## Observed UAT issues

1. The selected organization had no enabled leave type, so the required leave-type
   selector rendered as an unexplained blank control.
2. The administrative leave card compressed its heading and helper text together.
3. Administrative reasons shorter than the governed ten-character minimum relied
   on server validation. When the user had scrolled down, the global page error
   was outside the visible viewport.
4. Attendance-broadcast success or failure was also reported through the global
   page banner, making feedback easy to miss while using the lower-page action.

## H51.71 behavior

- Leave selectors always show an explicit placeholder.
- If no enabled leave types exist, leave submission is disabled and OPSIQO
  explains that leave setup is required.
- Authorized HR users get a one-click scroll to the existing governed Leave Type
  configuration; OPSIQO does not invent jurisdiction-specific leave entitlements.
- Admin leave card spacing is corrected.
- Admin leave reason and broadcast reason require at least ten characters in the
  browser and remain enforced on the server.
- Admin leave success/error is displayed beside the leave form.
- Attendance-broadcast success/error is displayed beside the broadcast form.
- H51.70 attendance broadcast, admin leave-on-behalf, self-path block and mobile
  alarm reliability controls remain unchanged.
