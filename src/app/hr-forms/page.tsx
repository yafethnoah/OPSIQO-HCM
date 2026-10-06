import { PageHeader } from '@/components/page-header';
import { HrFormsWorkspace } from '@/components/hr-forms-workspace';

export default function HrFormsPage(){
  return <><PageHeader title="HR Forms & Workflows" subtitle="Build, govern, publish, run and analyze organization-specific HR forms with controlled AI assistance and existing OPSIQO workflows."/><HrFormsWorkspace/></>;
}
