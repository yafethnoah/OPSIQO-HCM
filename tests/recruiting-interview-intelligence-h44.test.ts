import { describe, expect, it } from 'vitest';
import { buildDeterministicInterviewKit } from '../src/lib/recruiting/interview-kit';
import type { Candidate, Requisition } from '../src/domain/recruiting';

const requisition:Requisition={id:'req1',requisitionNumber:'REQ-1',title:'Digital Marketing & Growth Specialist',positionId:'p1',orgUnitId:'u1',hiringManagerWorkerId:'w1',employmentType:'permanent',headcount:1,openingsRemaining:1,description:'Own campaigns, analytics and growth experiments.',requirements:['3+ years digital marketing experience','Google Analytics proficiency','Paid media campaign management'],status:'open',requestedBy:'u',createdAt:'2026-09-02T00:00:00Z',updatedAt:'2026-09-02T00:00:00Z'};
const candidate:Candidate={id:'c1',firstName:'Jia',lastName:'Tan',displayName:'Jia Yee Tan',email:'jia@example.com',emailLower:'jia@example.com',createdAt:'2026-09-02T00:00:00Z',updatedAt:'2026-09-02T00:00:00Z'};

describe('H44 structured interview intelligence',()=>{
 it('creates standardized core questions from the requisition',()=>{const q=buildDeterministicInterviewKit({requisition,candidate,interviewType:'structured'});expect(q.filter(x=>x.standardized).length).toBeGreaterThanOrEqual(5);expect(q.some(x=>x.question.includes('Google Analytics proficiency'))).toBe(true);});
 it('adds candidate-specific verification probes for ATS gaps',()=>{const q=buildDeterministicInterviewKit({requisition,candidate,interviewType:'structured',review:{gaps:['Paid media budget ownership not evidenced'],missingRequirements:['Google Analytics proficiency']} as any});expect(q.some(x=>!x.standardized&&x.type==='verification')).toBe(true);});
 it('provides anchored 1/3/5 scoring for scored questions',()=>{const q=buildDeterministicInterviewKit({requisition,candidate,interviewType:'panel'});for(const x of q.filter(x=>x.type!=='candidate_questions'))expect(x.anchors.map(a=>a.rating)).toEqual([1,3,5]);});
 it('includes a candidate questions section and no employment decision',()=>{const q=buildDeterministicInterviewKit({requisition,candidate,interviewType:'final'});expect(q.some(x=>x.type==='candidate_questions')).toBe(true);expect(q.some(x=>/hire|reject/i.test(x.question))).toBe(false);});
});
