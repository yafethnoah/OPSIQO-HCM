import { PageHeader } from '@/components/page-header';
import { AcceptInvite } from '@/components/accept-invite';
export default async function AcceptInvitePage({searchParams}:{searchParams:Promise<{orgId?:string;token?:string}>}){const p=await searchParams;return <><PageHeader title="Accept OPSIQO invitation" subtitle="Secure organization membership provisioning."/>{p.orgId&&p.token?<AcceptInvite orgId={p.orgId} token={p.token}/>:<div className="card error">Invitation link is incomplete.</div>}</>}
