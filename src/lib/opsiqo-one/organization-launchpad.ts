import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { ActorContext } from '@/domain/security';
import type { OrganizationLaunchpadApplyResult, OrganizationLaunchpadPreview, OrganizationLaunchpadProfile, OrganizationType } from '@/domain/opsiqo-one-v7-14';
import type { Organization } from '@/domain/organization';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { getPlatformSettings, updatePlatformSettings } from '@/lib/platform-settings/service';
import { getNotificationSettings, updateNotificationSettings } from '@/lib/notifications/service';
import { automationMarketplace, installAutomationPack } from './automation-marketplace';

const profileSchema = z.object({
  organizationType: z.enum(['business','nonprofit','public_sector','healthcare','education','other']),
  country: z.string().trim().min(2).max(100),
  region: z.string().trim().max(120).optional(),
  employeeBand: z.enum(['1-25','26-100','101-500','501-2000','2000+']),
  primaryLocale: z.enum(['en','fr','es','ar']),
  timezone: z.string().trim().min(2).max(100),
  weekStartsOn: z.enum(['sunday','monday']),
  locations: z.array(z.string().trim().min(2).max(160)).max(50).default([]),
  departments: z.array(z.string().trim().min(2).max(160)).max(40).default([]),
  marketplacePackIds: z.array(z.enum(['workforce-essentials','nonprofit-operations','governance-evidence'])).max(3).default([]),
  notificationDigest: z.enum(['off','daily','weekly']).default('daily'),
});
const applySchema = profileSchema.extend({ confirm: z.literal(true) });

const departmentSuggestions: Record<OrganizationType,string[]> = {
  business:['Operations','People & Culture','Finance','Sales / Client Services'],
  nonprofit:['Programs','People & Culture','Finance','Fund Development','Operations'],
  public_sector:['Operations','People & Culture','Finance','Service Delivery','Governance'],
  healthcare:['Clinical / Service Delivery','People & Culture','Finance','Operations','Quality & Safety'],
  education:['Academic / Programs','People & Culture','Finance','Student / Learner Services','Operations'],
  other:['Operations','People & Culture','Finance'],
};

function suggestedPacks(type: OrganizationType) {
  if (type === 'nonprofit') return ['workforce-essentials','nonprofit-operations','governance-evidence'];
  if (type === 'public_sector' || type === 'healthcare' || type === 'education') return ['workforce-essentials','governance-evidence'];
  return ['workforce-essentials'];
}
function requireAny(actor:ActorContext, permission:string) { if (!actor.permissions.includes(permission as never)) throw new ApiError(403,`${permission} permission required.`, 'forbidden'); }
function unitCode(name:string, existing:Set<string>) {
  const base=(name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().split(/\s+/).map(v=>v[0]||'').join('').slice(0,8)||'UNIT');
  let code=base, n=2; while(existing.has(code)){code=`${base.slice(0,6)}${n++}`.slice(0,8)} existing.add(code); return code;
}

export async function organizationLaunchpadPreview(actor:ActorContext, raw?:unknown):Promise<OrganizationLaunchpadPreview>{
  requireAny(actor,'organization.read');
  const profile=raw ? profileSchema.parse(raw) : undefined;
  const db=adminDb();
  const [orgSnap,units,positions,workflows,setup]=await Promise.all([
    db.doc(`organizations/${actor.orgId}`).get(),
    db.collection(`organizations/${actor.orgId}/orgUnits`).limit(500).get(),
    db.collection(`organizations/${actor.orgId}/positions`).limit(500).get(),
    db.collection(`organizations/${actor.orgId}/workflowDefinitions`).limit(500).get(),
    db.doc(`organizations/${actor.orgId}/opsiqoOneSetup/foundation`).get(),
  ]);
  if(!orgSnap.exists)throw new ApiError(404,'Organization not found.','organization_not_found');
  const org=orgSnap.data() as Organization;
  const type=profile?.organizationType || ((setup.data()?.profile?.organizationType as OrganizationType|undefined) ?? 'business');
  return{
    organization:{id:actor.orgId,name:org.name},
    current:{orgUnits:units.size,positions:positions.size,workflows:workflows.size,setupApplied:setup.exists},
    profile:profile ?? (setup.data()?.profile as OrganizationLaunchpadProfile|undefined),
    suggestions:{
      departments:departmentSuggestions[type],
      marketplacePackIds:suggestedPacks(type),
      notificationDigest: profile?.notificationDigest ?? 'daily',
      rationale:[
        'Department suggestions are starter labels only; they are never created until an authorized administrator explicitly selects and applies them.',
        'Marketplace packs install as disabled workflow definitions and require separate workflow activation.',
        'OPSIQO does not generate jurisdiction-specific legal policies or grant new user permissions during Launchpad setup.',
      ],
    },
    safeguards:[
      'No people, positions, compensation, employment decisions or permissions are created by Launchpad.',
      'Existing security, MFA, registration and appearance controls are preserved unless the administrator explicitly changes a supported regional default.',
      'Workflow packs are installed disabled. Activation remains a separate audited workflow.manage action.',
      'Country and region are organization configuration context, not a legal-compliance determination.',
    ],
    canApply:actor.permissions.includes('organization.manage')&&actor.permissions.includes('platform.manage')&&actor.permissions.includes('notifications.manage'),
  };
}

export async function applyOrganizationLaunchpad(actor:ActorContext, raw:unknown):Promise<OrganizationLaunchpadApplyResult>{
  requireAny(actor,'organization.manage'); requireAny(actor,'platform.manage'); requireAny(actor,'notifications.manage');
  const input=applySchema.parse(raw), profile:OrganizationLaunchpadProfile={...input}; delete (profile as any).confirm;
  if(profile.marketplacePackIds.length) requireAny(actor,'workflow.manage');
  const db=adminDb(),timestamp=new Date().toISOString(),setupRef=db.doc(`organizations/${actor.orgId}/opsiqoOneSetup/foundation`);
  const [beforeSetup,unitSnap,platform,notifications]=await Promise.all([setupRef.get(),db.collection(`organizations/${actor.orgId}/orgUnits`).limit(500).get(),getPlatformSettings(actor),getNotificationSettings(actor)]);
  const existingNames=new Set(unitSnap.docs.map(d=>String(d.data().name||'').trim().toLowerCase())),existingCodes=new Set(unitSnap.docs.map(d=>String(d.data().code||'').trim().toUpperCase()));
  const root=unitSnap.docs.find(d=>d.data().type==='company')?.data();
  const createdOrgUnits:Array<{id:string;name:string;code:string}>=[];
  const uniqueDepartments=[...new Set(profile.departments.map(v=>v.trim()).filter(Boolean))].filter(name=>!existingNames.has(name.toLowerCase()));
  const unitRows=uniqueDepartments.map(name=>{const id=randomUUID(),code=unitCode(name,existingCodes);createdOrgUnits.push({id,name,code});return{id,name,code,type:'department' as const,parentId:root?.id,status:'active' as const,createdAt:timestamp,updatedAt:timestamp};});
  const checklist:OrganizationLaunchpadApplyResult['setupChecklist']=[
    {id:'structure',title:'Review organization structure and reporting lines',href:'/organization',status:'review_required'},
    {id:'members',title:'Invite members and verify role assignments',href:'/members',status:'review_required'},
    {id:'policies',title:'Review organization policies and acknowledgement requirements',href:'/policy-intelligence',status:'review_required'},
    {id:'workflows',title:'Review installed workflow starters before activation',href:'/workflows',status:'review_required'},
    {id:'security',title:'Verify MFA, registration and identity controls',href:'/settings',status:'review_required'},
    {id:'import',title:'Import or add people only after the structure is reviewed',href:'/import-center',status:'ready'},
  ];
  const setupRow={id:'foundation',profile,checklist,appliedBy:actor.uid,appliedAt:timestamp,version:1};
  const audit=buildAudit(actor,{action:'opsiqo_one.organization_launchpad.apply',entityType:'opsiqoOneSetup',entityId:'foundation',before:beforeSetup.exists?beforeSetup.data():null,after:{...setupRow,createdOrgUnits},metadata:{departmentCount:createdOrgUnits.length,marketplacePackIds:profile.marketplacePackIds}});
  const batch=db.batch(); batch.set(setupRef,setupRow,{merge:false});
  for(const unit of unitRows) batch.create(db.doc(`organizations/${actor.orgId}/orgUnits/${unit.id}`),unit);
  batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit); await batch.commit();
  await updatePlatformSettings(actor,{...platform,defaultLocale:profile.primaryLocale,defaultTimezone:profile.timezone,weekStartsOn:profile.weekStartsOn});
  await updateNotificationSettings(actor,{...notifications,digestFrequency:profile.notificationDigest});
  const market=await automationMarketplace(actor), installedPackIds:string[]=[], skippedPackIds:string[]=[];
  for(const packId of profile.marketplacePackIds){const current=market.packs.find(p=>p.id===packId);if(current?.installed){skippedPackIds.push(packId);continue}try{await installAutomationPack(actor,packId);installedPackIds.push(packId)}catch{skippedPackIds.push(packId)}}
  return{profile,createdOrgUnits,installedPackIds,skippedPackIds,setupChecklist:checklist,appliedAt:timestamp,governanceNote:'Launchpad applied organization/regional defaults and selected starter structure. Installed marketplace workflows remain disabled. Permissions, employment decisions, legal policies and live workflow activation were not automated.'};
}
