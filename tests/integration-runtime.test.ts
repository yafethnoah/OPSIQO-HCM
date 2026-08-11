import { createHmac } from 'node:crypto';
import { describe,expect,it } from 'vitest';
import { applyFieldMappings,circuitAllows,computeBackoff,extractRecords,nextFailureState,nextScheduleAt,nextSuccessState } from '../src/lib/integration/runtime-utils';
import { verifyWebhookSignature } from '../src/lib/integration/runtime-adapters';
import type { IntegrationRuntimeState } from '../src/domain/integration-runtime';

describe('v3.2 integration runtime governance',()=>{
  it('applies bounded deterministic mappings without dynamic code',()=>{
    const out=applyFieldMappings({user:{id:'  A-100 ',name:'SHADI'},amount:'42'},[
      {source:'user.id',target:'externalId',required:true,transform:'trim'},
      {source:'user.name',target:'profile.displayName',required:true,transform:'lowercase'},
      {source:'amount',target:'cost',required:false,transform:'number'},
    ]) as any;
    expect(out).toEqual({externalId:'A-100',profile:{displayName:'shadi'},cost:42});
    expect(()=>applyFieldMappings({},[{source:'missing',target:'x',required:true}])).toThrow(/Required mapped field/);
  });

  it('extracts records through an explicit safe dotted path',()=>{
    expect(extractRecords({data:{items:[{id:1},{id:2}]}},'data.items')).toEqual([{id:1},{id:2}]);
    expect(extractRecords({single:{id:1}},'single')).toEqual([{id:1}]);
  });

  it('opens and resets circuit breaker state deterministically',()=>{
    const base:IntegrationRuntimeState={id:'p',profileId:'p',connectorId:'c',circuitStatus:'closed',consecutiveFailures:1,updatedAt:'2026-08-11T12:00:00.000Z'};
    const fail=nextFailureState(base,{failureThreshold:2,resetAfterMs:60000},'upstream','failed','2026-08-11T12:00:00.000Z');
    expect(fail.circuitStatus).toBe('open');expect(fail.consecutiveFailures).toBe(2);expect(circuitAllows({...base,...fail} as IntegrationRuntimeState,new Date('2026-08-11T12:00:30.000Z').getTime())).toBe(false);
    expect(nextSuccessState().circuitStatus).toBe('closed');
  });

  it('uses bounded exponential retry timing',()=>{
    const p={maxAttempts:5,baseDelayMs:500,maxDelayMs:2000,retryOn429:true,retryOn5xx:true};
    expect([1,2,3,4].map(n=>computeBackoff(p,n))).toEqual([500,1000,2000,2000]);
  });

  it('computes interval and daily scheduling deterministically',()=>{
    const from=new Date('2026-08-11T12:10:00.000Z');
    expect(nextScheduleAt({cadence:'interval',intervalMinutes:30},from)).toBe('2026-08-11T12:40:00.000Z');
    expect(nextScheduleAt({cadence:'daily',dailyTimeUtc:'12:05'},from)).toBe('2026-08-12T12:05:00.000Z');
  });

  it('verifies signed webhook HMAC and rejects tampering',()=>{
    const secret='unit-test-secret',timestamp='1786464600000',body='{"externalId":"W-100"}',signature=createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex');
    expect(verifyWebhookSignature(secret,timestamp,body,`sha256=${signature}`)).toBe(true);
    expect(verifyWebhookSignature(secret,timestamp,body+'x',signature)).toBe(false);
  });
});
