import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const client = read('src/lib/http/client.ts');
const errors = read('src/lib/http/api-request-error.ts');
const returnTo = read('src/lib/auth/mfa-client.ts');
const signin = read('src/app/signin/page.tsx');
const setup = read('src/app/mfa/setup/page.tsx');
const settings = read('src/components/settings-workspace.tsx');
const home = read('src/components/superapp-workspace.tsx');
const shell = read('src/components/app-shell.tsx');
const serverSession = read('src/lib/auth/session.ts');

const checks = [
  ['server MFA policy remains fail-closed', serverSession.includes("'mfa_required'") && serverSession.includes("OPSIQO_REQUIRE_ADMIN_MFA==='true'")],
  ['structured API error class exists', errors.includes('class ApiRequestError') && errors.includes('readonly status') && errors.includes('readonly code')],
  ['apiFetch preserves structured errors', client.includes('apiRequestErrorFromPayload(response.status, payload')],
  ['apiDownload preserves structured errors', client.includes('Download failed') && client.includes('apiRequestErrorFromPayload(response.status, payload')],
  ['MFA helper detects server gate', errors.includes("error.status === 403 && error.code === 'mfa_required'")],
  ['returnTo rejects external routes', returnTo.includes("candidate.startsWith('//')") && returnTo.includes("candidate.includes('\\\\')")],
  ['Settings terminal MFA state', settings.includes('data-security-state="mfa-required"') && settings.includes('setMe(null);setPlatform(null);setNotifications(null);setMfaRequired(true)')],
  ['Settings no infinite loading after MFA', settings.indexOf('data-security-state="mfa-required"') < settings.indexOf('Loading account and platform settings…')],
  ['Home terminal MFA state', home.includes('data-security-state="mfa-required"') && home.includes('setD(null);setMfaRequired(true)')],
  ['Home withholds privileged dashboard data', home.includes('My OPSIQO data is intentionally withheld until this session completes the required second factor.')],
  ['MFA setup route is security shell route', shell.includes("'/mfa/setup'")],
  ['MFA setup requires verified email', setup.includes('if (!user.emailVerified)')],
  ['MFA setup uses Firebase multiFactor session', setup.includes('multiFactor(user).getSession()')],
  ['MFA setup generates TOTP secret', setup.includes('TotpMultiFactorGenerator.generateSecret(session)')],
  ['MFA setup displays URI and manual key', setup.includes('secret.generateQrCodeUrl') && setup.includes('secret.secretKey')],
  ['MFA setup finalizes enrollment', setup.includes('TotpMultiFactorGenerator.assertionForEnrollment(secret, code)') && setup.includes('multiFactor(user).enroll(assertion')],
  ['MFA setup refreshes token', setup.includes('user.getIdToken(true)')],
  ['MFA setup clears secret state', setup.includes('setSecret(null)')],
  ['MFA sign-in catches required challenge', signin.includes('isFirebaseMfaRequiredError(e)') && signin.includes('getMultiFactorResolver(firebaseAuth()')],
  ['MFA sign-in accepts only TOTP', signin.includes('TotpMultiFactorGenerator.FACTOR_ID')],
  ['MFA sign-in resolves second factor', signin.includes('TotpMultiFactorGenerator.assertionForSignIn(hint.uid,code)') && signin.includes('mfaResolver.resolveSignIn(assertion)')],
  ['unsupported factor fails closed', signin.includes('does not support. Contact your administrator.')],
  ['no MFA secret logging', !/console\.(log|info|warn|error)[^\n]*(secret|otp|password|idToken|mfa session)/i.test(`${setup}\n${signin}`)],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed += 1;
}
console.log(JSON.stringify({ status: failed ? 'FAIL' : 'PASS', checks: checks.length, failures: failed }, null, 2));
process.exitCode = failed ? 1 : 0;
