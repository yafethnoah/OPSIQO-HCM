import { describe, expect, it } from 'vitest';
import { createCycleSchema, feedbackRequestSchema, pipSchema, selfAssessmentSchema } from '@/lib/performance/schemas';
describe('performance governance schemas',()=>{
  it('requires goal and competency cycle weights to total 100',()=>{expect(()=>createCycleSchema.parse({name:'2026 cycle',periodStart:'2026-01-01',periodEnd:'2026-12-31',goalWeightPct:70,competencyWeightPct:40,minimum360Responses:3})).toThrow();});
  it('requires at least two 360 raters and a release threshold of at least two',()=>{expect(()=>feedbackRequestSchema.parse({workerId:'w1',raterWorkerIds:['w2'],questions:['Question one?','Question two?'],anonymous:true,minimumResponses:2})).toThrow();});
  it('rejects duplicate 360 questions',()=>{expect(()=>feedbackRequestSchema.parse({workerId:'w1',raterWorkerIds:['w2','w3'],questions:['How are results delivered?','How are results delivered?'],anonymous:true,minimumResponses:2})).toThrow();});
  it('requires an explicit rating for each submitted review criterion',()=>{expect(()=>selfAssessmentSchema.parse({overallRating:3,summary:'A sufficiently detailed employee self-assessment summary.',items:[{key:'results',label:'Results',comment:'Evidence without a rating.'}]})).toThrow();});
  it('rejects a PIP whose end date precedes its start date',()=>{expect(()=>pipSchema.parse({workerId:'w1',title:'Plan',reason:'A sufficiently detailed documented reason.',expectations:'Clear documented expectations for improvement.',startDate:'2026-09-10',endDate:'2026-09-01',reviewCadence:'Weekly',supportMeasures:['Coaching'],milestones:[{expectation:'Improve delivery',successMeasure:'Meets agreed target',dueDate:'2026-09-15',status:'pending'}]})).toThrow();});
});
