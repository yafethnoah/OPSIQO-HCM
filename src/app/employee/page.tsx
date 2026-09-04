import { PageHeader } from '@/components/page-header';
import { EmployeePortalWorkspace } from '@/components/employee-portal-workspace';

export default function EmployeePortalPage(){
  return <div className="stack">
    <PageHeader title="Employee Portal" subtitle="Your personal OPSIQO workspace for time off, HR services, documents, learning, performance, pay, career and workplace support."/>
    <EmployeePortalWorkspace/>
  </div>;
}
