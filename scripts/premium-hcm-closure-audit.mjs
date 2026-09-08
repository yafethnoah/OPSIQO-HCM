import fs from'node:fs';const required=[
'src/app/api/organizations/[orgId]/employees/route.ts','src/app/api/organizations/[orgId]/positions/route.ts',
'src/app/api/organizations/[orgId]/workforce-planning/dashboard/route.ts','src/domain/compensation.ts',
'src/app/api/organizations/[orgId]/learning/skills/route.ts','src/app/api/organizations/[orgId]/succession/critical-positions/route.ts',
'src/domain/benefits.ts','src/lib/benefits/service.ts','src/app/benefits/page.tsx',
'src/domain/payroll.ts','src/lib/payroll/provider-adapter.ts','src/lib/payroll/canada-2026.ts','src/app/payroll/page.tsx',
'src/app/api/organizations/[orgId]/time/schedule/route.ts','src/app/api/organizations/[orgId]/identity/providers/route.ts',
'src/app/api/organizations/[orgId]/integrations/connectors/route.ts','src/app/api/organizations/[orgId]/documents/route.ts',
'src/domain/esign.ts','src/app/esign/page.tsx','src/app/api/organizations/[orgId]/expenses/route.ts',
'src/app/api/organizations/[orgId]/security-operations/dashboard/route.ts','src/domain/ai-intelligence.ts',
'src/app/api/organizations/[orgId]/people-analytics/dashboard/route.ts','src/app/api/organizations/[orgId]/audit/route.ts',
'src/app/api/organizations/[orgId]/workflows/route.ts','src/lib/premium-hcm/registry.ts','scripts/release-gate.ts',
'scripts/security-static-scan.ts','.github/workflows/production-evidence-closure.yml'];
const missing=required.filter(x=>!fs.existsSync(x));if(missing.length){console.error('Premium HCM closure missing source surfaces:');for(const x of missing)console.error(' -',x);process.exit(1)}
console.log(`Premium HCM closure source-surface audit: PASS (${required.length}/${required.length})`);
console.log('Native Canadian payroll implementation remains independently reference-validation gated by design.');
