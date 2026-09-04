import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch } from '@/api/client';
import { getActiveOrg, hasSession, setActiveOrg, signInWithPassword, signOut as clearSession } from './session';
import type { OrganizationSummary } from '@/types/mobile';

type AuthState={ready:boolean;authenticated:boolean;organizations:OrganizationSummary[];activeOrgId:string|null;signIn:(email:string,password:string)=>Promise<void>;signOut:()=>Promise<void>;selectOrg:(orgId:string)=>Promise<void>;reloadOrganizations:()=>Promise<void>};
const Context=createContext<AuthState|null>(null);

export function AuthProvider({children}:{children:ReactNode}){
  const[ready,setReady]=useState(false);const[authenticated,setAuthenticated]=useState(false);const[organizations,setOrganizations]=useState<OrganizationSummary[]>([]);const[activeOrgId,setActiveOrgId]=useState<string|null>(null);
  const reloadOrganizations=useCallback(async()=>{const result=await apiFetch<{data:OrganizationSummary[]}>('/api/me/organizations',{orgId:null});const rows=result.data.filter(x=>x.status==='active');setOrganizations(rows);let current=await getActiveOrg();if(!current||!rows.some(x=>x.orgId===current)){current=rows[0]?.orgId||null;if(current)await setActiveOrg(current);}setActiveOrgId(current);},[]);
  useEffect(()=>{void(async()=>{try{const ok=await hasSession();setAuthenticated(ok);if(ok)await reloadOrganizations();}finally{setReady(true);}})()},[reloadOrganizations]);
  const signIn=useCallback(async(email:string,password:string)=>{await signInWithPassword(email,password);setAuthenticated(true);await reloadOrganizations();},[reloadOrganizations]);
  const signOut=useCallback(async()=>{await clearSession();setAuthenticated(false);setOrganizations([]);setActiveOrgId(null);},[]);
  const selectOrg=useCallback(async(orgId:string)=>{if(!organizations.some(x=>x.orgId===orgId))throw new Error('Organization is not available to this account.');await setActiveOrg(orgId);setActiveOrgId(orgId);},[organizations]);
  const value=useMemo(()=>({ready,authenticated,organizations,activeOrgId,signIn,signOut,selectOrg,reloadOrganizations}),[ready,authenticated,organizations,activeOrgId,signIn,signOut,selectOrg,reloadOrganizations]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('useAuth must be used within AuthProvider');return value;}
