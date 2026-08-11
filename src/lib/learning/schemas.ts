import { z } from 'zod';
const id=z.string().trim().min(1).max(120);
const level=z.number().int().min(1).max(5);
export const skillSchema=z.object({code:z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/),name:z.string().trim().min(2).max(140),description:z.string().trim().max(1200).optional(),category:z.string().trim().max(80).optional(),enabled:z.boolean().default(true),evidenceRequired:z.boolean().default(false),proficiencyLabels:z.array(z.object({level, label:z.string().trim().min(1).max(80),description:z.string().trim().max(300).optional()})).length(5).optional()});
export const requirementSchema=z.object({positionId:id,skillId:id,requiredLevel:level,criticality:z.enum(['required','important','preferred']).default('important'),weightPct:z.number().min(0).max(100).default(0)});
export const workerSkillSchema=z.object({workerId:id,skillId:id,level,evidenceNote:z.string().trim().max(1200).optional(),evidenceDocumentId:z.string().trim().max(160).optional(),expiresAt:z.string().datetime().optional(),action:z.enum(['claim','verify']).default('claim')});
const mapping=z.object({skillId:id,targetLevel:level,weightPct:z.number().min(0).max(100).default(0)});
const question=z.object({id:z.string().trim().min(1).max(80).optional(),prompt:z.string().trim().min(3).max(500),options:z.array(z.string().trim().min(1).max(240)).min(2).max(8),correctOption:z.number().int().min(0),points:z.number().positive().max(100).default(1)}).refine(v=>v.correctOption<v.options.length,{message:'correctOption must reference an available option.'});
export const courseSchema=z.object({code:z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),title:z.string().trim().min(3).max(180),description:z.string().trim().max(3000).optional(),delivery:z.enum(['self_paced','instructor_led','blended','external']),durationMinutes:z.number().int().min(1).max(100000),provider:z.string().trim().max(160).optional(),url:z.string().url().optional(),skillMappings:z.array(mapping).max(30).default([]),assessmentQuestions:z.array(question).max(100).default([]),passingScorePct:z.number().min(0).max(100).optional(),certificateValidityDays:z.number().int().min(1).max(3650).optional(),mandatory:z.boolean().default(false)}).superRefine((v,ctx)=>{const ids=v.skillMappings.map(m=>m.skillId);if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Course skill mappings must be unique by skill.'});const total=v.skillMappings.reduce((n,m)=>n+m.weightPct,0);if(total>100)ctx.addIssue({code:'custom',message:'Course skill mapping weights cannot exceed 100%.'});});
export const courseActionSchema=z.object({action:z.enum(['publish','archive'])});
export const pathSchema=z.object({code:z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),title:z.string().trim().min(3).max(180),description:z.string().trim().max(2500).optional(),courseIds:z.array(id).min(1).max(50),targetPositionIds:z.array(id).max(50).default([]),targetSkillIds:z.array(id).max(50).default([]),status:z.enum(['draft','published']).default('draft')}).superRefine((v,ctx)=>{if(new Set(v.courseIds).size!==v.courseIds.length)ctx.addIssue({code:'custom',message:'Learning path courses must be unique.'});});
export const assignmentSchema=z.object({workerId:id,courseId:id,pathId:id.optional(),reason:z.enum(['skill_gap','development','compliance','manager','self']).default('development'),dueAt:z.string().datetime().optional()});
export const assignmentActionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('start')}),
 z.object({action:z.literal('progress'),progressPct:z.number().min(0).max(99)}),
 z.object({action:z.literal('complete_external'),evidence:z.string().trim().min(3).max(1200)}),
 z.object({action:z.literal('submit_assessment'),answers:z.array(z.object({questionId:id,selectedOption:z.number().int().min(0)})).min(1).max(100)}),
 z.object({action:z.literal('waive'),reason:z.string().trim().min(5).max(1000)}),
]);

export const pathAssignmentSchema=z.object({workerId:id,pathId:id,reason:z.enum(['skill_gap','development','compliance','manager','self']).default('development'),dueAt:z.string().datetime().optional()});
