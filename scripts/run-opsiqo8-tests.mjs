import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const roots = [
  "tests/product-analytics",
  "tests/ai-evals",
  "tests/ux-performance",
  "tests/experimentation",
  "tests/orchestrator",
  "tests/operations-cockpit",
  "tests/workforce-intelligence",
  "tests/compliance-evidence",
];

function collect(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) collect(p, out);
    else if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = roots.flatMap(root => collect(root)).map(p => relative(process.cwd(), p));
if (!files.length) {
  console.error("No OPSIQO 7.x/8.x test files were found.");
  process.exit(2);
}

let vitestEntry;
try {
  const packageJson = require.resolve("vitest/package.json");
  vitestEntry = join(dirname(packageJson), "vitest.mjs");
} catch (error) {
  console.error("Unable to resolve the installed Vitest package.", error);
  process.exit(2);
}

if (!existsSync(vitestEntry)) {
  console.error(`Vitest entrypoint not found: ${vitestEntry}`);
  process.exit(2);
}

console.log(`Running ${files.length} OPSIQO integration/foundation test files...`);

const result = spawnSync(
  process.execPath,
  [vitestEntry, "run", ...files],
  {
    stdio: "inherit",
    cwd: process.cwd(),
    env: { ...process.env, CI: "true" },
  },
);

if (result.error) {
  console.error("Unable to launch Vitest.", result.error);
  process.exit(2);
}

process.exit(result.status ?? 2);
