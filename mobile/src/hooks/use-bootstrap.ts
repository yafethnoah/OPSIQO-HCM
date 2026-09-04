import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/auth/provider';
import type { MobileBootstrap } from '@/types/mobile';

export function useBootstrap(){
  const{activeOrgId}=useAuth();
  const[data,setData]=useState<MobileBootstrap|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
  const reload=useCallback(async()=>{if(!activeOrgId){setData(null);setLoading(false);return;}setLoading(true);setError('');try{const result=await apiFetch<{data:MobileBootstrap}>(`/api/organizations/${activeOrgId}/mobile/bootstrap`,{orgId:activeOrgId});setData(result.data);}catch(e){setError(e instanceof Error?e.message:'Unable to load OPSIQO mobile data.');}finally{setLoading(false);}},[activeOrgId]);
  useEffect(()=>{void reload()},[reload]);
  return{data,loading,error,reload};
}
