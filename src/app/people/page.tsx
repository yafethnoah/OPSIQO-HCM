import { PageHeader } from '@/components/page-header';
import { EmployeeImportPanel } from '@/components/employee-import-panel';
import { PeopleTable } from '@/components/people-table';
export default function PeoplePage(){return <><PageHeader title="People" subtitle="Authoritative worker directory separated from private person data and employment records."/><EmployeeImportPanel title="Import employees into People" detail="Import CSV, Excel/XLSX or PDF workforce records. OPSIQO parses the source, maps employee fields, validates organization/position capacity and manager relationships, then requires review before creating authoritative worker records."/><PeopleTable/></>}
