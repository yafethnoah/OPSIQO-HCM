import type { ActorContext } from '@/domain/security';
import type { AccessibilityReadinessDashboard,TranslationCoverageDashboard } from '@/domain/opsiqo-one-v7-16';
import { ApiError } from '@/lib/http/errors';

function requireSelf(actor:ActorContext){if(!actor.permissions.includes('self.read'))throw new ApiError(403,'Signed-in employee access required.','forbidden')}
const now=()=>new Date().toISOString();

export function accessibilityReadiness(actor:ActorContext):AccessibilityReadinessDashboard{
  requireSelf(actor);
  const evidence:AccessibilityReadinessDashboard['evidence']=[
    {criterion:'1.3.1 Info and Relationships',status:'manual_review_required',evidence:'Semantic headings, labels, tables and landmarks are used across OPSIQO ONE surfaces; complete legacy-screen review remains required. V7.17 adds a Chromium-backed public-route smoke; V7.18 adds an emulator-seeded authenticated-route browser smoke; V7.19 extended the authenticated matrix to Time & Leave, Learning/Skills and Recruiting. V7.20 adds Performance and Compensation. V7.21 extends authenticated browser coverage and reviewed Arabic markers to Compliance/Documents, Compliance Radar, Policy Intelligence, Employee Experience, Employee Service Center and Workflows. V7.22 adds Onboarding, Workforce Planning and Integrations; V7.23 adds Security Operations, Privacy Governance, Assurance and Platform Reliability to the authenticated production-governance matrix.'},
    {criterion:'1.4.3 Contrast (Minimum)',status:'manual_review_required',evidence:'Dark/light themes plus a user-selectable high-contrast mode are implemented; automated and visual contrast verification remains required across every legacy state.'},
    {criterion:'1.4.10 Reflow',status:'manual_review_required',evidence:'Responsive grids, global mobile outcome navigation and shrink-safe OPSIQO ONE surfaces are implemented; full 320 CSS-pixel regression remains a certification gate.'},
    {criterion:'2.1.1 Keyboard',status:'manual_review_required',evidence:'Primary interactions use native links/buttons/inputs and skip navigation is available; complete keyboard journey certification remains required.'},
    {criterion:'2.4.1 Bypass Blocks',status:'implemented',evidence:'Authenticated and public shells expose a visible-on-focus Skip to main content link.'},
    {criterion:'2.4.7 Focus Visible',status:'implemented',evidence:'Strong :focus-visible indicators are enabled by default and can be reinforced through Appearance & accessibility settings.'},
    {criterion:'2.4.11 Focus Not Obscured (Minimum)',status:'manual_review_required',evidence:'Interactive controls receive scroll margins and the mobile outcome bar reserves bottom content space; browser-level journey verification remains required.'},
    {criterion:'2.5.8 Target Size (Minimum)',status:'implemented',evidence:'Primary interactive controls are hardened to a 44 CSS-pixel minimum block size, exceeding the WCAG 2.2 AA 24 CSS-pixel minimum for those controls.'},
    {criterion:'3.1.2 Language of Parts',status:'manual_review_required',evidence:'Application-level language and Arabic RTL direction are implemented; mixed-language document fragments still require source-specific markup review.'},
    {criterion:'3.2.3 Consistent Navigation',status:'implemented',evidence:'Home, My Work, People, Intelligence and More remain the five global outcomes on desktop and mobile.'},
    {criterion:'3.3.2 Labels or Instructions',status:'manual_review_required',evidence:'V7.16 forms use explicit labels and governed error messages; legacy forms remain part of the full accessibility certification pass.'},
    {criterion:'4.1.3 Status Messages',status:'implemented',evidence:'Route changes and save/error outcomes expose polite status/live-region semantics without forcing focus changes.'},
  ];
  return{target:'WCAG 2.2 AA',evidence,implemented:evidence.filter(x=>x.status==='implemented').length,manualReviewRequired:evidence.filter(x=>x.status==='manual_review_required').length,generatedAt:now(),certificationBoundary:'This dashboard is implementation evidence, not a WCAG conformance claim. OPSIQO should only claim WCAG 2.2 AA after automated scanning plus manual keyboard, screen-reader, zoom/reflow, contrast and authentication testing across supported browsers and representative workflows.'};
}

export function translationCoverage(actor:ActorContext):TranslationCoverageDashboard{
  requireSelf(actor);
  return{supportedLocales:['en','fr','es','ar'],rtlLocales:['ar'],surfaces:[
    {id:'home',label:'My OPSIQO / Home',coverage:'complete'},
    {id:'global-language',label:'Application lang/dir bootstrap',coverage:'complete'},
    {id:'ai-language',label:'Ask OPSIQO response-language governance',coverage:'complete'},
    {id:'primary-outcomes',label:'Primary outcome navigation',coverage:'complete'},
    {id:'opsiqo-one-v7-10-17',label:'OPSIQO ONE specialist workspaces',coverage:'foundation'},
    {id:'program-portfolio',label:'Program Portfolio',coverage:'complete'},
    {id:'signin-v7-18',label:'Sign-in exact-string catalog',coverage:'foundation'},
    {id:'setup-v7-18',label:'First-organization setup exact-string catalog',coverage:'foundation'},
    {id:'settings-v7-18',label:'Settings exact-string catalog',coverage:'foundation'},
    {id:'notifications-v7-18',label:'Notification Center exact-string catalog',coverage:'foundation'},
    {id:'time-v7-19',label:'Time & Leave exact-string catalog',coverage:'foundation'},
    {id:'learning-v7-19',label:'Learning & Skills exact-string catalog',coverage:'foundation'},
    {id:'recruiting-v7-20',label:'Recruiting exact-string catalog',coverage:'foundation'},
    {id:'performance-v7-20',label:'Performance exact-string catalog',coverage:'foundation'},
    {id:'compensation-v7-20',label:'Compensation exact-string catalog',coverage:'foundation'},
    {id:'compliance-v7-21',label:'Compliance & Documents exact-string catalog',coverage:'foundation'},
    {id:'policy-intelligence-v7-21',label:'Policy Intelligence exact-string catalog',coverage:'foundation'},
    {id:'compliance-radar-v7-21',label:'Compliance Radar exact-string catalog',coverage:'foundation'},
    {id:'experience-v7-21',label:'Employee Experience exact-string catalog',coverage:'foundation'},
    {id:'employee-service-v7-21',label:'Employee Service Center exact-string catalog',coverage:'foundation'},
    {id:'workflows-v7-21',label:'Workflow Designer exact-string catalog',coverage:'foundation'},
    {id:'onboarding-v7-22',label:'Onboarding exact-string catalog',coverage:'foundation'},
    {id:'workforce-planning-v7-22',label:'Workforce Planning exact-string catalog',coverage:'foundation'},
    {id:'integrations-v7-22',label:'Integration Command Center exact-string catalog',coverage:'foundation'},
    {id:'integration-runtime-v7-22',label:'Integration Runtime exact-string catalog',coverage:'foundation'},
    {id:'security-operations-v7-23',label:'Security Operations exact-string catalog',coverage:'foundation'},
    {id:'privacy-v7-23',label:'Privacy Governance exact-string catalog',coverage:'foundation'},
    {id:'assurance-v7-23',label:'Audit & Assurance exact-string catalog',coverage:'foundation'},
    {id:'platform-reliability-v7-23',label:'Platform Reliability exact-string catalog',coverage:'foundation'},
    {id:'meeting-actions',label:'Meeting → Action',coverage:'complete'},
    {id:'legacy-modules',label:'Legacy/deep specialist module UI',coverage:'legacy_review_required'},
  ],aiLanguagePreservesEvidence:true,generatedAt:now(),boundary:'OPSIQO supports English, French, Spanish and Arabic with Arabic RTL and evidence-preserving AI instructions. V7.18 adds an exact-string EN/FR/ES/AR surface catalog and authenticated browser locale verification tooling. V7.23 extends reviewed coverage through Security Operations, Privacy Governance, Audit & Assurance and Platform Reliability, while retaining all V7.18–V7.22 reviewed operational surfaces and Arabic RTL browser evidence. This report still does not label legacy screens fully translated until their visible strings, validation messages, dates/numbers and accessibility labels are catalogued and browser-tested in every supported locale.'};
}
