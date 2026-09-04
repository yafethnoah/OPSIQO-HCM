import { afterEach, describe, expect, it } from 'vitest';
import {
  deploymentEnvironment,
  isProductionDeployment,
} from '@/lib/runtime/deployment-environment';
import { buildReadinessSummary } from '@/lib/operations/readiness';
import { releaseIdentity } from '@/lib/release/identity';

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

function setSharedHealthyConfig(projectId: string) {
  Object.assign(process.env, { NODE_ENV: 'production' });
  delete process.env.OPSIQO_ENVIRONMENT;
  process.env.FIREBASE_PROJECT_ID = projectId;
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
  process.env.OPSIQO_FIREBASE_ADMIN_AUTH_MODE = 'adc';
  delete process.env.FIREBASE_CLIENT_EMAIL;
  delete process.env.FIREBASE_PRIVATE_KEY;
  process.env.FIREBASE_STORAGE_BUCKET = projectId + '.firebasestorage.app';
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = projectId + '.firebasestorage.app';
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'AIzaSyExampleFirebaseOnlyKey1234567890';
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = projectId + '.firebaseapp.com';
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:303296177079:web:0f5223d1a922b13d323e32';
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '303296177079';
  process.env.APP_BASE_URL = 'https://uat.opsiqo.ca';
  process.env.NEXT_PUBLIC_APP_BASE_URL = 'https://uat.opsiqo.ca';
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
  process.env.OPSIQO_PLATFORM_MONITORING_SOURCE = 'cloud-monitoring-uat';
  process.env.OPSIQO_AI_PROVIDER = 'openai';
  process.env.OPSIQO_REQUIRE_GOVERNED_AI_CONFIG = 'true';
  process.env.OPENAI_API_KEY = 'sk-testonly-7Xq4Vn9Kp2Lm8Rt5Ws3Za6Bc';
  process.env.OPSIQO_DEPLOYMENT_PLATFORM = 'firebase_app_hosting';
  process.env.OPSIQO_PRODUCTION_EVIDENCE_REF = '';
  process.env.OPSIQO_CLOUD_DR_EVIDENCE_REF = '';
  process.env.OPSIQO_DR_EXERCISE_EVIDENCE_REF = '';
  process.env.OPSIQO_APP_HOSTING_FRAMEWORK_EVIDENCE_REF = '';
}

describe('OPSIQO V7.35 / H35 UAT runtime identity closure', () => {
  it('does not classify an App Hosting UAT runtime as production solely because NODE_ENV is production', () => {
    setSharedHealthyConfig('opsiqo-hcm-uat-2026');
    expect(deploymentEnvironment()).toBe('uat');
    expect(isProductionDeployment()).toBe(false);
  });

  it('allows UAT readiness without production-only evidence references while retaining core checks', () => {
    setSharedHealthyConfig('opsiqo-hcm-uat-2026');
    const summary = buildReadinessSummary();
    expect(summary.environment).toBe('uat');
    expect(summary.runtimeMode).toBe('production');
    expect(summary.ok).toBe(true);
    expect(summary.checks.find((check) => check.code === 'production_evidence_ref')?.status).toBe('pass');
    expect(summary.checks.find((check) => check.code === 'cloud_dr_evidence_ref')?.status).toBe('pass');
    expect(summary.checks.find((check) => check.code === 'dr_exercise_evidence_ref')?.status).toBe('pass');
    expect(summary.checks.find((check) => check.code === 'app_hosting_framework_evidence')?.status).toBe('pass');
  });

  it('honors an explicit OPSIQO_ENVIRONMENT value over runtime inference', () => {
    setSharedHealthyConfig('neutral-project-2026');
    process.env.OPSIQO_ENVIRONMENT = 'uat';
    expect(deploymentEnvironment()).toBe('uat');
  });

  it('keeps production fail-closed when production evidence is absent', () => {
    setSharedHealthyConfig('opsiqo-hcm-prod-2026');
    process.env.OPSIQO_ENVIRONMENT = 'production';
    const summary = buildReadinessSummary();
    expect(summary.environment).toBe('production');
    expect(summary.ok).toBe(false);
    expect(summary.checks.find((check) => check.code === 'production_evidence_ref')?.status).toBe('fail');
    expect(summary.checks.find((check) => check.code === 'cloud_dr_evidence_ref')?.status).toBe('fail');
    expect(summary.checks.find((check) => check.code === 'dr_exercise_evidence_ref')?.status).toBe('fail');
    expect(summary.checks.find((check) => check.code === 'app_hosting_framework_evidence')?.status).toBe('fail');
  });

  it('reports truthful source-commit evidence semantics when App Hosting does not expose a commit env value', () => {
    setSharedHealthyConfig('opsiqo-hcm-uat-2026');
    delete process.env.OPSIQO_SOURCE_COMMIT;
    delete process.env.GITHUB_SHA;
    const identity = releaseIdentity();
    expect(identity.sourceCommit).toBeNull();
    expect(identity.sourceCommitEvidence).toBe('app_hosting_rollout_history');
    expect(identity.deploymentEnvironment).toBe('uat');
    expect(identity.runtimeMode).toBe('production');
  });
});
