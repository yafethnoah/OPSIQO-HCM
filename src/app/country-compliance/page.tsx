import { PageHeader } from '@/components/page-header';
import { CountryComplianceWorkspace } from '@/components/country-compliance-workspace';

export default function CountryCompliancePage() {
  return (
    <>
      <PageHeader
        title="Country Compliance"
        subtitle="Jurisdiction-specific employment law, statutory payroll governance and evidence-gated country packs — separated from generic Payroll."
      />
      <CountryComplianceWorkspace />
    </>
  );
}