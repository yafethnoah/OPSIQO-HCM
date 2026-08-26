import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('V7.32 Hotfix 19 shell locale and target-size closure',()=>{
  it('keeps shell locale hydration-stable and resilient to direct document locale changes',()=>{
    const shell=fs.readFileSync('src/lib/opsiqo-one/shell-i18n.ts','utf8');

    // H28 deliberately hydrates from the same deterministic English state as
    // the server, then synchronizes to the already-bootstrapped runtime locale
    // after mount. This supersedes H19's old requirement to read document
    // locale during the initial client render.
    expect(shell).toContain("useState<ShellLocale>('en')");
    expect(shell).toContain('update();');
    expect(shell).toContain("setLocale(normalizeShellLocale(raw)||currentShellLocale())");

    // Preserve H19's actual resilience guarantee: direct document locale
    // changes remain observed after hydration.
    expect(shell).toContain('new MutationObserver');
    expect(shell).toContain("attributeFilter:['data-opsiqo-locale','lang','dir']");
  });

  it('prevents the legacy global translator from fighting shell-owned labels',()=>{
    const legacy=fs.readFileSync('src/lib/opsiqo-one/legacy-surface-i18n.ts','utf8');
    const mobile=fs.readFileSync('src/components/mobile-outcome-nav.tsx','utf8');
    expect(legacy).toContain('[data-opsiqo-shell-i18n="true"]');
    expect(mobile).toContain('data-opsiqo-shell-i18n="true"');
  });

  it('gives shared navigation targets an explicit physical minimum size',()=>{
    const css=fs.readFileSync('src/app/globals.css','utf8');
    expect(css).toContain('.navItem{min-height:32px;min-width:24px}');
    expect(css).toContain('.navPin{width:32px;height:32px');
    expect(css).toContain('.sidebar a[href],.sidebar button{min-height:32px}');
  });

  it('keeps the target-size gate strict for non-inline targets and reports examples',()=>{
    const worker=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-worker.mjs','utf8');
    expect(worker).toContain("inlineTextLink=e.tagName==='A'&&display==='inline'");
    expect(worker).toContain('!x.inlineTextLink&&(x.w<24||x.h<24)');
    expect(worker).toContain('smallTargetExamples');
    expect(worker).toContain("add('target-size-24'");
  });

  it('does not weaken Arabic or accessibility-tree evidence gates',()=>{
    const worker=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-worker.mjs','utf8');
    expect(worker).toContain("Accessibility.getFullAXTree");
    expect(worker).toContain("add('arabic-rtl-shell'");
    expect(worker).toContain("if(marker)add('operational-arabic-translation'");
  });
});
