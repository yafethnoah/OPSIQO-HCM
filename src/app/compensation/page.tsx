import { PageHeader } from '@/components/page-header';
import { CompensationWorkspace } from '@/components/compensation-workspace';

export default function CompensationPage(){
  return <>
    <PageHeader
      title="Compensation Center"
      subtitle="Governed pay intelligence, salary architecture, market benchmarks, compensation cycles, total rewards, pay-equity review and transparent compensation decisions."
    />
    <CompensationWorkspace/>
  </>;
}
