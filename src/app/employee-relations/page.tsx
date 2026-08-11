import { PageHeader } from '@/components/page-header';
import { EmployeeRelationsWorkspace } from '@/components/employee-relations-workspace';

export default function EmployeeRelationsPage(){
  return <><PageHeader title="Employee Relations & Case Management" subtitle="Confidential intake, investigations, accommodations, actions, legal holds, and evidence-backed case governance."/><EmployeeRelationsWorkspace/></>;
}
