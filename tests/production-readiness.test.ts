import { afterEach, describe, expect, it } from 'vitest';
import { buildReadinessSummary } from '@/lib/operations/readiness';

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

function setProductionBaseline() {
  Object.assign(process.env, { NODE_ENV: 'production' });
  process.env.FIREBASE_PROJECT_ID = 'opsiqo-prod';
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'opsiqo-prod';
  process.env.OPSIQO_FIREBASE_ADMIN_AUTH_MODE = 'service_account';
  process.env.FIREBASE_CLIENT_EMAIL = 'firebase-admin@opsiqo-prod.iam.gserviceaccount.com';
  process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nTESTONLY-abcdef1234567890-TESTONLY\n-----END PRIVATE KEY-----';
  process.env.FIREBASE_STORAGE_BUCKET = 'opsiqo-prod.firebasestorage.app';
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'opsiqo-prod.firebasestorage.app';
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'AIzaSyExampleFirebaseOnlyKey1234567890';
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'opsiqo-prod.firebaseapp.com';
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:303296177079:web:0f5223d1a922b13d323e32';
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '303296177079';
  process.env.APP_BASE_URL = 'https://hcm.example.test';
  process.env.NEXT_PUBLIC_APP_BASE_URL = 'https://hcm.example.test';
  process.env.OPSIQO_DEMO_MODE = 'false';
  process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE = 'false';
  process.env.OPSIQO_REQUIRE_APP_CHECK = 'true';
  process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY = 'app-check-test-key-1234567890';
  process.env.OPSIQO_REQUIRE_ADMIN_MFA = 'true';
  process.env.OPSIQO_REQUIRE_CLEAN_DOCUMENT_SCAN = 'true';
  process.env.OPSIQO_JOB_SECRET = 'job-secret-test-7Xq4Vn9Kp2Lm8Rt5Ws3Za6Bc';
  process.env.OPSIQO_SURVEY_ANONYMITY_SECRET = 'survey-secret-test-9Qm5Kt2Wr8Px4Vb7Nz6La3Cd';
  process.env.OPSIQO_REGULATORY_SOURCE_HOSTS = 'www.ontario.ca';
  process.env.OPSIQO_ENABLE_PLATFORM_RELIABILITY = 'true';
  process.env.OPSIQO_BACKUP_EVIDENCE_MODE = 'firebase_pitr';
  process.env.OPSIQO_PLATFORM_MONITORING_SOURCE = 'cloud-monitoring-prod';
  process.env.OPSIQO_PRODUCTION_EVIDENCE_REF = 'ci-run-12345';
  process.env.OPSIQO_CLOUD_DR_EVIDENCE_REF = 'cloud-dr-12345';
  process.env.OPSIQO_DR_EXERCISE_EVIDENCE_REF = 'dr-test-12345';
  process.env.OPSIQO_AI_PROVIDER = 'openai';
  process.env.OPSIQO_REQUIRE_GOVERNED_AI_CONFIG = 'true';
  process.env.OPENAI_API_KEY = 'sk-testonly-7Xq4Vn9Kp2Lm8Rt5Ws3Za6Bc';
  process.env.OPSIQO_DEPLOYMENT_PLATFORM = 'firebase_app_hosting';
  process.env.OPSIQO_APP_HOSTING_FRAMEWORK_EVIDENCE_REF = 'app-hosting-uat-12345';
}

describe('production readiness', () => {
  it('passes a complete production configuration without exposing secret values', () => {
    setProductionBaseline();
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(true);
    const serialized = JSON.stringify(summary);
    const secretValues = [
      process.env.FIREBASE_PRIVATE_KEY,
      process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY,
      process.env.OPSIQO_JOB_SECRET,
      process.env.OPSIQO_SURVEY_ANONYMITY_SECRET,
      process.env.OPENAI_API_KEY,
    ].filter((secret): secret is string => Boolean(secret));
    for (const secret of secretValues) expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain('test-key');
    expect(serialized).not.toContain('private-key');
  });

  it('accepts explicitly configured Firebase Admin ADC mode without long-lived key fields', () => {
    setProductionBaseline();
    process.env.OPSIQO_FIREBASE_ADMIN_AUTH_MODE = 'adc';
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    const summary = buildReadinessSummary();
    expect(summary.checks.find((check) => check.code === 'firebase_admin')?.status).toBe('pass');
  });

  it('fails closed when v3.6.1 production evidence references are absent', () => {
    setProductionBaseline();
    process.env.OPSIQO_PRODUCTION_EVIDENCE_REF = '';
    process.env.OPSIQO_CLOUD_DR_EVIDENCE_REF = '';
    process.env.OPSIQO_DR_EXERCISE_EVIDENCE_REF = '';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'production_evidence_ref')?.status).toBe('fail');
    expect(summary.checks.find((check) => check.code === 'cloud_dr_evidence_ref')?.status).toBe('fail');
    expect(summary.checks.find((check) => check.code === 'dr_exercise_evidence_ref')?.status).toBe('fail');
  });

  it('fails closed when the production regulatory-source allowlist is empty', () => {
    setProductionBaseline();
    process.env.OPSIQO_REGULATORY_SOURCE_HOSTS = '';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'regulatory_source_allowlist')?.status).toBe('fail');
  });

  it('fails closed when external integrations are enabled without an egress allowlist', () => {
    setProductionBaseline();
    process.env.OPSIQO_ENABLE_EXTERNAL_INTEGRATIONS = 'true';
    process.env.OPSIQO_INTEGRATION_HOSTS = '';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'integration_host_allowlist')?.status).toBe('fail');
  });

  it('fails closed when the production webhook body limit is outside the governed range', () => {
    setProductionBaseline();
    process.env.OPSIQO_ENABLE_EXTERNAL_INTEGRATIONS = 'true';
    process.env.OPSIQO_INTEGRATION_HOSTS = 'api.example.test';
    process.env.OPSIQO_WEBHOOK_MAX_BODY_BYTES = String(8 * 1024 * 1024);
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'integration_webhook_body_limit')?.status).toBe('fail');
  });

  it('fails when production demo mode is enabled', () => {
    setProductionBaseline();
    process.env.OPSIQO_DEMO_MODE = 'true';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'demo_disabled')?.status).toBe('fail');
  });

  it('fails closed when Firebase Web configuration contains placeholder values', () => {
    setProductionBaseline();
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'PASTE_API_KEY_HERE';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'PASTE_AUTH_DOMAIN_HERE';
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'PASTE_MESSAGING_SENDER_ID_HERE';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'firebase_web_config')?.status).toBe('fail');
  });

  it('fails closed when Firebase appId and messagingSenderId disagree', () => {
    setProductionBaseline();
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '999999999999';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'firebase_web_config')?.status).toBe('fail');
  });

  it('fails closed when the production deployment platform is not Firebase App Hosting', () => {
    setProductionBaseline();
    process.env.OPSIQO_DEPLOYMENT_PLATFORM = 'other_platform';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'deployment_platform')?.status).toBe('fail');
  });

  it('fails closed when Firebase App Hosting compatibility evidence is absent', () => {
    setProductionBaseline();
    process.env.OPSIQO_APP_HOSTING_FRAMEWORK_EVIDENCE_REF = '';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'app_hosting_framework_evidence')?.status).toBe('fail');
  });

  it('fails when Firebase project identifiers do not match', () => {
    setProductionBaseline();
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'wrong-project';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'firebase_project')?.status).toBe('fail');
  });
  it('fails closed when Firebase Admin service-account values are placeholders or malformed', () => {
    setProductionBaseline();
    process.env.FIREBASE_CLIENT_EMAIL = 'firebase-admin@example.test';
    process.env.FIREBASE_PRIVATE_KEY = 'PASTE_PRIVATE_KEY_HERE';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'firebase_admin')?.status).toBe('fail');
  });

  it('fails closed when server and browser application origins drift apart', () => {
    setProductionBaseline();
    process.env.NEXT_PUBLIC_APP_BASE_URL = 'https://other.example.test';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'base_url_alignment')?.status).toBe('fail');
  });

  it('rejects path-bearing or credential-bearing production base URLs', () => {
    setProductionBaseline();
    process.env.APP_BASE_URL = 'https://user:pass@hcm.example.test/private';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'https_base_url')?.status).toBe('fail');
  });

  it('rejects trivial or placeholder production secrets and AI credentials', () => {
    setProductionBaseline();
    process.env.OPSIQO_JOB_SECRET = 'a'.repeat(40);
    process.env.OPSIQO_SURVEY_ANONYMITY_SECRET = 'CHANGE_ME_SURVEY_SECRET_12345678901234567890';
    process.env.OPENAI_API_KEY = 'PASTE_OPENAI_API_KEY_HERE';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'automation_secret')?.status).toBe('fail');
    expect(summary.checks.find((check) => check.code === 'survey_secret')?.status).toBe('fail');
    expect(summary.checks.find((check) => check.code === 'ai_credential')?.status).toBe('fail');
  });

});
