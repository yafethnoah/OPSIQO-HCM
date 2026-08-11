import { createHash } from 'node:crypto';
import type { IdentityProviderProfile } from '@/domain/identity-governance';
import { ApiError } from '@/lib/http/errors';
import { validateIdentityEndpoint } from './endpoint-security';
const MAX=2*1024*1024;
async function bounded(res:Response){const declared=Number(res.headers.get('content-length')||0);if(declared>MAX)throw new ApiError(413,'Identity metadata exceeds 2 MB.','identity_metadata_too_large');const text=await res.text();if(Buffer.byteLength(text,'utf8')>MAX)throw new ApiError(413,'Identity metadata exceeds 2 MB.','identity_metadata_too_large');return text}
const fp=(v:string)=>createHash('sha256').update(v).digest('hex');
export async function validateIdentityProviderMetadata(p:IdentityProviderProfile){
 if(p.protocol==='oidc'){
  const issuer=(p.issuerUrl||'').replace(/\/$/,'');const discovery=`${issuer}/.well-known/openid-configuration`;await validateIdentityEndpoint(discovery);
  const res=await fetch(discovery,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{accept:'application/json'}});if(!res.ok)throw new ApiError(502,`OIDC discovery returned HTTP ${res.status}.`,'oidc_discovery_failed');
  let j:any;try{j=JSON.parse(await bounded(res))}catch(e){if(e instanceof ApiError)throw e;throw new ApiError(502,'OIDC discovery response was not valid JSON.','oidc_discovery_invalid')}
  if(String(j.issuer||'').replace(/\/$/,'')!==issuer)throw new ApiError(409,'OIDC discovery issuer does not exactly match the configured issuer.','oidc_issuer_mismatch');
  for(const k of ['authorization_endpoint','token_endpoint','jwks_uri']){if(!j[k])throw new ApiError(409,`OIDC discovery is missing ${k}.`,'oidc_discovery_incomplete');await validateIdentityEndpoint(String(j[k]));}
  const normalized=JSON.stringify({issuer:j.issuer,authorization_endpoint:j.authorization_endpoint,token_endpoint:j.token_endpoint,jwks_uri:j.jwks_uri,scopes_supported:j.scopes_supported||[]});
  return{status:'passed' as const,fingerprint:fp(normalized),issuer:String(j.issuer),message:'OIDC discovery metadata validated with exact issuer and governed public endpoints.'};
 }
 const url=await validateIdentityEndpoint(p.metadataUrl||'');const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{accept:'application/samlmetadata+xml,application/xml,text/xml,text/plain'}});if(!res.ok)throw new ApiError(502,`SAML metadata returned HTTP ${res.status}.`,'saml_metadata_failed');const xml=await bounded(res);if(!xml.includes('EntityDescriptor')||!xml.includes('IDPSSODescriptor'))throw new ApiError(409,'SAML metadata does not contain the expected IdP metadata descriptors.','saml_metadata_incomplete');return{status:'passed' as const,fingerprint:fp(xml),message:'SAML IdP metadata was fetched over a governed endpoint and fingerprinted. XML signature/certificate validation remains a deployment identity-provider responsibility.'};
}
