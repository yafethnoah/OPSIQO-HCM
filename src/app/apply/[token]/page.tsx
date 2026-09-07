import {CandidateApplicationPortal} from '@/components/candidate-application-portal';
export default async function CandidateApplicationPage({params}:{params:Promise<{token:string}>}){const{token}=await params;return <CandidateApplicationPortal token={token}/>;}
