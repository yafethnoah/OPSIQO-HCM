import { PageHeader } from '@/components/page-header';
import { InvitationPanel } from '@/components/invitation-panel';
import { EmployeeImportPanel } from '@/components/employee-import-panel';
export default function MembersPage(){return <><PageHeader title="Members & Invitations" subtitle="Secure organization provisioning, role assignment and worker identity linking."/><EmployeeImportPanel title="Import employees for member linking" detail="Add employees from CSV, Excel/XLSX or PDF before inviting them as platform members. Import creates governed Core HR worker records only; membership still requires the secure invitation flow below."/><InvitationPanel/></>}
