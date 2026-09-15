export interface RegisteredPayrollProvider {
  code: string;
  name: string;
  adapterCode: string;
  mappingVersions: string[];
  environments: Array<'uat' | 'production'>;
  description: string;
}

export const PAYROLL_PROVIDER_REGISTRY: RegisteredPayrollProvider[] = [
  {
    code: 'EVIDENCE_UAT',
    name: 'Evidence Sandbox UAT',
    adapterCode: 'evidence-sandbox',
    mappingVersions: ['v1'],
    environments: ['uat'],
    description: 'Evidence-only UAT adapter. No production payment transmission.',
  },
];

export function findRegisteredPayrollProvider(
  code: string,
  adapterCode: string,
  mappingVersion: string,
  environment: 'uat' | 'production',
) {
  return PAYROLL_PROVIDER_REGISTRY.find(
    (entry) =>
      entry.code === code &&
      entry.adapterCode === adapterCode &&
      entry.mappingVersions.includes(mappingVersion) &&
      entry.environments.includes(environment),
  );
}