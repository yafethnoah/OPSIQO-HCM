# H47.1F EAS UAT Setup

After the Windows-frozen H47.1F package passes certification:

1. Work only inside `mobile`.
2. Install or update EAS CLI outside the source tree as needed.
3. Authenticate with your Expo account using `eas login` or a protected `EXPO_TOKEN` in CI. Do not paste tokens into screenshots or source files.
4. Run `eas init` once to create/link the OPSIQO Employee EAS project. This writes `extra.eas.projectId` to the app config.
5. Configure the EAS **preview** environment with the UAT Firebase public Web API key and EAS project ID. The UAT API base is already fixed to `https://uat.opsiqo.ca` in the `uat` build profile.
6. Build Android UAT with the `uat` profile.
7. Do not run the `production` profile until UAT physical-device acceptance is complete.

The production profile deliberately does not embed a production API URL in source. Its public runtime values must come from the EAS production environment.
