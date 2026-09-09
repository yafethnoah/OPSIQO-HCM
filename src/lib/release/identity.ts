import {
  deploymentEnvironment,
  runtimeMode,
} from '@/lib/runtime/deployment-environment';

export const OPSIQO_PRODUCT_RELEASE = process.env.OPSIQO_PRODUCT_RELEASE || '8.5-v7.32-H51';
export const OPSIQO_FEATURE_RELEASE = process.env.OPSIQO_FEATURE_RELEASE || 'H51';
export const OPSIQO_PATCH_RELEASE = process.env.OPSIQO_PATCH_RELEASE || 'H51.18';
export const OPSIQO_UPGRADE_PARENT_PATCH = 'H51.1';
export const OPSIQO_CERTIFIED_PATCH_LINEAGE = ['H50.6I', 'H50.6J', 'H50.6K', 'H50.6L', 'H51.1'] as const;
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
