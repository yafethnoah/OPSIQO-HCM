# OPSIQO H47.1F — Mobile Reproducible Build Baseline

H47.1F converts H47.1E's temporary dependency proof into a frozen mobile dependency graph and prepares deterministic EAS UAT/production build profiles.

## Changes
- Mobile package version 0.2.5; app marketing version 0.1.2.
- Frozen `mobile/package-lock.json` is mandatory in the final candidate.
- Final mobile certification uses `npm ci`, never mutable `npm install`.
- EAS `appVersionSource` is `remote`; UAT and production build identifiers auto-increment.
- `uat` build profile uses internal distribution, `uat` channel, and EAS `preview` environment.
- UAT API base is explicitly `https://uat.opsiqo.ca`.
- Production profile uses the EAS `production` environment and deliberately does not hard-code a production API URL.
- Public Firebase client settings remain environment-managed; no private secrets are committed.

## Why the bootstrap kit exists
The ChatGPT packaging runtime cannot resolve npm registry dependencies reliably. The already-certified Windows environment can. Therefore the bootstrap kit contains a one-command lock-freeze script that creates the lock on Windows, reruns the complete certification with `npm ci`, updates the canonical manifest, and emits the final frozen ZIP + SHA-256.
