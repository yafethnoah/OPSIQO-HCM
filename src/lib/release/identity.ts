export const OPSIQO_PRODUCT_RELEASE = process.env.OPSIQO_PRODUCT_RELEASE || '8.5-v7.9.3';
export const OPSIQO_CERTIFICATION_BASELINE = process.env.OPSIQO_RELEASE_VERSION || '3.6.1';

function clean(value: string | undefined): string | null {
  const v = String(value || '').trim();
  return v || null;
}

export function releaseIdentity() {
  return {
    productRelease: OPSIQO_PRODUCT_RELEASE,
    certificationBaseline: OPSIQO_CERTIFICATION_BASELINE,
    sourceCommit: clean(process.env.OPSIQO_SOURCE_COMMIT || process.env.GITHUB_SHA),
    deploymentRevision: clean(process.env.K_REVISION),
  };
}
