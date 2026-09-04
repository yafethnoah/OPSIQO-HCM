import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/auth/provider';
import { Card, H1, Muted, Screen } from '@/components/ui';
import { colors } from '@/theme/tokens';
export default function SelectOrganization(){const{organizations,selectOrg,signOut}=useAuth();async function choose(id:string){await selectOrg(id);router.replace('/(app)/home')}return <Screen><H1>Select organization</H1><Muted>Only active organizations linked to your authenticated OPSIQO membership are shown.</Muted><ScrollView contentContainerStyle={{gap:12}}>{organizations.map(o=><Pressable key={o.orgId} onPress={()=>void choose(o.orgId)}><Card><Text style={s.name}>{o.name}</Text><Muted>{o.role.replaceAll('_',' ')}{o.workerId?' · employee linked':' · employee link pending'}</Muted></Card></Pressable>)}</ScrollView><Pressable onPress={()=>void signOut().then(()=>router.replace('/sign-in'))}><Text style={s.signout}>Sign out</Text></Pressable></Screen>}
const s=StyleSheet.create({name:{fontSize:18,fontWeight:'800',color:colors.text},signout:{textAlign:'center',color:colors.danger,fontWeight:'700',padding:16}});
