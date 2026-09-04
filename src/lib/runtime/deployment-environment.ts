export type OpsiqoDeploymentEnvironment =
  | 'local'
  | 'development'
  | 'test'
  | 'uat'
  | 'staging'
  | 'production';

const recognized = new Set<OpsiqoDeploymentEnvironment>([
  'local',
  'development',
  'test',
  'uat',
  'staging',
  'production',
]);

function normalized(value: string | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function inferFromProjectId(): OpsiqoDeploymentEnvironment | null {
  const projectId = normalized(
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
  if (!projectId) return null;
  if (/(^|[-_])uat([-_]|$)/i.test(projectId)) return 'uat';
  if (/(^|[-_])(staging|stage)([-_]|$)/i.test(projectId)) return 'staging';
  return null;
}

export function runtimeMode(): string {
  return normalized(process.env.NODE_ENV) || 'development';
}

export function deploymentEnvironment(): OpsiqoDeploymentEnvironment {
  const explicit = normalized(process.env.OPSIQO_ENVIRONMENT);
  if (recognized.has(explicit as OpsiqoDeploymentEnvironment)) {
    return explicit as OpsiqoDeploymentEnvironment;
  }

  const projectEnvironment = inferFromProjectId();
  if (projectEnvironment) return projectEnvironment;

  const runtime = runtimeMode();
  if (runtime === 'test') return 'test';
  if (runtime === 'development') return 'development';
  if (runtime === 'production') return 'production';
  return 'local';
}

export function isProductionDeployment(): boolean {
  return deploymentEnvironment() === 'production';
}
