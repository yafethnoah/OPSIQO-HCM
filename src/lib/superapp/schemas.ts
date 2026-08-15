import { z } from 'zod';
const tz=z.string().trim().min(1).max(80).refine(v=>v==='auto'||(()=>{try{Intl.DateTimeFormat('en',{timeZone:v});return true}catch{return false}})(),'Invalid IANA time zone.');
export const preferenceSchema=z.object({
 homeMode:z.enum(['auto','employee','manager']).default('auto'),
 pinnedActionIds:z.array(z.string().trim().min(1).max(80)).max(8).default([]),
 compactMode:z.boolean().default(false),
 locale:z.enum(['auto','en','fr','es','ar']).default('auto'),
 timeZone:tz.default('auto')
}).strict();
export type SuperAppPreferenceInput=z.infer<typeof preferenceSchema>;
