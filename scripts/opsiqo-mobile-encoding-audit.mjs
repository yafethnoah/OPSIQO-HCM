import fs from "node:fs";
import path from "node:path";

const roots = ["mobile/app", "mobile/src"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

const suspicious = [
  "\u00c2",
  "\u00c3",
  "\u00e2\u20ac",
  "\u00e2\u2020",
  "\u00e2\u0152",
  "\ufffd",
];

const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
}

for (const root of roots) {
  if (fs.existsSync(root)) walk(root);
}

const failures = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const matched = suspicious.find((token) => content.includes(token));
  if (matched) {
    failures.push({
      file: file.replace(/\\/g, "/"),
      token: JSON.stringify(matched),
    });
  }
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`FAIL ${failure.file} contains ${failure.token}`);
  }
  console.error(`Mobile encoding audit: ${failures.length} file(s) failed`);
  process.exit(1);
}

console.log(`Mobile encoding audit: PASS (${files.length} source files scanned)`);