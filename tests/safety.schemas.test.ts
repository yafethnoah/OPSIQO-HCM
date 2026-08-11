import { describe,it,expect } from 'vitest';
import { incidentCreateSchema,hazardCreateSchema,rtwSchema,committeeProfileSchema } from '../src/lib/safety/schemas';
describe('safety schemas',()=>{
 it('accepts an evidence-based incident report without deciding legal reporting',()=>{const v=incidentCreateSchema.parse({type:'near_miss',title:'Loading-area near miss',description:'A cart moved unexpectedly and was stopped before striking a worker.',severity:'moderate',occurredAt:'2026-08-10T14:00:00.000Z'});expect(v.type).toBe('near_miss');});
 it('calculates hazard inputs only from bounded 1-5 scores',()=>{expect(()=>hazardCreateSchema.parse({title:'Unsafe cart',description:'Cart can roll on a slope',category:'material_handling',likelihood:6,consequence:4})).toThrow();});
 it('requires functional abilities and suitable duties for RTW rather than diagnosis',()=>{const v=rtwSchema.parse({workerId:'worker-1',functionalAbilities:['Can perform seated administrative work'],temporaryDuties:['Inventory documentation']});expect((v as any).diagnosis).toBeUndefined();});
 it('requires a documented source/rationale for JHSC-HSR governance',()=>{expect(()=>committeeProfileSchema.parse({workplaceName:'Main',regularWorkerCount:25,governanceType:'jhsc',requirementSource:'short'})).toThrow();});
});
