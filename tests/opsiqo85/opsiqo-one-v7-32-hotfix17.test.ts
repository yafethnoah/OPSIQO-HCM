import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('V7.32 Hotfix 17 authenticated accessibility closure',()=>{
  it('keeps semantic-name checks strict while honoring real label semantics',()=>{
    const worker=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-worker.mjs','utf8');
    expect(worker).toContain("getAttribute('aria-labelledby')");
    expect(worker).toContain('e.labels');
    expect(worker).toContain("Accessibility.getFullAXTree");
    expect(worker).toContain("add('accessibility-tree-names'");
  });

  it('switches Arabic through the same event contract used by the application shell',()=>{
    const worker=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-worker.mjs','utf8');
    const shell=fs.readFileSync('src/lib/opsiqo-one/shell-i18n.ts','utf8');
    expect(worker).toContain("new CustomEvent('opsiqo:locale-changed',{detail:{locale:'ar'}})");
    expect(shell).toContain('event instanceof CustomEvent');
    expect(shell).toContain('event.detail?.locale');
    expect(worker).toContain("if(marker)add('operational-arabic-translation'");
  });

  it('does not require outcome navigation inside the dedicated MFA security shell',()=>{
    const worker=fs.readFileSync('scripts/opsiqo85-v7-32-authenticated-accessibility-worker.mjs','utf8');
    expect(worker).toContain("securityShellRoute=route==='/mfa/setup'");
    expect(worker).toContain('securityShellRoute?!v.mobileNav:(v.mobileNav&&v.mobileLinks===5)');
  });

  it('keeps loaded integration trees inside their governed translation roots',()=>{
    const command=fs.readFileSync('src/components/integration-command-center.tsx','utf8');
    const runtime=fs.readFileSync('src/components/integration-runtime-center.tsx','utf8');
    expect(command).toContain('return <div ref={translationRoot} className="stack">');
    expect(runtime).toContain('return <div ref={translationRoot} className="stack">');
  });

  it('names the repeated controls that Chrome AX reported as genuinely unnamed',()=>{
    const governance=fs.readFileSync('src/components/ai-governance-center.tsx','utf8');
    const service=fs.readFileSync('src/components/employee-service-center-workspace.tsx','utf8');
    const grants=fs.readFileSync('src/components/grant-workforce-workspace.tsx','utf8');
    expect(governance).toContain('aria-label={`${a.agentName} action level`}');
    expect(service).toContain('aria-label="Request description"');
    expect(grants).toContain('aria-label="Allocation percent"');
  });

  it('hardens 24px pointer targets and 320px shared-container reflow without hiding document overflow',()=>{
    const css=fs.readFileSync('src/app/globals.css','utf8');
    expect(css).toContain('min-inline-size:24px;min-block-size:24px');
    expect(css).toContain('min-width:0;max-width:100%');
    expect(css).not.toContain('.mainInner{overflow-x:clip}');
  });
});
