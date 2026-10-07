import { describe,expect,it } from 'vitest';
import { higherPriority,scoreKnowledgeArticles,urgencyFromText } from '@/lib/experience/self-service';

describe('H51.82 intelligent Employee Experience & Service Center',()=>{
  it('finds relevant knowledge deterministically',()=>{
    const articles:any[]=[
      {id:'1',title:'Employment letters',summary:'How to request an employment verification letter',body:'Use the HR service request.',category:'employment_documents',keywords:['employment','letter'],status:'published'},
      {id:'2',title:'Benefits guide',summary:'Benefits enrollment help',body:'Benefit information.',category:'benefits',keywords:['benefits'],status:'published'},
    ];
    const result=scoreKnowledgeArticles('I need an employment verification letter',articles,'employment_documents');
    expect(result[0]?.id).toBe('1');
    expect(result[0]?.relevance).toBeGreaterThan(0);
  });

  it('never lowers an authoritative catalog priority',()=>{
    expect(higherPriority('high','normal')).toBe('high');
    expect(higherPriority('normal','high')).toBe('high');
    expect(higherPriority('urgent','high')).toBe('urgent');
  });

  it('detects explicit urgency without making an employment decision',()=>{
    expect(urgencyFromText('This is urgent and needs review today')).toBe('urgent');
    expect(urgencyFromText('Please help with a routine letter')).toBe('normal');
  });

  it('keeps automatic prompt ownership inside OPSIQO',()=>{
    const source=require('fs').readFileSync('src/lib/experience/intelligence.ts','utf8');
    expect(source).toContain("promptWrittenBy:'OPSIQO'");
    expect(source).toContain('automaticPrompt');
    expect(source).toMatch(/consequential/i);
  });
});
