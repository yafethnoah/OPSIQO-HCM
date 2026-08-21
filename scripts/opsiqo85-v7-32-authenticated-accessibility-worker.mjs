import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { killProcessTree } from './opsiqo85-v7-32-bounded-process.mjs';

const base=(process.env.OPSIQO_A11Y_BASE_URL||'http://127.0.0.1:31718').replace(/\/$/,'');
const route=process.env.OPSIQO_A11Y_ROUTE||'/home';
const marker=process.env.OPSIQO_A11Y_ROUTE_MARKER||'';
const resultPath=process.env.OPSIQO_A11Y_ROUTE_RESULT;
const expectedHttpStatus=Number(process.env.OPSIQO_A11Y_HTTP_STATUS||0);
const boundedInt=(raw,fallback,min,max)=>{const n=Number(raw);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback};
const routeSettleMs=boundedInt(process.env.OPSIQO_A11Y_ROUTE_SETTLE_MS,900,100,5000);
const cdpTimeoutMs=boundedInt(process.env.OPSIQO_A11Y_CDP_TIMEOUT_MS,4500,2000,12000);
const startupTimeoutMs=boundedInt(process.env.OPSIQO_A11Y_BROWSER_START_TIMEOUT_MS,6000,3000,12000);
if(!resultPath){console.error('Missing OPSIQO_A11Y_ROUTE_RESULT.');process.exit(2)}

const browserCandidates=[process.env.CHROME_PATH,process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,process.platform==='win32'&&process.env['PROGRAMFILES']?path.join(process.env['PROGRAMFILES'],'Google','Chrome','Application','chrome.exe'):null,process.platform==='win32'&&process.env['PROGRAMFILES(X86)']?path.join(process.env['PROGRAMFILES(X86)'],'Microsoft','Edge','Application','msedge.exe'):null,process.platform==='win32'&&process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'Google','Chrome','Application','chrome.exe'):null,'/usr/bin/chromium','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const browserPath=browserCandidates.find(p=>fs.existsSync(p));
const checks=[];let browser=null;let tmp='';let cdp=null;const started=Date.now();
function add(id,ok,detail){checks.push({id,status:ok?'pass':'fail',detail})}
function persist(extra={}){fs.mkdirSync(path.dirname(resultPath),{recursive:true});fs.writeFileSync(resultPath,JSON.stringify({route,viewport:'320x800',durationMs:Date.now()-started,checks,browserPath:browserPath||null,...extra},null,2))}

class CDP{constructor(url){this.ws=new WebSocket(url);this.seq=0;this.pending=new Map();this.listeners=[]}async open(){if(this.ws.readyState===1)return;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Timed out opening CDP WebSocket.')),cdpTimeoutMs);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(new Error(`CDP WebSocket error: ${event?.message||'unknown'}`))},{once:true})});this.ws.addEventListener('message',event=>{const msg=JSON.parse(String(event.data));if(msg.id&&this.pending.has(msg.id)){const pending=this.pending.get(msg.id);this.pending.delete(msg.id);clearTimeout(pending.timer);msg.error?pending.reject(new Error(msg.error.message)):pending.resolve(msg.result)}else for(const fn of this.listeners)fn(msg)});this.ws.addEventListener('close',()=>{for(const[id,pending]of this.pending){clearTimeout(pending.timer);pending.reject(new Error(`CDP connection closed while waiting for command ${id}.`))}this.pending.clear()})}send(method,params={},sessionId,timeout=cdpTimeoutMs){const id=++this.seq,payload={id,method,params,...(sessionId?{sessionId}:{})};return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`Timed out waiting for CDP ${method} after ${timeout}ms.`))},timeout);this.pending.set(id,{resolve,reject,timer});try{this.ws.send(JSON.stringify(payload))}catch(error){clearTimeout(timer);this.pending.delete(id);reject(error)}})}event(method,sessionId,timeout=cdpTimeoutMs){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.listeners=this.listeners.filter(x=>x!==handler);reject(new Error(`Timed out waiting for ${method} after ${timeout}ms.`))},timeout);const handler=msg=>{if(msg.method===method&&(!sessionId||msg.sessionId===sessionId)){clearTimeout(timer);this.listeners=this.listeners.filter(x=>x!==handler);resolve(msg.params)}};this.listeners.push(handler)})}close(){try{this.ws.close()}catch{}}}

try{
  if(!browserPath)throw new Error('Chrome/Chromium/Edge not found. Set CHROME_PATH when installed in a non-standard location.');
  tmp=fs.mkdtempSync(path.join(os.tmpdir(),'opsiqo-a11y-route-'));
  browser=spawn(browserPath,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0',`--user-data-dir=${tmp}`,'about:blank'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
  let wsUrl='';
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Chromium DevTools endpoint did not start.')),startupTimeoutMs);browser.stderr.setEncoding('utf8');browser.stderr.on('data',chunk=>{const m=String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m&&!wsUrl){wsUrl=m[1];clearTimeout(timer);resolve()}});browser.once('exit',code=>{if(!wsUrl){clearTimeout(timer);reject(new Error(`Chromium exited before DevTools started (${code}).`))}})});
  cdp=new CDP(wsUrl);await cdp.open();
  const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});const attached=await cdp.send('Target.attachToTarget',{targetId,flatten:true});const session=attached.sessionId;
  await cdp.send('Page.enable',{},session);await cdp.send('Runtime.enable',{},session);await cdp.send('Accessibility.enable',{},session);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:320,height:800,deviceScaleFactor:1,mobile:true},session);
  const loaded=cdp.event('Page.loadEventFired',session,cdpTimeoutMs);
  const navigation=await cdp.send('Page.navigate',{url:base+route},session);
  if(navigation.errorText)throw new Error(`Navigation failed: ${navigation.errorText}`);
  await loaded;await new Promise(r=>setTimeout(r,routeSettleMs));
  const result=await cdp.send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{
    const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
    const referencedText=e=>{const ids=(e.getAttribute('aria-labelledby')||'').trim().split(/\s+/).filter(Boolean);return ids.map(id=>document.getElementById(id)?.textContent||'').join(' ').trim()};
    const labelText=e=>{const labels=e.labels?[...e.labels].map(x=>x.textContent||'').join(' ').trim():'';if(labels)return labels;if(e.id){const l=document.querySelector('label[for=\"'+CSS.escape(e.id)+'\"]');if(l?.textContent)return l.textContent.trim()}return e.closest('label')?.textContent?.trim()||''};
    const name=e=>{const aria=(e.getAttribute('aria-label')||'').trim();if(aria)return aria;const labelled=referencedText(e);if(labelled)return labelled;const labelledByForm=labelText(e);if(labelledByForm)return labelledByForm;const type=(e.getAttribute('type')||'').toLowerCase();if(e.tagName==='INPUT'&&['button','submit','reset'].includes(type))return (e.getAttribute('value')||type).trim();const alt=e.tagName==='IMG'?e.getAttribute('alt'):e.querySelector('img[alt]')?.getAttribute('alt');if(alt?.trim())return alt.trim();return (e.getAttribute('title')||e.textContent||'').trim()};
    const controls=[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(visible);
    const controlLabel=e=>!!((e.getAttribute('aria-label')||'').trim()||referencedText(e)||labelText(e));
    const interactive=[...document.querySelectorAll('button,input:not([type=hidden]),select,textarea,a[href],[role=button]')].filter(visible);
    const targets=interactive.map(e=>{const r=e.getBoundingClientRect(),display=getComputedStyle(e).display;const inlineTextLink=e.tagName==='A'&&display==='inline';return{w:r.width,h:r.height,n:name(e),tag:e.tagName,cls:String(e.className||'').slice(0,80),display,inlineTextLink}});
    const smallTargetExamples=targets.filter(x=>!x.inlineTextLink&&(x.w<24||x.h<24)).slice(0,8);
    const ids=[...document.querySelectorAll('[id]')].map(e=>e.id),dups=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
    const mobile=document.querySelector('.mobileOutcomeNav');
    return{href:location.pathname,main:!!document.querySelector('main,[role=main]'),headings:document.querySelectorAll('h1,h2').length,unlabelledControls:controls.filter(e=>!controlLabel(e)).length,unnamedInteractive:interactive.filter(e=>!name(e)).length,smallTargets:targets.filter(x=>!x.inlineTextLink&&(x.w<24||x.h<24)).length,smallTargetExamples,dups:dups.length,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,mobileNav:!!mobile,mobileLinks:mobile?[...mobile.querySelectorAll('a[href]')].length:0,currentLinks:mobile?[...mobile.querySelectorAll('[aria-current=\"page\"]')].length:0,bodyText:(document.body.innerText||'').slice(0,5000)}
  })()`},session);
  const v=result.result.value;
  const securityShellRoute=route==='/mfa/setup';
  add('http-status',expectedHttpStatus>=200&&expectedHttpStatus<400,`HTTP status=${expectedHttpStatus}`);add('authenticated-route',v.href===route,`resolved path=${v.href}`);add('main-landmark',v.main,'main/role=main exists');add('named-heading',v.headings>=1,`visible document heading candidates=${v.headings}`);add('labelled-form-controls',v.unlabelledControls===0,`${v.unlabelledControls} unlabeled visible control(s)`);add('named-interactive-controls',v.unnamedInteractive===0,`${v.unnamedInteractive} unnamed interactive control(s)`);add('unique-ids',v.dups===0,`${v.dups} duplicate id(s)`);add('target-size-24',v.smallTargets===0,`${v.smallTargets} non-inline visible interactive target(s) below 24x24 CSS px${v.smallTargetExamples?.length?`; examples=${v.smallTargetExamples.map(x=>`${x.tag}.${x.cls||'-'} ${Math.round(x.w*10)/10}x${Math.round(x.h*10)/10}`).join(' | ')}`:''}`);add('reflow-320',v.overflow<=1,`horizontal overflow=${v.overflow}px`);add('mobile-outcome-navigation',securityShellRoute?!v.mobileNav:(v.mobileNav&&v.mobileLinks===5),securityShellRoute?`security shell mobile outcome nav present=${v.mobileNav}`:`mobile outcome links=${v.mobileLinks}`);add('single-current-outcome',v.currentLinks<=1,`aria-current links=${v.currentLinks}`);add('no-signin-fallback',!v.bodyText.includes('Sign in to OPSIQO'),`authenticated shell did ${v.bodyText.includes('Sign in to OPSIQO')?'':'not '}fall back to sign-in`);
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9},session);await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9},session);const focus=await cdp.send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{const e=document.activeElement;return{tag:e?.tagName||'',name:(e?.getAttribute?.('aria-label')||e?.textContent||'').trim().slice(0,100)}})()`},session);add('keyboard-focus-entry',!['','BODY','HTML'].includes(focus.result.value.tag),`active=${focus.result.value.tag} ${focus.result.value.name}`);
  const ax=await cdp.send('Accessibility.getFullAXTree',{},session,cdpTimeoutMs);const interactiveRoles=new Set(['button','textbox','combobox','link','checkbox','radio']);const unnamed=(ax.nodes||[]).filter(n=>interactiveRoles.has(n.role?.value)&&!String(n.name?.value||'').trim());add('accessibility-tree-names',unnamed.length===0,`${unnamed.length} interactive AX node(s) without a name`);
  let arabic=null;
  for(let attempt=0;attempt<5;attempt++){
    await cdp.send('Runtime.evaluate',{expression:`(()=>{const root=document.documentElement;root.dataset.opsiqoLocale='ar';root.lang='ar';root.dir='rtl';window.dispatchEvent(new CustomEvent('opsiqo:locale-changed',{detail:{locale:'ar'}}));})()`},session);
    await new Promise(r=>setTimeout(r,180+attempt*80));
    arabic=await cdp.send('Runtime.evaluate',{returnByValue:true,expression:`(()=>({dir:document.documentElement.dir,home:[...document.querySelectorAll('.mobileOutcomeNav strong')].map(e=>e.textContent?.trim()).includes('الرئيسية'),body:(document.body.innerText||'').slice(0,16000),markerVisible:(()=>{const expected=${JSON.stringify(marker)};if(!expected)return true;const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};return[...document.querySelectorAll('body *')].some(e=>visible(e)&&(e.textContent||'').includes(expected))})()}))()`},session);
    const av=arabic.result.value;if(av.dir==='rtl'&&(securityShellRoute||av.home)&&(!marker||av.markerVisible))break;
  }
  const av=arabic.result.value;add('arabic-rtl-shell',av.dir==='rtl'&&(securityShellRoute||av.home),securityShellRoute?`dir=${av.dir}; security shell route=true`:`dir=${av.dir}; Arabic Home=${av.home}`);if(marker)add('operational-arabic-translation',av.markerVisible,`expected reviewed Arabic marker=${marker}`);
  persist();
}catch(error){
  const detail=error instanceof Error?error.message:String(error);checks.push({id:'route-runtime',status:'fail',detail:detail.slice(0,500)});persist({runtimeError:detail.slice(0,500)});
}finally{
  try{cdp?.close()}catch{};try{killProcessTree(browser?.pid)}catch{};try{if(tmp)fs.rmSync(tmp,{recursive:true,force:true})}catch{}
}
process.exit(checks.some(c=>c.status==='fail')?1:0);
