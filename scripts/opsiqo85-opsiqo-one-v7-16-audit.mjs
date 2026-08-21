import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),exists=p=>fs.existsSync(p);
const domain=read('src/domain/opsiqo-one-v7-16.ts');
const grantDomain=read('src/domain/opsiqo-one-v7-15.ts');
const program=read('src/lib/opsiqo-one/program-workforce.ts');
const grant=read('src/lib/opsiqo-one/grant-workforce.ts');
const meeting=read('src/lib/opsiqo-one/meeting-actions.ts');
const safe=read('src/lib/opsiqo-one/safe-execution.ts');
const notifications=read('src/lib/notifications/service.ts');
const router=read('src/lib/opsiqo-one/command-router.ts');
const commandApi=read('src/app/api/organizations/[orgId]/opsiqo-one/command/route.ts');
const orchestration=read('src/lib/opsiqo-one/orchestration.ts');
const cortex=read('src/lib/opsiqo-one/cortex.ts');
const appearance=read('src/lib/preferences/appearance.ts');
const settings=read('src/components/settings-workspace.tsx');
const css=read('src/app/globals.css');
const appShell=read('src/components/app-shell.tsx');
const readiness=read('src/lib/opsiqo-one/experience-readiness.ts');
const language=read('src/components/language-bootstrap.tsx');
const multi=read('src/lib/opsiqo-one/multilingual-intelligence.ts');
const shell=read('src/lib/opsiqo-one/shell-i18n.ts');
const nav=read('src/components/nav.tsx');
const mobile=read('src/components/mobile-outcome-nav.tsx');
const more=read('src/components/more-hub-workspace.tsx');
const brief=read('src/lib/opsiqo-one/daily-brief.ts');
const checks=[
 ['V7.16 domain contract exists',exists('src/domain/opsiqo-one-v7-16.ts')],
 ['Program project domain exists',domain.includes('ProgramProject')&&domain.includes("status:'planned'|'active'|'closed'")],
 ['Program workforce row models project grant position worker and cost',domain.includes('ProgramWorkforceRow')&&['projectId','fundingSourceId','workerId','positionId','plannedAnnualAmount'].every(x=>domain.includes(x))],
 ['Grant allocation can carry an explicit project link',grantDomain.includes('projectId?:string')],
 ['Program Workforce service exists',exists('src/lib/opsiqo-one/program-workforce.ts')],
 ['Program Workforce requires workforce.read',program.includes("permissions.includes('workforce.read')")],
 ['Program project writes require workforce.manage',program.includes("permissions.includes('workforce.manage')")],
 ['Program dashboard reads explicit project records',program.includes('/grantProjects')],
 ['Program dashboard reads grant funding sources',program.includes('/grantFundingSources')],
 ['Program dashboard reads grant workforce allocations',program.includes('/grantWorkforceAllocations')],
 ['Program dashboard reads workers',program.includes('/workers')],
 ['Program dashboard reads employments',program.includes('/employments')],
 ['Program dashboard reads assignments',program.includes('/assignments')],
 ['Program dashboard reads positions',program.includes('/positions')],
 ['Program dashboard reads org units',program.includes('/orgUnits')],
 ['Program cost uses explicit planned annual funded amount',program.includes("typeof a.plannedAnnualAmount==='number'")&&program.includes('explicitPlannedAnnualCost')],
 ['Program service does not import compensation domain',!program.includes("@/domain/compensation")&&!program.includes('/compensation/')],
 ['Program service does not infer salary cost',program.includes('does not infer compensation')&&program.includes('planned annual funded amount')],
 ['Program project code is unique',program.includes('grant_project_code_exists')],
 ['Program project must use a real funding source',program.includes('grant_source_not_found')],
 ['Program project period stays inside funding period',program.includes('grant_project_outside_funding_period')],
 ['Program project creation is audited',program.includes("action:'workforce.grant_project.create'")],
 ['Closed funding source cannot receive program projects',program.includes('grant_source_closed')],
 ['Grant allocation accepts projectId',grant.includes('projectId:z.string().min(1).optional()')],
 ['Grant allocation validates project existence',grant.includes('grant_project_not_found')],
 ['Closed program project cannot receive allocations',grant.includes('grant_project_closed')],
 ['Grant allocation enforces project and grant match',grant.includes('grant_project_funding_mismatch')],
 ['Grant allocation stays inside project dates',grant.includes('grant_allocation_outside_project_period')],
 ['Existing 100 percent overlap guard remains',grant.includes('grant_allocation_over_100')&&grant.includes('total>100.0001')],
 ['Program Workforce read API is no-store',exists('src/app/api/organizations/[orgId]/opsiqo-one/program-workforce/route.ts')&&read('src/app/api/organizations/[orgId]/opsiqo-one/program-workforce/route.ts').includes('private, no-store')],
 ['Program project write API exists',exists('src/app/api/organizations/[orgId]/opsiqo-one/program-workforce/project/route.ts')],
 ['Program Workforce UI exists',exists('src/components/program-workforce-workspace.tsx')&&exists('src/app/program-workforce/page.tsx')],
 ['Program UI labels the full evidence chain',read('src/components/program-workforce-workspace.tsx').includes('Project → Grant → Position → Worker → Cost')],
 ['Program UI states cost does not infer salary',read('src/components/program-workforce-workspace.tsx').includes('Do not infer salary')],
 ['Daily Brief consumes program evidence only for workforce readers',brief.includes('programWorkforceDashboard')&&brief.includes("permissions.includes('workforce.read')")],
 ['Meeting workflow promotion function exists',meeting.includes('promoteMeetingActionsToWorkflow')],
 ['Meeting workflow promotion requires workflow.manage',meeting.includes("permissions.includes('workflow.manage')")],
 ['Meeting workflow promotion is creator scoped',meeting.includes("before.createdBy!==a.uid")],
 ['Meeting workflow promotion requires reviewed draft',meeting.includes("before.status!=='reviewed'")&&meeting.includes('meeting_action_review_required')],
 ['Meeting workflow promotion blocks duplicate promotion',meeting.includes('meeting_action_already_promoted')],
 ['Meeting promotion only uses open selected actions',meeting.includes("x.status==='open'")],
 ['Promoted meeting workflow is manual',meeting.includes("trigger:'manual'")],
 ['Promoted meeting workflow is disabled',meeting.includes('enabled:false')],
 ['Promoted meeting workflow requires separate activation',domain.includes('requiresSeparateActivation:true')&&meeting.includes('requiresSeparateActivation:true')],
 ['Meeting promotion is audit-recorded',meeting.includes("action:'opsiqo_one.meeting_action.promote_workflow'")],
 ['Meeting audit still redacts private meeting content',meeting.includes("content:'[private meeting content]'" )],
 ['Meeting promotion API exists',exists('src/app/api/organizations/[orgId]/opsiqo-one/meeting-actions/[draftId]/promote/route.ts')],
 ['Meeting UI exposes promotion only for workflow managers',read('src/components/meeting-actions-workspace.tsx').includes("actor.permissions.includes('workflow.manage')")],
 ['Safe execution service exists',exists('src/lib/opsiqo-one/safe-execution.ts')],
 ['Safe execution allowlist contains only visible-notification read action',safe.includes("id:'notifications.mark_visible_read'")&&safe.match(/id:'/g)?.length===1],
 ['Safe execution requires notifications.read',safe.includes("permissions.includes('notifications.read')")],
 ['Safe execution delegates to authoritative notification service',safe.includes('markVisibleNotificationsRead(actor,100)')],
 ['Safe execution cannot accept arbitrary routed commands',safe.includes('opsiqo_safe_action_not_allowed')],
 ['Notification bulk read is restricted to direct actor-targeted notifications',notifications.includes('markVisibleNotificationsRead')&&notifications.includes('n.targetUid===actor.uid')&&notifications.includes('visibleToActor(n,actor)')],
 ['Notification bulk read does not mutate shared role notifications',notifications.includes("scope:'direct_target_uid_only'")],
 ['Notification bulk read changes unread visible records only',notifications.includes("n.status!=='read'")],
 ['Notification bulk read is capped',notifications.includes('Math.min(limit,100)')],
 ['Notification bulk read is audited',notifications.includes("action:'notifications.visible.mark_read'")],
 ['Command mode supports execute',read('src/domain/opsiqo-one.ts').includes("'execute' | 'ai'")],
 ['Consequential guard still runs before safe execution patterns',router.indexOf('for(const item of blockedConsequential)')<router.indexOf('for(const item of patterns)')],
 ['Safe command is explicit notification-read wording',router.includes('Mark my visible notifications read')&&router.includes("mode:'execute'")],
 ['Safe execution is blocked without its permission',router.includes("permissions:['notifications.read']")],
 ['Command API calls safe executor only for execute mode',commandApi.includes("routed.mode==='execute'")&&commandApi.includes('executeSafeOpsiQoAction')],
 ['Command API still performs no direct Firestore writes',!commandApi.includes('adminDb(')&&!commandApi.includes('.collection(')&&!commandApi.includes('.doc(')],
 ['Safe execution returns an auditable receipt',domain.includes('SafeExecutionReceipt')&&safe.includes('affectedCount:result.affectedCount')],
 ['Cortex safe execution is a dedicated synthetic executor',orchestration.includes("agents:['safe-self-service']")&&orchestration.includes("agentName:'Safe Self-Service Executor'" )],
 ['Safe executor is restricted to low-risk execute mode',orchestration.includes("routed.mode==='execute'&&routed.risk==='low'")],
 ['Safe executor explicitly cannot perform HR or security decisions',orchestration.includes('employment, compensation, approval, personnel, workflow activation, security or tenant-administration decisions')],
 ['Normal built-in Cortex agents still have no execute hard cap',!cortex.includes("maxActionLevel:'execute'")],
 ['Accessibility preferences include high contrast',appearance.includes('highContrast:boolean')&&settings.includes('High contrast interface')],
 ['Accessibility preferences include strong focus',appearance.includes('strongFocus:boolean')&&settings.includes('Strong keyboard focus indicators')],
 ['Accessibility preferences include underlined links',appearance.includes('underlineLinks:boolean')&&settings.includes('Underline text links')],
 ['Accessibility preferences retain reduced motion and large text',appearance.includes('reducedMotion:boolean')&&appearance.includes("export type AppearanceFontScale='normal'|'large'")],
 ['Strong focus-visible CSS exists',css.includes('data-strong-focus="true"')&&css.includes(':focus-visible')],
 ['High contrast CSS exists',css.includes('data-high-contrast="true"')],
 ['Forced-colors support exists',css.includes('@media (forced-colors: active)')],
 ['Primary controls have 44px target hardening',css.includes('min-block-size:44px')],
 ['Route announcer exists',exists('src/components/route-announcer.tsx')&&appShell.includes('<RouteAnnouncer />')],
 ['Route announcer uses polite live status semantics',read('src/components/route-announcer.tsx').includes('aria-live="polite"')&&read('src/components/route-announcer.tsx').includes('role="status"')],
 ['Existing skip link remains present',appShell.includes('Skip to main content')],
 ['Accessibility readiness service exists',exists('src/lib/opsiqo-one/experience-readiness.ts')],
 ['Accessibility target is WCAG 2.2 AA',readiness.includes("target:'WCAG 2.2 AA'" )],
 ['Accessibility dashboard does not make a false conformance claim',readiness.includes('not a WCAG conformance claim')&&readiness.includes('manual keyboard, screen-reader, zoom/reflow, contrast and authentication testing')],
 ['Experience readiness API is no-store',exists('src/app/api/organizations/[orgId]/opsiqo-one/experience-readiness/route.ts')&&read('src/app/api/organizations/[orgId]/opsiqo-one/experience-readiness/route.ts').includes('private, no-store')],
 ['Experience readiness workspace exists',exists('src/components/experience-readiness-workspace.tsx')&&exists('src/app/experience-readiness/page.tsx')],
 ['Four supported UI/AI locales remain explicit',shell.includes("en:{")&&shell.includes("fr:{")&&shell.includes("es:{")&&shell.includes("ar:{")],
 ['Arabic remains RTL at application level',language.includes("effective==='ar'?'rtl':'ltr'")],
 ['Locale changes emit a shell update event',language.includes('opsiqo:locale-changed')],
 ['Global mobile outcomes consume shared translations',mobile.includes('shellText')&&mobile.includes('useShellLocale')],
 ['Desktop primary outcomes consume shared translations',nav.includes("shellText('Home',shellLocale)")&&nav.includes("shellText('My Work',shellLocale)")],
 ['Ask OPSIQO shell consumes shared translations',read('src/components/opsiqo-command-bar.tsx').includes('useShellLocale')&&read('src/components/opsiqo-command-bar.tsx').includes("shellText('Ask OPSIQO',shellLocale)" )],
 ['AI language instruction preserves canonical evidence',multi.includes('Preserve canonical evidence IDs, codes, names, numbers, dates and source-language quotations exactly')],
 ['Translation coverage keeps legacy gaps explicit',readiness.includes("coverage:'legacy_review_required'")&&readiness.includes('does not label legacy screens fully translated')],
 ['Navigation exposes Program Workforce',nav.includes("label:'Program Workforce',href:'/program-workforce',permission:'workforce.read'" )],
 ['Navigation exposes Experience Readiness',nav.includes("label:'Experience Readiness',href:'/experience-readiness',permission:'self.read'" )],
 ['More hub exposes Program Workforce',more.includes("['Program Workforce','/program-workforce']")],
 ['More hub exposes Experience Readiness',more.includes("['Experience Readiness','/experience-readiness']")],
 ['Ask OPSIQO routes Program Workforce',router.includes("href:'/program-workforce'")],
 ['Ask OPSIQO routes Experience Readiness',router.includes("href:'/experience-readiness'")],
 ['Grant Workforce Cortex agent now covers program workforce chain',cortex.includes('Program workforce chain')&&orchestration.includes("'grant-workforce':/" )],
 ['Five primary outcomes remain intact',['Home','My Work','People','Intelligence','More'].every(x=>nav.includes(`shellText('${x}',shellLocale)`))],
 ['Product identity is V7.16 or newer while retaining HCM v8.5',/v7\.(?:16|1[7-9]|[2-9]\d) · HCM v8\.5/.test(nav)],
 ['V7.15 connected workforce layer remains present',exists('src/lib/opsiqo-one/unified-workforce.ts')&&exists('src/lib/opsiqo-one/grant-workforce.ts')&&exists('src/lib/opsiqo-one/meeting-actions.ts')],
 ['V7.14 adaptive/mobile layer remains present',exists('src/lib/preferences/adaptive-navigation.ts')&&exists('src/components/mobile-outcome-nav.tsx')],
 ['V7.13 Agent Builder remains present',exists('src/lib/opsiqo-one/agent-builder.ts')],
 ['V7.12 Scenario Lab remains present',exists('src/lib/opsiqo-one/scenario-lab.ts')],
 ['V7.11 AI governance remains present',exists('src/lib/opsiqo-one/agent-governance.ts')],
 ['V7.10 consequential command governance remains present',router.includes('OPSIQO will not execute this consequential employment decision')],
];
let fail=0;for(const[name,ok]of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++}console.log(`\nOPSIQO ONE V7.16 Accessible Multilingual Program Execution audit: ${checks.length-fail}/${checks.length} PASS`);if(fail)process.exit(1);
