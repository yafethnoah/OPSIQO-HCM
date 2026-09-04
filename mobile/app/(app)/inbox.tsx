import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/auth/provider';
import { useBootstrap } from '@/hooks/use-bootstrap';
import { Card, H1, Muted } from '@/components/ui';
import { colors } from '@/theme/tokens';
export default function Inbox(){const{activeOrgId}=useAuth();const{data,reload}=useBootstrap();async function read(id:string){if(!activeOrgId)return;await apiFetch(`/api/organizations/${activeOrgId}/notifications/${id}`,{method:'POST',orgId:activeOrgId});await reload()}return <ScrollView style={{backgroundColor:colors.bg}} contentContainerStyle={s.content}><H1>Inbox</H1>{data?.notifications?.length?data.notifications.map(n=><Card key={n.id}><View style={s.row}><Text style={[s.title,n.status!=='read'&&s.unread]}>{n.title}</Text>{n.status!=='read'?<Text onPress={()=>void read(n.id)} style={s.action}>Mark read</Text>:null}</View><Muted>{n.message}</Muted><Muted>{new Date(n.createdAt).toLocaleString()}</Muted></Card>):<Card><Muted>No notifications right now.</Muted></Card>}</ScrollView>}
const s=StyleSheet.create({content:{padding:18,gap:12},row:{flexDirection:'row',gap:12,alignItems:'center'},title:{flex:1,fontSize:16,fontWeight:'600',color:colors.text},unread:{fontWeight:'900'},action:{fontSize:12,color:colors.teal,fontWeight:'800'}});
