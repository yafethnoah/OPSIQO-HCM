import { z } from 'zod';

const code=z.string().min(2).max(100).regex(/^[A-Z0-9._-]+$/).transform(v=>v.toUpperCase());
const hhmm=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,'Expected UTC time in HH:MM format.');
const staticHeaders=z.record(z.string().min(1).max(120),z.string().max(1000)).default({}).superRefine((h,ctx)=>{
  for(const k of Object.keys(h)){
    const n=k.trim().toLowerCase();
    if(['authorization','proxy-authorization','cookie','set-cookie','x-api-key','host','content-length','connection','transfer-encoding','upgrade'].includes(n))ctx.addIssue({code:'custom',message:`Secret-bearing header ${k} is prohibited; use connector secretRef.`,path:[k]});
  }
});
const retryPolicy=z.object({maxAttempts:z.number().int().min(1).max(5).default(3),baseDelayMs:z.number().int().min(100).max(30000).default(500),maxDelayMs:z.number().int().min(500).max(120000).default(10000),retryOn429:z.boolean().default(true),retryOn5xx:z.boolean().default(true)}).default({maxAttempts:3,baseDelayMs:500,maxDelayMs:10000,retryOn429:true,retryOn5xx:true});
const circuitBreaker=z.object({failureThreshold:z.number().int().min(2).max(20).default(5),resetAfterMs:z.number().int().min(10000).max(86400000).default(300000)}).default({failureThreshold:5,resetAfterMs:300000});

export const adapterProfileCreateSchema=z.object({
  code,
  name:z.string().min(3).max(250),
  connectorId:z.string().uuid(),
  contractId:z.string().uuid(),
  adapterKind:z.enum(['rest_pull','rest_push','scim_users','scim_groups','webhook_hmac','file_json','sftp_json']),
  resourcePath:z.string().max(1000).optional(),
  recordsPath:z.string().max(500).optional(),
  recordKeyPath:z.string().max(500).optional(),
  cursorPath:z.string().max(500).optional(),
  cursorParam:z.string().min(1).max(100).optional(),
  deltaMode:z.enum(['none','cursor','etag','scim_start_index']).default('none'),
  requestMethod:z.enum(['GET','POST','PUT','PATCH']).default('GET'),
  staticHeaders,
  fileObjectPath:z.string().max(1000).optional(),
  sftpRemotePath:z.string().max(1000).optional(),
  retryPolicy,
  circuitBreaker,
});

export const adapterProfileActionSchema=z.discriminatedUnion('action',[
  z.object({action:z.enum(['submit_review','approve','activate','pause','retire','reopen'])}),
]);

export const scheduleCreateSchema=z.discriminatedUnion('cadence',[
  z.object({code,name:z.string().min(3).max(250),profileId:z.string().uuid(),cadence:z.literal('interval'),intervalMinutes:z.number().int().min(5).max(10080),nextRunAt:z.string().datetime({offset:true}).or(z.string().datetime()).optional()}),
  z.object({code,name:z.string().min(3).max(250),profileId:z.string().uuid(),cadence:z.literal('daily'),dailyTimeUtc:hhmm,nextRunAt:z.string().datetime({offset:true}).or(z.string().datetime()).optional()}),
]);

export const scheduleActionSchema=z.discriminatedUnion('action',[
  z.object({action:z.enum(['submit_review','approve','activate','pause','retire','run_now'])}),
]);

export const runtimeExecuteSchema=z.object({runId:z.string().uuid()});
export const sandboxSchema=z.object({profileId:z.string().uuid(),sampleRecord:z.unknown().optional()});

export const replayCreateSchema=z.object({sourceRunId:z.string().uuid(),profileId:z.string().uuid(),rationale:z.string().min(20).max(5000)});
export const replayActionSchema=z.discriminatedUnion('action',[
  z.object({action:z.enum(['submit_review','approve','execute'])}),
  z.object({action:z.literal('reject'),note:z.string().min(10).max(2000)}),
]);
