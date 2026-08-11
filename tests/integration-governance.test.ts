import { describe,expect,it } from 'vitest';
import { integrationReadiness,integrationRisk } from '../src/lib/integration/risk';
import { validateContractRecord,validateSchemaEnvelope } from '../src/lib/integration/contract-validation';
import { validateIntegrationEndpoint } from '../src/lib/integration/endpoint-security';

describe('v3.1 enterprise integration governance',()=>{
  it('degrades integration readiness when failures and unresolved exceptions increase',()=>{
    const healthy=integrationReadiness({active:3,approved:3,failing:0,failedRuns:0,deadLetters:0,variances:0,successRate:100});
    const weak=integrationReadiness({active:3,approved:3,failing:1,failedRuns:3,deadLetters:4,variances:2,successRate:91});
    expect(healthy.score).toBeGreaterThan(weak.score);
    expect(healthy.level).toBe('resilient');
    expect(weak.level).toBe('fragile');
    expect(integrationRisk(weak.score,4,2,1)).toBe('critical');
  });

  it('validates the governed JSON Schema subset deterministically',()=>{
    const schema={
      $schema:'https://json-schema.org/draft/2020-12/schema',
      type:'object',
      required:['externalId'],
      additionalProperties:false,
      properties:{externalId:{type:'string',minLength:1},status:{type:'string',enum:['active','inactive']}},
    };
    expect(validateSchemaEnvelope(schema).valid).toBe(true);
    expect(validateContractRecord(schema,{externalId:'W-100',status:'active'}).valid).toBe(true);
    const bad=validateContractRecord(schema,{externalId:'',status:'unknown',secret:'not-allowed'});
    expect(bad.valid).toBe(false);
    expect(bad.issues.map(x=>x.code)).toEqual(expect.arrayContaining(['minLength','enum','additionalProperties']));
  });

  it('does not claim an unsupported schema dialect',()=>{
    expect(validateSchemaEnvelope({$schema:'http://json-schema.org/draft-07/schema#',type:'object'}).valid).toBe(false);
  });

  it('blocks insecure and local integration endpoints before any outbound exchange',async()=>{
    await expect(validateIntegrationEndpoint('http://example.com')).rejects.toThrow(/HTTPS/);
    await expect(validateIntegrationEndpoint('https://localhost/api')).rejects.toThrow(/Private\/local/);
    await expect(validateIntegrationEndpoint('https://127.0.0.1/api')).rejects.toThrow(/Private\/non-public/);
  });
});
