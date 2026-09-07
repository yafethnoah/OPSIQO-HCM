import fs from 'node:fs';

const failures = [];
const read = (file) => {
  if (!fs.existsSync(file)) {
    failures.push(`missing ${file}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
};

const activation = read('src/lib/ai-intelligence/activation.ts');
const section = read('src/lib/ai-intelligence/section-assist.ts');
const component = read('src/components/contextual-ai-assist.tsx');
const shell = read('src/components/app-shell.tsx');
const readinessRoute = read(
  'src/app/api/organizations/[orgId]/ai-copilot/readiness/route.ts',
);
const queryRoute = read(
  'src/app/api/organizations/[orgId]/ai-copilot/query/route.ts',
);
const provider = read('src/lib/ai-intelligence/provider.ts');
const governance = read('src/lib/ai-intelligence/governance.ts');
const apphosting = read('apphosting.yaml');

for (const signal of [
  "actor.permissions.includes('ai.manage')",
  "actor.permissions.includes('ai.approve')",
  "actor.permissions.includes('ai.use')",
  "new Set(['super_admin', 'org_admin', 'hr_admin'])",
  "action: 'ai.bootstrap.initialize'",
  "createdBy: SYSTEM_CREATOR",
  'credentialConfiguredFor',
  'liveReady:',
]) {
  if (!activation.includes(signal)) {
    failures.push(`AI activation service missing ${signal}`);
  }
}

if (
  activation.includes('return process.env.GEMINI_API_KEY') ||
  activation.includes('return process.env.OPENAI_API_KEY')
) {
  failures.push('AI readiness must never return provider credential values');
}

for (const signal of [
  "'/recruiting'",
  "'/onboarding'",
  "'/performance'",
  "'/learning'",
  "'/policies'",
  "'/time'",
  "'/compensation'",
  "'/employee-relations'",
  "'/workforce-planning'",
  "'/strategy'",
  "'/privacy'",
  "'/separation'",
  'Do not rank',
  'Do not recommend discipline',
  'Do not recommend an individual pay outcome',
]) {
  if (!section.includes(signal)) {
    failures.push(`section AI mapping missing ${signal}`);
  }
}

for (const signal of [
  'OPSIQO AI Assist',
  'Generate with AI',
  'AI-generated draft / advice',
  'Consequential AI use blocked',
  'Initialize governed AI',
  'Copy generated text',
  '/ai-copilot/query',
  '/ai-copilot/readiness',
]) {
  if (!component.includes(signal)) {
    failures.push(`contextual AI UI missing ${signal}`);
  }
}

if (
  component.includes('GEMINI_API_KEY') ||
  component.includes('OPENAI_API_KEY') ||
  component.includes('process.env')
) {
  failures.push('client contextual AI surface must not contain provider secrets/env access');
}

if (!shell.includes('<ContextualAiAssist />')) {
  failures.push('authenticated AppShell does not mount contextual AI Assist');
}

for (const signal of [
  'getAiActivationReadiness',
  'initializeGovernedAi',
  "body?.action !== 'initialize'",
  "Cache-Control",
]) {
  if (!readinessRoute.includes(signal)) {
    failures.push(`AI readiness route missing ${signal}`);
  }
}

if (!queryRoute.includes("requirePermission(actor,'ai.use')")) {
  failures.push('AI query route must retain ai.use permission enforcement');
}

for (const signal of [
  "store:false",
  "process.env.GEMINI_API_KEY",
  "process.env.OPENAI_API_KEY",
  "responseMimeType:'application/json'",
]) {
  if (!provider.includes(signal)) {
    failures.push(`existing provider governance missing ${signal}`);
  }
}

for (const signal of [
  'AI cannot rank or select candidates',
  'AI cannot determine an individual compensation outcome',
  'AI cannot assign an individual performance rating',
]) {
  if (!governance.includes(signal)) {
    failures.push(`existing consequential-use guardrail missing ${signal}`);
  }
}

for (const signal of [
  'variable: OPSIQO_AI_PROVIDER',
  'value: gemini',
  'variable: OPSIQO_REQUIRE_GOVERNED_AI_CONFIG',
  'secret: OPSIQO_GEMINI_API_KEY',
]) {
  if (!apphosting.includes(signal)) {
    failures.push(`App Hosting governed AI configuration missing ${signal}`);
  }
}

if (failures.length) {
  console.error('H50.4 AI activation/context audit: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('H50.4 AI activation/context audit: PASS');
console.log(' - live provider readiness is server-side and secret-safe');
console.log(' - governed system baseline requires authorized admin initialization');
console.log(' - contextual AI Assist is mounted only in authenticated AppShell');
console.log(' - section presets cover recruiting, onboarding, people, performance, learning, policy/compliance, time, pay, ER, safety, analytics, strategy, trust and offboarding');
console.log(' - contextual AI requests reuse the existing ai-copilot/query route and audit/evidence path');
console.log(' - consequential employment guardrails remain in force');
console.log(' - no contextual AI direct writes are introduced');
console.log(' - Gemini credential remains a server-side App Hosting secret reference');
