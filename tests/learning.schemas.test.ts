import { describe, expect, it } from 'vitest';
import { assignmentActionSchema, courseSchema, pathSchema, workerSkillSchema } from '@/lib/learning/schemas';

describe('skills and learning governance schemas', () => {
  it('keeps proficiency levels inside the 1-5 framework', () => {
    expect(() => workerSkillSchema.parse({ workerId:'w1', skillId:'s1', level:6, action:'claim' })).toThrow();
  });

  it('rejects course skill mappings whose weights exceed 100%', () => {
    expect(() => courseSchema.parse({
      code:'COURSE-1', title:'Advanced people analytics', delivery:'self_paced', durationMinutes:120,
      skillMappings:[{skillId:'s1',targetLevel:4,weightPct:60},{skillId:'s2',targetLevel:4,weightPct:50}],
      assessmentQuestions:[], mandatory:false,
    })).toThrow();
  });

  it('rejects assessment answer keys outside the available options', () => {
    expect(() => courseSchema.parse({
      code:'COURSE-2', title:'Evidence based employee relations', delivery:'self_paced', durationMinutes:60,
      skillMappings:[], mandatory:false,
      assessmentQuestions:[{prompt:'Choose the correct response',options:['A','B'],correctOption:2,points:1}],
    })).toThrow();
  });

  it('rejects duplicate courses in a learning path', () => {
    expect(() => pathSchema.parse({ code:'PATH-1', title:'HR manager path', courseIds:['c1','c1'], targetPositionIds:[], targetSkillIds:[], status:'draft' })).toThrow();
  });

  it('requires evidence when externally completing a course', () => {
    expect(() => assignmentActionSchema.parse({ action:'complete_external', evidence:'' })).toThrow();
  });
});
