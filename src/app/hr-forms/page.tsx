import { PageHeader } from '@/components/page-header';
import { HrFormsOperationalWorkspace } from '@/components/hr-forms-operational-workspace';

export default function HrFormsPage(){
  return <>
    <PageHeader
      title="HR Forms & Workflows"
      subtitle="Generate, govern, assign, complete and track professional HR forms and form packs."
    />
    <HrFormsOperationalWorkspace/>
  </>;
}
