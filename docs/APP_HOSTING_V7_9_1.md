# App Hosting V7.9.1

`apphosting.yaml` is source-controlled. Secret references must exist in Google Cloud Secret Manager and the App Hosting build/runtime identities must be granted access before rollout.

Backend certification values:
- Firebase project: `opsiqo-hcm-prod-2026`
- Backend: `opsiqo-hcm-prod`
- Region: `us-east5`
- Web App ID: `1:303296177079:web:1f1048d8669c6e41323e32`
- Required runtime setting: `nodejs22`
- Required Automatic Base Image Updates: enabled

Do not set a production tenant-specific `OPSIQO_JOB_ORG_ID` until the production tenant is formally approved. The production scheduler uses `scope: all`.
