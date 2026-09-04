# OPSIQO H47.1E — Expo Doctor Workspace Isolation

H47.1E fixes the four issues exposed by the H47.1D Windows Expo Doctor gate without changing HR business logic.

## Repairs

- Removes the obsolete root `newArchEnabled` field from the Expo SDK 57 config. SDK 55+ always uses the New Architecture.
- Adds the required `expo-linking` dependency for Expo Router (`~57.0.9`).
- Runs mobile dependency installation and Expo Doctor in a temporary isolated mobile project outside the Next.js root dependency tree, preventing the root React 19.2.8 installation from being misclassified as a duplicate of the mobile Expo SDK 57 React 19.2.3 installation.
- Allows the isolated install to create a temporary `package-lock.json` so Expo Doctor's lock-file check is satisfied.
- Deletes the temporary certification workspace after validation, leaving the certified source tree unchanged.
- Keeps `expo install --check`, strict mobile TypeScript, Expo Doctor, full web tests, Firestore Rules, and the production build mandatory.
- Makes H47.1D historical identity/package assertions successor-safe.

## Security and governance

No recruiting, ATS, interview, attendance, expense, leave, employee-data, Firestore authorization, or AI-governance business logic is changed.
