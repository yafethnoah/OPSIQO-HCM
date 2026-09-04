import { Redirect } from 'expo-router';
import { Loading, Screen } from '@/components/ui';
import { useAuth } from '@/auth/provider';
export default function Index(){const{ready,authenticated,activeOrgId,organizations}=useAuth();if(!ready)return <Screen><Loading label="Opening OPSIQO…"/></Screen>;if(!authenticated)return <Redirect href="/sign-in"/>;if(!activeOrgId||organizations.length>1&&!organizations.some(x=>x.orgId===activeOrgId))return <Redirect href="/select-organization"/>;return <Redirect href="/(app)/home"/>}
