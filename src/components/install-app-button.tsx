'use client';
import { useEffect,useState } from 'react';
type DeferredPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
const COPY:any={en:{installed:'Installed app',install:'Install OPSIQO',ios:'On iPhone/iPad: Share → Add to Home Screen'},fr:{installed:'Application installée',install:'Installer OPSIQO',ios:'Sur iPhone/iPad : Partager → Sur l’écran d’accueil'},es:{installed:'Aplicación instalada',install:'Instalar OPSIQO',ios:'En iPhone/iPad: Compartir → Añadir a pantalla de inicio'},ar:{installed:'التطبيق مثبت',install:'تثبيت OPSIQO',ios:'على iPhone/iPad: مشاركة ← إضافة إلى الشاشة الرئيسية'}};
export function InstallAppButton({locale='en'}:{locale?:string}){
 const T=COPY[locale]||COPY.en,[prompt,setPrompt]=useState<DeferredPrompt|null>(null),[installed,setInstalled]=useState(false),[ios,setIos]=useState(false);
 useEffect(()=>{setInstalled(window.matchMedia('(display-mode: standalone)').matches);setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));const onPrompt=(e:Event)=>{e.preventDefault();setPrompt(e as DeferredPrompt)};const onInstalled=()=>{setInstalled(true);setPrompt(null)};window.addEventListener('beforeinstallprompt',onPrompt);window.addEventListener('appinstalled',onInstalled);return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled)}},[]);
 if(installed)return <span className="badge">{T.installed}</span>;
 if(prompt)return <button className="button secondary" onClick={async()=>{await prompt.prompt();await prompt.userChoice;setPrompt(null)}}>{T.install}</button>;
 if(ios)return <span className="muted superInstallHint">{T.ios}</span>;
 return null;
}
