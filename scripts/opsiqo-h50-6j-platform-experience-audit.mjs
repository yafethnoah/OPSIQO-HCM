import fs from 'node:fs';

const checks = [
  ['global shell coverage','src/components/app-shell.tsx',['PageExperienceLayer','<PageExperienceLayer publicMode />','<PageExperienceLayer />']],
  ['page experience layer','src/components/page-experience-layer.tsx',['Guided mode','Expert mode','Page-guide progress','What should I do next?','Explain blockers','Prepare missing documents','aria-live="polite"','minHeight: 44','opsiqo:ai-assist']],
  ['route experience registry','src/lib/experience/page-experience.ts',["id: 'recruiting'","id: 'offboarding'","id: 'imports'","id: 'admin'","id: 'general'"]],
  ['governed AI bridge','src/components/contextual-ai-assist.tsx',["window.addEventListener('opsiqo:ai-assist'","setOpen(true)","setQuestion(prompt)"]],
  ['release identity','src/lib/release/identity.ts',["H50.6J"]],
  ['tests','tests/h50-6j-platform-experience.test.ts',["H50.6J platform-wide page experience"]],
];

let failures = 0;
for (const [label, file, markers] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  const missing = markers.filter((marker) => !text.includes(marker));
  if (missing.length) {
    console.log(`FAIL ${label}: missing ${missing.join(', ')}`);
    failures += 1;
  } else {
    console.log(`PASS ${label}`);
  }
}

const layer = fs.readFileSync('src/components/page-experience-layer.tsx','utf8');
for (const forbidden of ['apiFetch(', 'firebase/firestore', 'dangerouslySetInnerHTML']) {
  if (layer.includes(forbidden)) {
    console.log(`FAIL page experience safety: forbidden direct behavior ${forbidden}`);
    failures += 1;
  }
}
if (!failures) console.log('H50.6J PLATFORM EXPERIENCE AUDIT: PASS');
else {
  console.log(`H50.6J PLATFORM EXPERIENCE AUDIT: FAIL (${failures})`);
  process.exit(1);
}
