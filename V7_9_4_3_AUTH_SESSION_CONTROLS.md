# OPSIQO HCM 8.5 — V7.9.4.3 Auth Session Controls Closure

## Purpose
Close the UAT security/usability gap where an authenticated identity could become trapped without a visible sign-out or account-switch control, particularly when no organization membership exists, platform administration is MFA-blocked, an invitation is open, or MFA enrollment is in progress.

## Exact baseline
`9602e8756b25effd468adc4a4227d663f346c2ba`

## Changes
- Adds global authenticated **Sign out** control.
- Adds **Sign out / use a different account** on `/setup`.
- Adds the same control during `/mfa/setup`.
- Adds the same control to the invitation acceptance flow.
- Clears `opsiqo.activeOrgId` before Firebase sign-out.
- Clears stale active-organization browser state when the signed-in identity has no active memberships.
- Updates the shared environment-neutral product release marker to `8.5-v7.9.4.3`.
- Adds regression coverage.

## Guardrails
- MFA remains required for platform administration.
- First-organization bootstrap remains disabled unless separately opened through the existing controlled server setting.
- No Firebase deployment is performed by this builder.
- No DNS, App Check, Secret Manager, UAT traffic, or production configuration is changed by the installer.
- No password, TOTP secret, OTP, invitation token, API key, or secret value is emitted.

## V2 installer note
The first V7.9.4.3 installer used the PowerShell 7-only `utf8NoBOM` encoding enum and stopped on Windows PowerShell 5.1. The V2 builder removes PowerShell text mutation entirely and uses the repository's Node.js runtime for deterministic UTF-8 source patching. It also safely recovers the known partial V1 state before applying the patch.
