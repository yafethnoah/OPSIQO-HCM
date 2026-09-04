import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiFetch } from '@/api/client';

const INSTALLATION_KEY='opsiqo.mobile.installation.v1';
function fallbackId(){return `opsiqo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`}
export async function installationId(){let id=await SecureStore.getItemAsync(INSTALLATION_KEY);if(!id){id=fallbackId();await SecureStore.setItemAsync(INSTALLATION_KEY,id);}return id;}
export async function deviceVerification(){const capable=await LocalAuthentication.hasHardwareAsync();const enrolled=capable&&await LocalAuthentication.isEnrolledAsync();if(!enrolled)return{capable:false,verified:false};const result=await LocalAuthentication.authenticateAsync({promptMessage:'Verify attendance action',biometricsSecurityLevel:'strong',fallbackLabel:'Use device passcode'});return{capable:true,verified:result.success};}
export async function registerDevice(orgId:string,{requestPush=false}:{requestPush?:boolean}={}){const id=await installationId();const biometricCapable=(await LocalAuthentication.hasHardwareAsync())&&(await LocalAuthentication.isEnrolledAsync());let pushToken:string|undefined;let notificationsGranted=false;if(requestPush&&Device.isDevice){let permission=await Notifications.getPermissionsAsync();if(permission.status!=='granted')permission=await Notifications.requestPermissionsAsync();notificationsGranted=permission.status==='granted';const projectId=String(process.env.EXPO_PUBLIC_EAS_PROJECT_ID||Constants.easConfig?.projectId||'').trim();if(notificationsGranted&&projectId){const token=await Notifications.getExpoPushTokenAsync({projectId});pushToken=token.data;}}
  return apiFetch(`/api/organizations/${orgId}/mobile/devices`,{method:'POST',orgId,body:JSON.stringify({platform:Platform.OS==='ios'?'ios':'android',installationId:id,pushToken,appVersion:Application.nativeApplicationVersion||'dev',osVersion:Device.osVersion||undefined,deviceModel:Device.modelName||undefined,biometricCapable,notificationsGranted})});}
