import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('V7.32 Hotfix 18 AI Copilot translation-root TypeScript closure',()=>{
  it('keeps translation ownership in the workspace component rather than the nested child',()=>{
    const source=fs.readFileSync('src/components/ai-copilot-workspace.tsx','utf8');
    const start=source.indexOf('function Copilot(');
    const end=source.indexOf('function Recommendation(',start);
    const child=source.slice(start,end);
    expect(source).toContain('const translationRoot=useRef<HTMLDivElement>(null)');
    expect(source).toContain("useLegacySurfaceTranslation('ai_copilot',translationRoot)");
    expect(source).toContain('return <div ref={translationRoot} className="stack">\n    <section className="card">');
    expect(child).not.toContain('ref={translationRoot}');
  });

  it('preserves the H17 accessible name on the Ask OPSIQO question field',()=>{
    const source=fs.readFileSync('src/components/ai-copilot-workspace.tsx','utf8');
    expect(source).toContain('aria-label="Ask OPSIQO question"');
  });
});
