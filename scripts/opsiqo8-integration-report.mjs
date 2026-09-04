import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const output = process.argv.includes("--output")
  ? process.argv[process.argv.indexOf("--output") + 1]
  : join(root, "artifacts", "opsiqo8-integration-report.json");

const expected = [
  ["7.1_product_analytics", "src/lib/product-analytics"],
  ["7.2_ai_evals", "src/lib/ai-evals"],
  ["7.3_ux_performance", "src/lib/ux-performance"],
  ["7.4_experimentation", "src/lib/experimentation"],
  ["8.1_orchestrator", "src/lib/orchestrator"],
  ["8.2_operations_cockpit", "src/lib/operations-cockpit"],
  ["8.3_workforce_intelligence", "src/lib/workforce-intelligence"],
  ["8.4_compliance_evidence", "src/lib/compliance-evidence"],
];

const placeholders = [
  /\bTODO\b/g,
  /\bFIXME\b/g,
  /\bIMPLEMENT_ME\b/g,
  /UNBOUND_SERVICE/g,
  /Bind to (the )?current/gi,
  /Implement against (the )?current/gi,
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", ".firebase", "coverage"].includes(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name) && st.size < 2_000_000) out.push(p);
  }
  return out;
}

const sourceFiles = walk(join(root, "src"));
const placeholderFindings = [];
for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  for (const pattern of placeholders) {
    const matches = text.match(pattern);
    if (matches?.length) {
      placeholderFindings.push({
        path: relative(root, file).replaceAll("\\\\", "/"),
        pattern: pattern.source,
        count: matches.length,
      });
    }
  }
}

const report = {
  generatedAtUtc: new Date().toISOString(),
  foundations: expected.map(([id, path]) => ({ id, path, present: existsSync(join(root, path)) })),
  projectSignals: {
    permissions: existsSync(join(root, "src/lib/auth/permissions.ts")),
    session: existsSync(join(root, "src/lib/auth/session.ts")),
    onboarding: existsSync(join(root, "src/lib/onboarding/service.ts")),
    workflow: existsSync(join(root, "src/lib/workflow/service.ts")) || existsSync(join(root, "src/lib/workflows/service.ts")),
    invitationsRoute: existsSync(join(root, "src/app/api/organizations/[orgId]/invitations/route.ts")),
    invitationAcceptRoute: existsSync(join(root, "src/app/api/organizations/[orgId]/invitations/accept/route.ts")),
    learning: existsSync(join(root, "src/lib/learning/service.ts")),
    compliance: existsSync(join(root, "src/lib/compliance/service.ts")),
    peopleAnalytics: existsSync(join(root, "src/lib/people-analytics/service.ts")),
  },
  placeholderFindings,
  status:
    expected.every(([, p]) => existsSync(join(root, p))) &&
    placeholderFindings.filter(x => x.path.startsWith("src/lib/opsiqo8/")).length === 0
      ? "FOUNDATIONS_PRESENT_REVIEW_INTEGRATIONS"
      : "REPAIR_REQUIRED",
};

mkdirSync(resolve(output, ".."), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(report.status);
console.log(`Integration report: ${output}`);
