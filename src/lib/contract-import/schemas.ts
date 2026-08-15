import { z } from 'zod';
import { CONTRACT_FIELD_KEYS } from '@/domain/contract-import';
export const contractFieldSchema=z.object({value:z.string().max(5000).nullable(),confidence:z.number().min(0).max(1),sourceSnippet:z.string().max(900).nullable(),sourcePage:z.number().int().min(1).max(5000).nullable().optional()}).strict();
export const contractExtractionSchema=z.object({
 documentType:z.string().trim().min(1).max(100).default('employment_agreement'),language:z.string().trim().min(1).max(40).default('unknown'),summary:z.string().trim().max(3000).default(''),
 fields:z.record(z.string(),contractFieldSchema).default({}),warnings:z.array(z.string().max(500)).max(30).default([])
}).strict();
export const confirmContractSchema=z.object({
 reviewed:z.literal(true),workerId:z.string().trim().min(1).max(160).optional(),
 values:z.record(z.string(),z.string().max(5000)).refine(v=>Object.keys(v).every(k=>(CONTRACT_FIELD_KEYS as readonly string[]).includes(k)),'Unknown contract field.')
}).strict();
export const MAX_CONTRACT_BYTES=10*1024*1024;
export const ALLOWED_CONTRACT_EXTENSIONS=new Set(['.pdf','.docx','.txt','.rtf','.md']);
export const ALLOWED_CONTRACT_MIME=new Set(['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/rtf','application/rtf','text/markdown','application/octet-stream','']);
