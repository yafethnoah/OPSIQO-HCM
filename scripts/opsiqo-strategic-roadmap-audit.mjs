import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'src/lib/strategic/types.ts',
  'src/lib/strategic/enterprise-object-graph.ts',
  'src/lib/strategic/knowledge-graph.ts',
  'src/lib/strategic/agent-os.ts',
  'src/lib/strategic/digital-twin.ts',
  'src/lib/strategic/compliance-intelligence.ts',
  'src/lib/strategic/phase-registry.ts',
  'src/lib/strategic/benchmark-suite.ts',
  'src/lib/strategic/index.ts',
  'tests/strategic-roadmap.test.ts',
];

const findings = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) findings.push(`missing:${file}`);
}

if (existsSync('src/lib/strategic/phase-registry.ts')) {
  const source = readFileSync('src/lib/strategic/phase-registry.ts', 'utf8');
  for (let phase = 1; phase <= 24; phase += 1) {
    if (!new RegExp(`\\bid:\\s*${phase}\\b`).test(source)) {
      findings.push(`phase-not-registered:${phase}`);
    }
  }
}

if (existsSync('src/lib/strategic/agent-os.ts')) {
  const source = readFileSync('src/lib/strategic/agent-os.ts', 'utf8');
  for (const tier of ['R0','R1','R2','R3','R4','R5','R6']) {
    if (!source.includes(`${tier}:`)) findings.push(`risk-tier-missing:${tier}`);
  }
  if (!source.includes('permission recheck denied execution')) {
    findings.push('permission-recheck:missing');
  }
  if (!source.includes('human decision is required')) {
    findings.push('human-decision-boundary:missing');
  }
  if (!source.includes('specialist review is required')) {
    findings.push('specialist-review-boundary:missing');
  }
}

if (existsSync('src/lib/strategic/benchmark-suite.ts')) {
  const source = readFileSync('src/lib/strategic/benchmark-suite.ts', 'utf8');
  if (!source.includes('consequential.autonomous.count')) {
    findings.push('zero-consequential-autonomy-benchmark:missing');
  }
  if (!source.includes('ai.evidence.percent')) {
    findings.push('ai-evidence-benchmark:missing');
  }
}

console.log(JSON.stringify({
  status: findings.length ? 'FAIL' : 'PASS',
  phases: 24,
  riskTiers: 7,
  findings,
}, null, 2));

if (findings.length) process.exit(1);
