export type ReadinessStatus = 'pass' | 'warn' | 'fail';

export interface ReadinessCheck {
  code: string;
  status: ReadinessStatus;
  message: string;
}

export interface ReadinessSummary {
  ok: boolean;
  service: string;
  version: string;
  environment: string;
  checkedAt: string;
  checks: ReadinessCheck[];
}

const value = (key: string) => String(process.env[key] || '').trim();
const enabled = (key: string) => value(key).toLowerCase() === 'true';

function looksPlaceholder(raw: string): boolean {
  const v = String(raw || '').trim();
  if (!v) return true;
  return /^(?:PASTE|YOUR|CHANGE_ME|CHANGEME|REPLACE|TODO|TBD|EXAMPLE|<|__)/i.test(v)
    || /(?:_HERE|HERE>|PLACEHOLDER)/i.test(v);
}

function validFirebaseWebConfig(): boolean {
  const apiKey = value('NEXT_PUBLIC_FIREBASE_API_KEY');
  const authDomain = value('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  const appId = value('NEXT_PUBLIC_FIREBASE_APP_ID');
  const senderId = value('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');

  if ([apiKey, authDomain, appId, senderId].some(looksPlaceholder)) return false;
  if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(apiKey)) return false;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(authDomain)) return false;
  const appMatch = appId.match(/^1:(\d+):web:[0-9a-f]+$/i);
  if (!appMatch) return false;
  if (!/^\d{6,}$/.test(senderId)) return false;
  return appMatch[1] === senderId;
}

function push(checks: ReadinessCheck[], code: string, status: ReadinessStatus, message: string) {
  checks.push({ code, status, message });
}

export function buildReadinessSummary(): ReadinessSummary {
  const checks: ReadinessCheck[] = [];
  const production = process.env.NODE_ENV === 'production';
  const serverProject = value('FIREBASE_PROJECT_ID');
  const clientProject = value('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  const serverBucket = value('FIREBASE_STORAGE_BUCKET');
  const clientBucket = value('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  const aiProvider = (value('OPSIQO_AI_PROVIDER') || 'demo').toLowerCase();

  push(checks, 'firebase_project', !looksPlaceholder(serverProject) && !looksPlaceholder(clientProject) && serverProject === clientProject ? 'pass' : 'fail',
    'Server and client Firebase project identifiers must both exist, be non-placeholder values, and match.');
  const firebaseAdminAuthMode = (value('OPSIQO_FIREBASE_ADMIN_AUTH_MODE') || 'service_account').toLowerCase();
  const firebaseAdminConfigured = firebaseAdminAuthMode === 'adc'
    || (firebaseAdminAuthMode === 'service_account' && Boolean(value('FIREBASE_CLIENT_EMAIL')) && Boolean(value('FIREBASE_PRIVATE_KEY')));
  push(checks, 'firebase_admin', ['service_account', 'adc'].includes(firebaseAdminAuthMode) && firebaseAdminConfigured ? 'pass' : 'fail',
    'Firebase Admin must use an explicitly selected service_account credential injection or Application Default Credentials (ADC) workload identity.');
  push(checks, 'storage_bucket', !looksPlaceholder(serverBucket) && !looksPlaceholder(clientBucket) && serverBucket === clientBucket ? 'pass' : 'fail',
    'Server and client storage bucket identifiers must both exist, be non-placeholder values, and match.');
  push(checks, 'firebase_web_config', validFirebaseWebConfig() ? 'pass' : 'fail',
    'Firebase Web configuration must contain real non-placeholder apiKey, authDomain, appId, and messagingSenderId values with a consistent appId/senderId pair.');
  push(checks, 'https_base_url', /^https:\/\//i.test(value('APP_BASE_URL')) && /^https:\/\//i.test(value('NEXT_PUBLIC_APP_BASE_URL')) ? 'pass' : production ? 'fail' : 'warn',
    'Production application base URLs must use HTTPS.');
  push(checks, 'demo_disabled', !production || (!enabled('OPSIQO_DEMO_MODE') && !enabled('NEXT_PUBLIC_OPSIQO_DEMO_MODE')) ? 'pass' : 'fail',
    'Production must not run with server or client demo mode enabled.');
  push(checks, 'app_check', !production || (enabled('OPSIQO_REQUIRE_APP_CHECK') && Boolean(value('NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY'))) ? 'pass' : 'fail',
    'Production requires Firebase App Check enforcement and a configured web key.');
  push(checks, 'privileged_mfa', !production || enabled('OPSIQO_REQUIRE_ADMIN_MFA') ? 'pass' : 'fail',
    'Production privileged HR/admin access must require MFA.');
  push(checks, 'document_scan_gate', !production || enabled('OPSIQO_REQUIRE_CLEAN_DOCUMENT_SCAN') ? 'pass' : 'fail',
    'Production governed-document downloads must require clean scan evidence.');
  push(checks, 'automation_secret', !production || value('OPSIQO_JOB_SECRET').length >= 32 ? 'pass' : 'fail',
    'Production automation secret must contain at least 32 characters.');
  push(checks, 'survey_secret', !production || value('OPSIQO_SURVEY_ANONYMITY_SECRET').length >= 32 ? 'pass' : 'fail',
    'Production survey anonymity secret must contain at least 32 characters.');
  push(checks, 'regulatory_source_allowlist', !production || value('OPSIQO_REGULATORY_SOURCE_HOSTS').split(',').map(v=>v.trim()).filter(Boolean).length > 0 ? 'pass' : 'fail',
    'Production regulatory source monitoring requires an explicit comma-separated public-host allow-list.');
  const enterpriseSso=enabled('OPSIQO_ENABLE_ENTERPRISE_SSO');
  push(checks, 'identity_host_allowlist', !production || !enterpriseSso || value('OPSIQO_IDENTITY_HOSTS').split(',').map(v=>v.trim()).filter(Boolean).length > 0 ? 'pass' : 'fail',
    'When enterprise SSO is enabled in production, an explicit public-host allow-list is required for OIDC/SAML metadata validation.');
  push(checks, 'privileged_identity_provider_allowlist', !production || !enterpriseSso || value('OPSIQO_ALLOWED_ADMIN_PROVIDERS').split(',').map(v=>v.trim()).filter(Boolean).length > 0 ? 'pass' : 'fail',
    'When enterprise SSO is enabled in production, privileged HR/admin identities require an explicit provider allow-list.');
  const securityOps=enabled('OPSIQO_ENABLE_SECURITY_OPERATIONS');
  const securitySecretMap=value('OPSIQO_SECURITY_EVENT_INGEST_SECRETS_JSON');let mappedSecuritySecretsValid=false;if(securitySecretMap){try{const m=JSON.parse(securitySecretMap) as Record<string,string>;mappedSecuritySecretsValid=Object.keys(m).length>0&&Object.values(m).every(v=>String(v).length>=32)}catch{mappedSecuritySecretsValid=false}}const singleSecuritySecretValid=value('OPSIQO_SECURITY_EVENT_INGEST_SECRET').length>=32&&Boolean(value('OPSIQO_SECURITY_EVENT_INGEST_ORG_ID'));
  push(checks, 'security_event_ingest_secret', !production || !securityOps || mappedSecuritySecretsValid || singleSecuritySecretValid ? 'pass' : 'fail',
    'When external security-event ingestion is enabled in production, use per-organization secrets or bind a >=32-character single-tenant secret to one organization id.');
  push(checks, 'security_siem_host_allowlist', !production || !securityOps || value('OPSIQO_SECURITY_SIEM_HOSTS').split(',').map(v=>v.trim()).filter(Boolean).length > 0 ? 'pass' : 'fail',
    'When Security Operations external SIEM/SOC exchange is enabled in production, an exact public-host allow-list is required.');
  const externalIntegrations=enabled('OPSIQO_ENABLE_EXTERNAL_INTEGRATIONS');
  push(checks, 'integration_host_allowlist', !production || !externalIntegrations || value('OPSIQO_INTEGRATION_HOSTS').split(',').map(v=>v.trim()).filter(Boolean).length > 0 ? 'pass' : 'fail',
    'When external integrations are enabled in production, an explicit public-host allow-list is required.');
  const webhookMaxBodyBytes=Number(value('OPSIQO_WEBHOOK_MAX_BODY_BYTES') || '1048576');
  push(checks, 'integration_webhook_body_limit', !production || !externalIntegrations || (Number.isInteger(webhookMaxBodyBytes) && webhookMaxBodyBytes >= 1024 && webhookMaxBodyBytes <= 5 * 1024 * 1024) ? 'pass' : 'fail',
    'When external integrations are enabled in production, webhook body limits must be between 1 KiB and 5 MiB.');
  const platformReliability=enabled('OPSIQO_ENABLE_PLATFORM_RELIABILITY');
  const backupEvidenceMode=value('OPSIQO_BACKUP_EVIDENCE_MODE').toLowerCase();
  push(checks, 'platform_reliability_enabled', !production || platformReliability ? 'pass' : 'fail',
    'Production promotion requires the Platform Reliability & Supply Chain control plane to be explicitly enabled.');
  push(checks, 'backup_evidence_mode', !production || ['firebase_pitr','external_backup','governed_manual'].includes(backupEvidenceMode) ? 'pass' : 'fail',
    'Production must declare the governed backup-evidence mode; this configuration does not itself prove backup or restore capability.');
  push(checks, 'platform_monitoring_source', !production || value('OPSIQO_PLATFORM_MONITORING_SOURCE').length > 0 ? 'pass' : 'fail',
    'Production must identify the approved monitoring/evidence source used for platform SLO evidence.');
  push(checks, 'production_evidence_ref', !production || value('OPSIQO_PRODUCTION_EVIDENCE_REF').length >= 8 ? 'pass' : 'fail',
    'Production deployment must reference the approved v3.6.1 CI production-evidence bundle/run. A reference is traceability metadata, not proof by itself.');
  push(checks, 'cloud_dr_evidence_ref', !production || value('OPSIQO_CLOUD_DR_EVIDENCE_REF').length >= 8 ? 'pass' : 'fail',
    'Production deployment must reference current cloud PITR/backup evidence captured from the production project.');
  push(checks, 'dr_exercise_evidence_ref', !production || value('OPSIQO_DR_EXERCISE_EVIDENCE_REF').length >= 8 ? 'pass' : 'fail',
    'Production deployment must reference the independently reviewed controlled restore/DR exercise evidence.');
  push(checks, 'governed_ai', !production || (aiProvider !== 'demo' && enabled('OPSIQO_REQUIRE_GOVERNED_AI_CONFIG')) ? 'pass' : 'fail',
    'Production AI must use an approved non-demo provider and governed prompt/model configuration.');
  push(checks, 'ai_credential', !production || (aiProvider === 'openai' ? Boolean(value('OPENAI_API_KEY')) : aiProvider === 'gemini' ? Boolean(value('GEMINI_API_KEY')) : false) ? 'pass' : 'fail',
    'The selected production AI provider credential must be available server-side.');
  const deploymentPlatform = value('OPSIQO_DEPLOYMENT_PLATFORM').toLowerCase();
  push(checks, 'deployment_platform', !production || deploymentPlatform === 'firebase_app_hosting' ? 'pass' : 'fail',
    'Production certification must declare the approved deployment platform. This release is certified for firebase_app_hosting only.');
  const appHostingEvidence = value('OPSIQO_APP_HOSTING_FRAMEWORK_EVIDENCE_REF');
  push(checks, 'app_hosting_framework_evidence', !production || deploymentPlatform !== 'firebase_app_hosting' || appHostingEvidence.length >= 8 ? 'pass' : 'fail',
    'Next.js 16 on Firebase App Hosting requires a real controlled staging/UAT compatibility evidence reference; configuration alone is not certification.');

  const ok = checks.every((check) => check.status !== 'fail');
  return {
    ok,
    service: 'opsiqo-hcm',
    version: value('OPSIQO_RELEASE_VERSION') || '3.6.1',
    environment: process.env.NODE_ENV || 'development',
    checkedAt: new Date().toISOString(),
    checks,
  };
}
