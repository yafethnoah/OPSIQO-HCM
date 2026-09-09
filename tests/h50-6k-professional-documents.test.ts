import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('H50.6K professional branded documents',()=>{
  it('replaces the raw questionnaire editor with question-and-answer HR fields',()=>{
    const source=read('src/components/separation-task-workspace.tsx');
    expect(source).toContain('HR enters the verified information here');
    expect(source).toContain("gridTemplateColumns:'minmax(180px, 38%) minmax(220px, 62%)'");
    expect(source).toContain('Required HR input');
    expect(source).toContain('Provided / prefilled');
    expect(source).toContain('Advanced: view source template');
    expect(source).toContain('readOnly value={content}');
  });

  it('builds professional documents with sections, narrative, metadata and explicit completion',()=>{
    const templates=read('src/lib/separation/task-workspace.ts');
    const professional=read('src/lib/documents/professional-document.ts');
    expect(templates).toContain("section('Employee and case information')");
    expect(templates).toContain("intro('This");
    expect(templates).toContain('documentHasCompleteFields');
    expect(professional).toContain('Document status:');
    expect(professional).toContain('Review control:');
    expect(professional).toContain('To be completed by HR');
    expect(professional).toContain('Confidential HR document');
  });

  it('supports organization branding in settings and exports',()=>{
    const domain=read('src/domain/platform-settings.ts');
    const service=read('src/lib/platform-settings/service.ts');
    const settings=read('src/components/settings-workspace.tsx');
    const editor=read('src/components/separation-task-workspace.tsx');
    for(const marker of ['documentCompanyName','documentLogoUrl','documentPrimaryColor','documentAccentColor','documentFooter']){
      expect(domain).toContain(marker);
      expect(service).toContain(marker);
    }
    expect(settings).toContain('Document brand & letterhead');
    expect(settings).toContain('Company logo URL');
    expect(editor).toContain('Download branded Word');
    expect(editor).toContain('Download branded fillable PDF');
    expect(editor).toContain('Print / Save professional PDF');
  });

  it('keeps real AcroForm fields while making fillable PDFs multi-page and branded',()=>{
    const pdf=read('src/lib/documents/fillable-pdf.ts');
    expect(pdf).toContain('/AcroForm');
    expect(pdf).toContain('/FT /Tx');
    expect(pdf).toContain('/NeedAppearances true');
    expect(pdf).toContain('slice(0,60)');
    expect(pdf).toContain('brand.primaryColor');
    expect(pdf).toContain('brand.accentColor');
    expect(pdf).toContain('Page ${page.pageNumber} of ${pages.length}');
  });

  it('keeps all offboarding document families professional rather than two-question forms',()=>{
    const templates=read('src/lib/separation/task-workspace.ts');
    for(const form of [
      'HR separation checklist',
      'Final HR clearance and sign-off',
      'Knowledge transfer and handover plan',
      'IT access and device clearance',
      'Final payroll review record',
      'ROE preparation and filing checklist',
      'Benefits and pension transition record',
      'Exit interview guide and record',
      'Replacement / position decision record',
      'Records retention review',
    ]) expect(templates).toContain(form);
    const fieldCount=(templates.match(/field\('/g)||[]).length;
    expect(fieldCount).toBeGreaterThan(100);
  });

  it('preserves current and prior release lineage',()=>{
    const identity=read('src/lib/release/identity.ts');
    expect(identity).toContain("'H50.6K'");
    expect(identity).toContain("'H50.6J'");
    expect(identity).toContain("'H50.6I'");
  });
});
