import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('OPSIQO H51.22 Recruiting AI provider resilience',()=>{
  it('uses bounded retry and exponential backoff for transient 429 and 5xx failures',()=>{
    const provider=read('src/lib/recruiting/ats-provider.ts');
    const legacyFourAttemptPolicy = provider.includes('const maxAttempts=4');
    const h5126DeadlinePolicy =
      provider.includes('boundedProviderFetch') &&
      provider.includes('maxAttempts:2') &&
      provider.includes('ai_provider_timeout');
    expect(legacyFourAttemptPolicy || h5126DeadlinePolicy).toBe(true);
    expect(provider).toContain('response.status===429||response.status>=500');
    expect(provider).toContain('recruitingRetryDelayMs(response,attempt)');
    expect(provider).toContain('750*(2**attempt)');
    expect(provider).toContain('Math.min(5000');
  });

  it('honours Retry-After but caps server-directed waiting',()=>{
    const provider=read('src/lib/recruiting/ats-provider.ts');
    expect(provider).toContain("response.headers.get('retry-after')");
    expect(provider).toContain('Math.min(8000');
  });

  it('preserves the explicit provider rate-limit error after retries are exhausted',()=>{
    const provider=read('src/lib/recruiting/ats-provider.ts');
    expect(provider).toContain("'ai_rate_limited'");
    expect(provider).toContain('temporarily rate limited');
  });

  it('preserves original PDF input and H51.21 semantic reconstruction',()=>{
    const provider=read('src/lib/recruiting/ats-provider.ts');
    expect(provider).toContain("const attachment=input.bytes?.length&&['application/pdf','image/png','image/jpeg'].includes(input.mimeType)?input:undefined");
    expect(provider).toContain('PASS 3 - semantic reconstruction and completeness repair');
    expect(provider).toContain('governed_ai_semantic_repair');
  });

  it('preserves evidence grounding no-fabrication and mandatory human review',()=>{
    const provider=read('src/lib/recruiting/ats-provider.ts');
    expect(provider).toContain('Extract only facts supported by the supplied candidate material');
    expect(provider).toContain('Do not fabricate qualifications');
    expect(provider).toContain('Human recruiter review is mandatory');
  });
});