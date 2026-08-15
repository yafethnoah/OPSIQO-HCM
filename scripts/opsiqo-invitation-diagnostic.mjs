import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const root = process.cwd();
const route = join(root, "src/app/api/organizations/[orgId]/invitations/route.ts");
const itemRoute = join(root, "src/app/api/organizations/[orgId]/invitations/[invitationId]/route.ts");
const acceptRoute = join(root, "src/app/api/organizations/[orgId]/invitations/accept/route.ts");
const serviceCandidates = [
  "src/lib/membership/service.ts",
  "src/lib/organization/service.ts",
  "src/lib/invitations/service.ts",
  "src/lib/invitation/service.ts",
].map(p => join(root, p)).filter(existsSync);

const allText = [route, itemRoute, acceptRoute, ...serviceCandidates]
  .filter(existsSync)
  .map(p => readFileSync(p, "utf8"))
  .join("\n");

const securitySignals = {
  sha256TokenIndex:
    /sha256|createHash\(['"]sha256['"]\)|invitationTokenIndex/i.test(allText),
  expirationCheck:
    /expir|expiresAt|expired/i.test(allText),
  authenticatedEmailMatch:
    /email.*match|match.*email|authenticated.*email|token\.email|user\.email/i.test(allText),
  resendOrRotate:
    /resend|rotat/i.test(allText),
  revoke:
    /revoke/i.test(allText),
  roleOrPermissionCheck:
    /permission|role.*hierarchy|canInvite|require.*invite/i.test(allText),
};

const emailDelivery = {
  appBaseUrlConfigured: !!process.env.APP_BASE_URL,
  resendConfigured: !!process.env.RESEND_API_KEY,
  fromEmailConfigured: !!process.env.INVITATION_FROM_EMAIL,
};

const network = {
  attempted: false,
  protectedListStatus: null,
  unauthenticatedStatus: null,
  message: "Set OPSIQO_UAT_BASE_URL, OPSIQO_UAT_ORG_ID and optionally OPSIQO_UAT_ID_TOKEN / OPSIQO_UAT_APP_CHECK_TOKEN to run HTTP diagnostics.",
};

const base = String(process.env.OPSIQO_UAT_BASE_URL || "").replace(/\/$/, "");
const orgId = String(process.env.OPSIQO_UAT_ORG_ID || "").trim();
const idToken = String(process.env.OPSIQO_UAT_ID_TOKEN || "").trim();
const appCheck = String(process.env.OPSIQO_UAT_APP_CHECK_TOKEN || "").trim();

if (base && orgId) {
  network.attempted = true;
  const url = `${base}/api/organizations/${encodeURIComponent(orgId)}/invitations`;

  try {
    const unauth = await fetch(url);
    network.unauthenticatedStatus = unauth.status;
  } catch (error) {
    network.message = `Unauthenticated request failed: ${error instanceof Error ? error.message : "request error"}`;
  }

  if (idToken) {
    const headers = { Authorization: `Bearer ${idToken}`, "x-org-id": orgId };
    if (appCheck) headers["X-Firebase-AppCheck"] = appCheck;
    try {
      const response = await fetch(url, { headers });
      network.protectedListStatus = response.status;
    } catch (error) {
      network.message = `Authenticated request failed: ${error instanceof Error ? error.message : "request error"}`;
    }
  }
}

const report = {
  generatedAtUtc: new Date().toISOString(),
  routes: {
    collection: existsSync(route),
    item: existsSync(itemRoute),
    accept: existsSync(acceptRoute),
  },
  serviceCandidates: serviceCandidates.map(p => p.replace(root, "").replaceAll("\\\\", "/")),
  securitySignals,
  emailDelivery,
  network,
  interpretation: {
    invitationSecurity:
      Object.values(securitySignals).every(Boolean)
        ? "SECURITY_SIGNALS_PRESENT"
        : "REVIEW_REQUIRED",
    emailDelivery:
      emailDelivery.resendConfigured && emailDelivery.fromEmailConfigured
        ? "EMAIL_PROVIDER_CONFIGURED"
        : "MANUAL_LINK_OR_EMAIL_CONFIGURATION_REQUIRED",
  },
};

mkdirSync(join(root, "artifacts"), { recursive: true });
const output = join(root, "artifacts", "OPSIQO_INVITATION_DIAGNOSTIC.json");
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.interpretation, null, 2));
console.log(`Evidence: ${output}`);
