import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'src', 'components', 'settings-workspace.tsx');
const text = fs.readFileSync(file, 'utf8');
const renderStart = text.indexOf("if(!me)return");
const renderText = renderStart >= 0 ? text.slice(renderStart) : text;
const checks = [
  ['Settings workspace exists', fs.existsSync(file)],
  ['Firebase User is type-only imported', /type User/.test(text)],
  ['Firebase Auth state is observed in effect', text.includes('onAuthStateChanged(auth,current=>setAccountUser(current))')],
  ['Account user is held in React state', text.includes('[accountUser,setAccountUser]=useState<User|null>(null)')],
  ['Settings render does not call firebaseAuth()', !renderText.includes('firebaseAuth()')],
  ['Settings render has no unresolved user?. references', !/\buser\?\./.test(renderText)],
  ['Auth initialization remains inside useEffect', text.includes('useEffect(()=>{const auth=firebaseAuth();')],
  ['Account email renders from accountUser state', text.includes('{accountUser?.email||me.actor.uid}')],
  ['Provider renders from typed accountUser state', text.includes('accountUser?.providerData.map(provider=>provider.providerId)')],
  ['Email verification renders from accountUser state', text.includes("accountUser?.emailVerified?'Verified':'Not verified / unavailable'")],
  ['Password reset uses observed account state', text.includes('async function resetPassword(){const email=accountUser?.email;')],
  ['Password reset remains user initiated', text.includes('sendPasswordResetEmail(firebaseAuth(),email)')],
  ['Sign out remains user initiated', text.includes('async function doSignOut()') && text.includes('signOut(firebaseAuth())')],
];
let failures = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
}
console.log(JSON.stringify({status: failures ? 'FAIL' : 'PASS', checks: checks.length, failures}, null, 2));
process.exitCode = failures ? 1 : 0;
