import {
  deploymentEnvironment,
  runtimeMode,
} from '@/lib/runtime/deployment-environment';

export const OPSIQO_PRODUCT_RELEASE = process.env.OPSIQO_PRODUCT_RELEASE || '8.5-v7.32-H50';
export const OPSIQO_FEATURE_RELEASE = process.env.OPSIQO_FEATURE_RELEASE || 'H50.6';
export const OPSIQO_PATCH_RELEASE = process.env.OPSIQO_PATCH_RELEASE || 'H50.6C';
export const OPSIQO_CERTIFICATION_BASELINE = process.env.OPSIQO_RELEASE_VERSION || '3.6.1';

function clean(value: string | undefined): string | null {
  const v = String(value || '').trim();
  return v || null;
}

export function releaseIdentity() {
  const sourceCommit = clean(process.env.OPSIQO_SOURCE_COMMIT || process.env.GITHUB_SHA);
  return {
    productRelease: OPSIQO_PRODUCT_RELEASE,
    featureRelease: OPSIQO_FEATURE_RELEASE,
    patchRelease: OPSIQO_PATCH_RELEASE,
    certificationBaseline: OPSIQO_CERTIFICATION_BASELINE,
    sourceCommit,
    sourceCommitEvidence: sourceCommit ? 'runtime_env' : 'app_hosting_rollout_history',
    deploymentRevision: clean(process.env.K_REVISION),
    deploymentEnvironment: deploymentEnvironment(),
    runtimeMode: runtimeMode(),
  };
}
