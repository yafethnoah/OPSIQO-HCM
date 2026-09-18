# OPSIQO H51.61 - Pulse Encoding Guard

Parent: H51.60 f85ad1557897f1ad2ba510b3891a35baec8da1c3

Purpose:
- Removes remaining mojibake from Home and Time UI strings.
- Uses ASCII-safe separators for Windows/PowerShell portability.
- Adds a repository-level mobile source encoding audit for common mojibake markers.
- Preserves H51.60 SVG navigation, reminder coordinator, attendance, and session behavior.
- Does not change Expo/native dependency versions.