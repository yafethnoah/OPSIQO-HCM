/**
 * External e-signature integration boundary.
 *
 * OPSIQO v0.7 records authenticated acknowledgement evidence internally.
 * Regulated or higher-assurance signature workflows should be delegated to a
 * configured provider through this adapter. No provider secret is hard-coded.
 */
export interface SignatureEnvelopeRequest {
  documentId: string;
  documentVersionId: string;
  signerEmail: string;
  signerName: string;
  returnUrl: string;
}
export interface SignatureEnvelopeResult { provider:string; envelopeId:string; status:'created'|'sent'; signingUrl?:string; }
export interface EsignProvider { createEnvelope(input:SignatureEnvelopeRequest):Promise<SignatureEnvelopeResult>; }

export function configuredEsignProvider():EsignProvider|null {
  // Deliberately provider-neutral in v0.7. Connect DocuSign/Adobe Sign/etc. in a
  // later integration package using server-side credentials and webhook verification.
  return null;
}
