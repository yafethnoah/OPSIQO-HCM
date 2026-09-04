# START HERE — OPSIQO H47

H47 adds the first native OPSIQO Employee app while preserving the H46 backend and governance model.

## Windows validation
Run `RUN_OPSIQO_H47_VALIDATION.ps1` from the extracted H47 root.

## Mobile configuration
Copy `mobile/.env.example` to `mobile/.env.local` and provide only public client configuration:
- `EXPO_PUBLIC_OPSIQO_API_BASE_URL=https://uat.opsiqo.ca`
- Firebase Web API key used for Firebase Authentication REST.
- EAS project ID when push notification testing begins.

Never put Firebase Admin credentials, service account JSON, private keys, signing certificates, or production secrets in the mobile environment file.

## UAT sequence
1. Sign in with a UAT employee account.
2. Select the UAT organization.
3. Confirm Home reflects the same worker record as the web Employee Portal.
4. Test Clock In / Break / Clock Out on a physical device.
5. Confirm location is requested only when a clock action is initiated.
6. Submit leave and confirm it appears in web Time & Leave.
7. Submit an expense receipt and confirm the approval workflow appears in web OPSIQO.
8. Enable push notifications explicitly from Me and verify device registration.
9. Sign out and confirm secure session data is cleared.
