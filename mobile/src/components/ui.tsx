import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius } from '@/theme/tokens';

export function Screen({children}:{children:ReactNode}){return <View style={styles.screen}>{children}</View>}
export function Card({children,style}:{children:ReactNode;style?:ViewStyle}){return <View style={[styles.card,style]}>{children}</View>}
export function H1({children}:{children:ReactNode}){return <Text style={styles.h1}>{children}</Text>}
export function H2({children}:{children:ReactNode}){return <Text style={styles.h2}>{children}</Text>}
export function Muted({children}:{children:ReactNode}){return <Text style={styles.muted}>{children}</Text>}
export function Button({title,onPress,disabled=false,secondary=false}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean}){return <Pressable onPress={onPress} disabled={disabled} style={({pressed})=>[styles.button,secondary&&styles.buttonSecondary,(pressed||disabled)&&styles.buttonPressed]}><Text style={[styles.buttonText,secondary&&styles.buttonTextSecondary]}>{title}</Text></Pressable>}
export function Loading({label='Loading…'}:{label?:string}){return <View style={styles.loading}><ActivityIndicator/><Muted>{label}</Muted></View>}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:colors.bg,padding:18,gap:14},card:{backgroundColor:colors.surface,borderRadius:radius.md,padding:16,borderWidth:1,borderColor:colors.line,gap:8},h1:{fontSize:28,fontWeight:'800',color:colors.text},h2:{fontSize:18,fontWeight:'700',color:colors.text},muted:{fontSize:14,color:colors.muted,lineHeight:20},button:{backgroundColor:colors.navy,borderRadius:12,paddingVertical:13,paddingHorizontal:16,alignItems:'center'},buttonSecondary:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.navy},buttonPressed:{opacity:.65},buttonText:{color:'#fff',fontSize:15,fontWeight:'700'},buttonTextSecondary:{color:colors.navy},loading:{flexDirection:'row',gap:10,alignItems:'center',justifyContent:'center',padding:24}});
export const uiStyles=styles;
