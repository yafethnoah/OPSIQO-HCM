import { afterEach, describe, expect, it } from 'vitest';
import { buildReadinessSummary } from '@/lib/operations/readiness';

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

function setProductionBaseline() {
  process.env.NODE_ENV = 'production';
  process.env.FIREBASE_PROJECT_ID = 'opsiqo-prod';
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'opsiqo-prod';
  process.env.OPSIQO_FIREBASE_ADMIN_AUTH_MODE = 'service_account';
  process.env.FIREBASE_CLIENT_EMAIL = 'firebase-admin@example.test';
  process.env.FIREBASE_PRIVATE_KEY = 'private-key';
  process.env.FIREBASE_STORAGE_BUCKET = 'opsiqo-prod.firebasestorage.app';
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'opsiqo-prod.firebasestorage.app';
  process.env.APP_BASE_URL = 'https://hcm.example.test';
  process.env.NEXT_PUBLIC_APP_BASE_URL = 'https://hcm.example.test';
  process.env.OPSIQO_DEMO_MODE = 'false';
  process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE = 'false';
  process.env.OPSIQO_REQUIRE_APP_CHECK = 'true';
  process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY = 'site-key';
  process.env.OPSIQO_REQUIRE_ADMIN_MFA = 'true';
  process.env.OPSIQO_REQUIRE_CLEAN_DOCUMENT_SCAN = 'true';
  process.env.OPSIQO_JOB_SECRET = 'a'.repeat(40);
  process.env.OPSIQO_SURVEY_ANONYMITY_SECRET = 'b'.repeat(40);
  process.env.OPSIQO_REGULATORY_SOURCE_HOSTS = 'www.ontario.ca';
  process.env.OPSIQO_ENABLE_PLATFORM_RELIABILITY = 'true';
  process.env.OPSIQO_BACKUP_EVIDENCE_MODE = 'firebase_pitr';
  process.env.OPSIQO_PLATFORM_MONITORING_SOURCE = 'cloud-monitoring-prod';
  process.env.OPSIQO_PRODUCTION_EVIDENCE_REF = 'ci-run-12345';
  process.env.OPSIQO_CLOUD_DR_EVIDENCE_REF = 'cloud-dr-12345';
  process.env.OPSIQO_DR_EXERCISE_EVIDENCE_REF = 'dr-test-12345';
  process.env.OPSIQO_AI_PROVIDER = 'openai';
  process.env.OPSIQO_REQUIRE_GOVERNED_AI_CONFIG = 'true';
  process.env.OPENAI_API_KEY = 'test-key';
}

describe('production readiness', () => {
  it('passes a complete production configuration without exposing secret values', () => {
    setProductionBaseline();
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(true);
    expect(JSON.stringify(summary)).not.toContain('test-key');
    expect(JSON.stringify(summary)).not.toContain('private-key');
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

  it('fails when Firebase project identifiers do not match', () => {
    setProductionBaseline();
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'wrong-project';
    const summary = buildReadinessSummary();
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'firebase_project')?.status).toBe('fail');
  });
});
