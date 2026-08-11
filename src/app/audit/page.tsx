import { PageHeader } from '@/components/page-header';
import { AuditTable } from '@/components/audit-table';
export default function AuditPage(){ return <><PageHeader title="Audit Trail" subtitle="Traceable, append-only evidence of sensitive HR and configuration actions."/><AuditTable/></>; }
