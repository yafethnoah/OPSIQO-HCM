import { z } from 'zod';
export const aiQuestionSchema=z.object({question:z.string().trim().min(3).max(4000),responseLocale:z.enum(['auto','en','fr','es','ar']).optional()});
export const aiPromptCreateSchema=z.object({code:z.string().trim().min(2).max(80).regex(/^[A-Z0-9_-]+$/),name:z.string().trim().min(2).max(160),systemInstruction:z.string().trim().min(50).max(20000)});
export const aiPromptActionSchema=z.object({action:z.enum(['activate','retire'])});
export const aiActionPlanSchema=z.object({recommendationId:z.string().min(1),title:z.string().trim().min(3).max(240).optional(),ownerRole:z.string().trim().min(2).max(80).default('hr_admin'),dueDays:z.number().int().min(1).max(365).default(30)});
export const aiActionPlanActionSchema=z.object({action:z.enum(['approve','cancel','complete'])});

export const aiModelProfileCreateSchema=z.object({code:z.string().trim().min(2).max(80).regex(/^[A-Z0-9_-]+$/),provider:z.enum(['demo','openai','gemini']),model:z.string().trim().min(2).max(160),purpose:z.string().trim().min(10).max(1000),dataHandlingNote:z.string().trim().min(10).max(2000)});
export const aiModelProfileActionSchema=z.object({action:z.enum(['activate','retire'])});

export const aiCopilotAnswerSchema=z.object({
  summary:z.string().max(8000),
  findings:z.array(z.string().max(4000)).max(8),
  citations:z.array(z.object({evidenceId:z.string().min(1).max(240),claim:z.string().max(4000)})).max(16),
  recommendations:z.array(z.object({
    id:z.string().min(1).max(160),
    type:z.enum(['investigate','review','analyze','communicate','plan','monitor']),
    title:z.string().min(1).max(500),
    rationale:z.string().max(5000),
    evidenceIds:z.array(z.string().min(1).max(240)).max(24),
    priority:z.enum(['low','medium','high']),
    suggestedOwnerRole:z.string().max(120).nullable().optional(),
    suggestedDueDays:z.number().int().min(1).max(365).nullable().optional()
  })).max(6),
  limitations:z.array(z.string().max(4000)).max(8),
  confidence:z.number().int().min(0).max(100),
  evidenceCompleteness:z.number().int().min(0).max(100),
  requiresHumanDecision:z.boolean()
});
export const aiActionPlanTaskActionSchema=z.object({action:z.enum(['complete','reopen','cancel'])});
