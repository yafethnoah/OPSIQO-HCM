import{createHmac,timingSafeEqual}from'node:crypto';
export function securityIngressSignature(secret:string,timestamp:string,body:string){return createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex')}
export function verifySecurityIngressSignature(secret:string,timestamp:string,body:string,signature:string){const expected=securityIngressSignature(secret,timestamp,body),provided=signature.toLowerCase().replace(/^sha256=/,'');if(!/^[a-f0-9]{64}$/.test(provided))return false;return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(provided,'hex'))}
