import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assessStructuredResume, candidateVerificationGate, deterministicStructuredResume } from '../src/lib/recruiting/resume-structure';
const pharmacyResume=`PROFESSIONAL EXPERIENCE
Pharmacy Owner / Manager
Shady Pharmacy
2012 - 2015
• Oversaw clinic operations, referrals, supplier relationships and daily pharmacy activities.
• Managed procurement, inventory controls and staff scheduling.

EDUCATION & CREDENTIALS
Bachelor of Pharmacy
Damascus University
2008

SKILLS
Pharmacy Operations; Procurement | Vendor Management • Team Leadership, Inventory Control`;
describe('H50.6A UAT compatibility repair',()=>{
 it('does not classify a duty bullet as an employer',()=>{const s=deterministicStructuredResume({sourceText:pharmacyResume,skills:[],certifications:[]});expect(s.employmentHistory).toHaveLength(1);expect(s.employmentHistory[0]?.positionTitle).toBe('Pharmacy Owner / Manager');expect(s.employmentHistory[0]?.employer).toBe('Shady Pharmacy');expect(s.employmentHistory[0]?.employer).not.toMatch(/oversaw/i);expect(s.employmentHistory[0]?.responsibilities.join(' ')).toMatch(/oversaw clinic operations/i)});
 it('recognizes pharmacy education under Education & Credentials',()=>{const s=deterministicStructuredResume({sourceText:pharmacyResume,skills:[],certifications:[]});expect(s.educationHistory.length).toBeGreaterThanOrEqual(1);expect(s.educationHistory[0]?.degree).toMatch(/Bachelor of Pharmacy/i);expect(s.educationHistory[0]?.institution).toMatch(/Damascus University/i)});
 it('splits common skill delimiters',()=>{const s=deterministicStructuredResume({sourceText:pharmacyResume,skills:[],certifications:[]});expect(s.skills).toEqual(expect.arrayContaining(['Pharmacy Operations','Procurement','Vendor Management','Team Leadership','Inventory Control']))});
 it('blocks candidate verification when employer is a duty sentence',()=>{const s=deterministicStructuredResume({sourceText:pharmacyResume,skills:[],certifications:[]});const corrupt={...s,employmentHistory:s.employmentHistory.map((item,index)=>index===0?{...item,employer:'• Oversaw clinic operations, referrals, supplier relationships and daily pharmacy activities.'}:item)};const gate=candidateVerificationGate(corrupt,pharmacyResume);expect(gate.canFinalize).toBe(false);expect(gate.criticalIssues.join(' ')).toMatch(/employer unresolved/i)});
 it('blocks final verification when explicit education cannot be resolved',()=>{const s=deterministicStructuredResume({sourceText:pharmacyResume,skills:[],certifications:[]});const gate=candidateVerificationGate({...s,educationHistory:[]},pharmacyResume);expect(gate.canFinalize).toBe(false);expect(gate.criticalIssues.join(' ')).toMatch(/Education section detected/i)});
 it('keeps backend structural verification in submission path',()=>{const v=readFileSync(join(process.cwd(),'src/lib/recruiting/candidate-portal-service.ts'),'utf8');expect(v).toContain('candidateVerificationGate');expect(v).toContain('resume_structural_review_required');expect(v).toContain('structuredResume:verifiedStructuredResume')});
 it('restores navigation UTF-8 and Premium entries',()=>{const nav=readFileSync(join(process.cwd(),'src/components/nav.tsx'),'utf8');for(const token of ['Ã','Â','â€','âœ','âŒ','ï¿½','\uFFFD']) expect(nav).not.toContain(token);for(const href of ['/benefits','/payroll','/esign','/premium-hcm'])expect(nav.split(`href:'${href}'`).length-1).toBe(1);expect(nav).toContain("icon:'✓'");expect(nav).toContain("icon:'⌕'");expect(nav).toContain("icon:'⚙'")});
 it('preserves governed Recruiting AI readiness',()=>{const r=readFileSync(join(process.cwd(),'src/lib/recruiting/ai-readiness.ts'),'utf8');expect(r).toContain('RECRUITING_ATS');expect(r).toContain('RECRUITING_ATS_MODEL');expect(r).toContain('credentialAvailable');expect(r).toContain('promptActive');expect(r).toContain('modelApproved')});
 it('produces a structurally complete pharmacy reference record',()=>{const s=deterministicStructuredResume({sourceText:pharmacyResume,skills:[],certifications:[]});const a=assessStructuredResume(s,pharmacyResume);expect(a.criticalIssues).toHaveLength(0);expect(a.recordCount).toBeGreaterThanOrEqual(7)});
});
