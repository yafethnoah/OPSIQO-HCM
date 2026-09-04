import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const base=(process.env.OPSIQO_A11Y_BASE_URL||'http://127.0.0.1:31717').replace(/\/$/,'');
const routes=['/signin','/register','/forgot-password'];
const browserCandidates=[
 process.env.CHROME_PATH,
 process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
 process.platform==='win32'&&process.env['PROGRAMFILES']?path.join(process.env['PROGRAMFILES'],'Google','Chrome','Application','chrome.exe'):null,
 process.platform==='win32'&&process.env['PROGRAMFILES(X86)']?path.join(process.env['PROGRAMFILES(X86)'],'Microsoft','Edge','Application','msedge.exe'):null,
 process.platform==='win32'&&process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'Google','Chrome','Application','chrome.exe'):null,
 '/usr/bin/chromium','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const browserPath=browserCandidates.find(p=>fs.existsSync(p));
if(!browserPath){console.error('V7.17 browser accessibility smoke requires Chrome/Chromium/Edge. Set CHROME_PATH if it is installed in a non-standard location.');process.exit(2)}

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'opsiqo-a11y-'));
const child=spawn(browserPath,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0',`--user-data-dir=${tmp}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let wsUrl='';
const started=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Chromium DevTools endpoint did not start.')),15000);child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{const m=String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m&&!wsUrl){wsUrl=m[1];clearTimeout(timer);resolve()}});child.once('exit',code=>{if(!wsUrl){clearTimeout(timer);reject(new Error(`Chromium exited before DevTools started (${code}).`))}})});
await started;

class CDP{
 constructor(url){this.ws=new WebSocket(url);this.seq=0;this.pending=new Map();this.listeners=[]}
 async open(){if(this.ws.readyState===1)return;await new Promise((resolve,reject)=>{this.ws.addEventListener('open',resolve,{once:true});this.ws.addEventListener('error',reject,{once:true})});this.ws.addEventListener('message',event=>{const msg=JSON.parse(String(event.data));if(msg.id&&this.pending.has(msg.id)){const {resolve,reject}=this.pending.get(msg.id);this.pending.delete(msg.id);msg.error?reject(new Error(msg.error.message)):resolve(msg.result)}else{for(const fn of this.listeners)fn(msg)}})}
 send(method,params={},sessionId){const id=++this.seq,payload={id,method,params,...(sessionId?{sessionId}:{})};return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify(payload))})}
 event(method,sessionId,timeout=12000){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.listeners=this.listeners.filter(x=>x!==handler);reject(new Error(`Timed out waiting for ${method}`))},timeout);const handler=msg=>{if(msg.method===method&&(!sessionId||msg.sessionId===sessionId)){clearTimeout(timer);this.listeners=this.listeners.filter(x=>x!==handler);resolve(msg.params)}};this.listeners.push(handler)})}
 close(){try{this.ws.close()}catch{}}
}
const cdp=new CDP(wsUrl);await cdp.open();
const report={version:'7.17',target:'WCAG 2.2 AA browser-backed public-route smoke',baseUrl:base,browserPath,routes:[],generatedAt:new Date().toISOString(),boundary:'This automated browser smoke covers public authentication routes, semantic/accessibility-tree basics, focusability, target-size floor and 320px reflow. It is not a complete WCAG conformance audit; authenticated workflows, contrast, screen-reader behavior, language-of-parts and user journeys still require manual/browser certification.'};
let failed=0;
function add(checks,id,ok,detail){checks.push({id,status:ok?'pass':'fail',detail});if(!ok)failed++}
try{
 const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});const attached=await cdp.send('Target.attachToTarget',{targetId,flatten:true});const session=attached.sessionId;
 await cdp.send('Page.enable',{},session);await cdp.send('Runtime.enable',{},session);await cdp.send('Accessibility.enable',{},session);
 for(const route of routes){
  const checks=[];await cdp.send('Emulation.setDeviceMetricsOverride',{width:320,height:800,deviceScaleFactor:1,mobile:true},session);const loaded=cdp.event('Page.loadEventFired',session,15000);await cdp.send('Page.navigate',{url:base+route},session);await loaded;
  await new Promise(r=>setTimeout(r,250));
  const result=await cdp.send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};const name=e=>(e.getAttribute('aria-label')||e.getAttribute('title')||e.textContent||'').trim();const controls=[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(visible);const controlLabel=e=>!!(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||(e.id&&document.querySelector('label[for="'+CSS.escape(e.id)+'"]'))||e.closest('label'));const buttons=[...document.querySelectorAll('button,[role=button]')].filter(visible);const links=[...document.querySelectorAll('a[href]')].filter(visible);const target=[...document.querySelectorAll('button,input:not([type=hidden]),select,textarea,a.button,[role=button]')].filter(visible).map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,w:r.width,h:r.height,n:name(e)}});const ids=[...document.querySelectorAll('[id]')].map(e=>e.id),dups=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];return {title:document.title,lang:document.documentElement.lang,dir:document.documentElement.dir||getComputedStyle(document.documentElement).direction,main:!!document.querySelector('main,[role=main]'),h1:document.querySelectorAll('h1').length,skip:!!document.querySelector('a[href="#main-content"],a.skipLink'),unlabelledControls:controls.filter(e=>!controlLabel(e)).map(e=>e.outerHTML.slice(0,180)),unnamedButtons:buttons.filter(e=>!name(e)).map(e=>e.outerHTML.slice(0,180)),unnamedLinks:links.filter(e=>!name(e)&&!e.querySelector('img[alt]')).map(e=>e.outerHTML.slice(0,180)),smallTargets:target.filter(x=>x.w<24||x.h<24).slice(0,20),dups,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,viewport:document.documentElement.clientWidth}})()`},session);
  const v=result.result.value;add(checks,'document-language',Boolean(v.lang),`html lang=${v.lang||'(missing)'}`);add(checks,'main-landmark',v.main,'main/role=main exists');add(checks,'single-primary-heading',v.h1===1,`h1 count=${v.h1}`);add(checks,'skip-link',v.skip,'skip-to-main link present');add(checks,'labelled-form-controls',v.unlabelledControls.length===0,`${v.unlabelledControls.length} unlabeled visible control(s)`);add(checks,'named-buttons',v.unnamedButtons.length===0,`${v.unnamedButtons.length} unnamed visible button(s)`);add(checks,'named-links',v.unnamedLinks.length===0,`${v.unnamedLinks.length} unnamed visible link(s)`);add(checks,'unique-ids',v.dups.length===0,`${v.dups.length} duplicate id(s)`);add(checks,'target-size-24',v.smallTargets.length===0,`${v.smallTargets.length} visible interactive target(s) below 24x24 CSS px`);add(checks,'reflow-320',v.overflow<=1,`horizontal overflow=${v.overflow}px at ${v.viewport}px viewport`);
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9},session);await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9},session);const focus=await cdp.send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{const e=document.activeElement;return {tag:e?.tagName||'',id:e?.id||'',name:(e?.getAttribute?.('aria-label')||e?.textContent||'').trim().slice(0,120)}})()`},session);add(checks,'keyboard-focus-entry',!['','BODY','HTML'].includes(focus.result.value.tag),`active element=${focus.result.value.tag} ${focus.result.value.id||focus.result.value.name}`);
  const ax=await cdp.send('Accessibility.getFullAXTree',{},session);const interactive=new Set(['button','textbox','combobox','link','checkbox','radio']);const unnamed=(ax.nodes||[]).filter(n=>interactive.has(n.role?.value)&&!String(n.name?.value||'').trim());add(checks,'accessibility-tree-names',unnamed.length===0,`${unnamed.length} interactive accessibility-tree node(s) without a name`);
  report.routes.push({route,viewport:'320x800',checks});
 }
 fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/v7-17-browser-accessibility.json',JSON.stringify(report,null,2));
 for(const r of report.routes){for(const c of r.checks)console.log(`${c.status==='pass'?'PASS':'FAIL'} ${r.route} ${c.id} — ${c.detail}`)}
 console.log(`\nV7.17 browser accessibility smoke: ${failed?'FAIL':'PASS'} (${failed} failed checks).`);console.log('Evidence: artifacts/v7-17-browser-accessibility.json');
}finally{cdp.close();child.kill('SIGTERM');try{fs.rmSync(tmp,{recursive:true,force:true})}catch{}}
if(failed)process.exit(1);
