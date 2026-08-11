import { PageHeader } from '@/components/page-header';
import { EmployeeProfile } from '@/components/employee-profile';

export default async function EmployeePage({ params }: { params: Promise<{ workerId: string }> }) {
  const { workerId } = await params;
  return <><PageHeader title="Employee Profile" subtitle="Authoritative employee record, assignments, manager hierarchy and effective-dated history." /><EmployeeProfile workerId={workerId} /></>;
}
