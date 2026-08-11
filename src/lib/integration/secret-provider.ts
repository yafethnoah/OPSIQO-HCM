import { ApiError } from '@/lib/http/errors';

const ENV_PREFIX='env://';

export function secretProviderKind(ref?:string){
  if(!ref)return 'none';
  if(ref.startsWith(ENV_PREFIX))return 'env';
  if(ref.startsWith('secret-manager/')||ref.startsWith('projects/')||ref.startsWith('gcp-secret://'))return 'gcp-secret-manager';
  if(ref.startsWith('aws-secretsmanager://'))return 'aws-secrets-manager';
  if(ref.startsWith('azure-keyvault://'))return 'azure-key-vault';
  if(ref.startsWith('vault://'))return 'vault';
  return 'unknown';
}

export async function resolveSecretReference(ref?:string):Promise<string|undefined>{
  if(!ref)return undefined;
  if(ref.startsWith(ENV_PREFIX)){
    const key=ref.slice(ENV_PREFIX.length);
    if(!/^[A-Z][A-Z0-9_]{2,127}$/.test(key))throw new ApiError(400,'env:// secret references must name an uppercase server environment variable.','invalid_env_secret_reference');
    const value=String(process.env[key]||'');
    if(!value)throw new ApiError(503,`Server secret reference ${ref} is not available in this runtime.`,'secret_not_available');
    return value;
  }
  throw new ApiError(503,`Secret provider ${secretProviderKind(ref)} is referenced but no runtime provider is configured in this build.`,'secret_provider_not_configured');
}

export function assertSecretReferenceShape(ref?:string){
  if(!ref)return;
  if(/[=\n\r\s]/.test(ref))throw new ApiError(400,'Secret references cannot contain credential-like values or whitespace.','inline_secret_prohibited');
  if(secretProviderKind(ref)==='unknown')throw new ApiError(400,'Unsupported secret provider reference.','unsupported_secret_reference');
}
