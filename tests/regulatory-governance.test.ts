import { describe, expect, it } from 'vitest';
import { validateRegulatorySourceUrl } from '../src/lib/regulatory/monitor';

describe('v2.4 regulatory source monitoring boundary',()=>{
  it('rejects non-HTTPS source URLs',async()=>{await expect(validateRegulatorySourceUrl('http://example.com/law')).rejects.toThrow(/HTTPS/);});
  it('rejects loopback, private and IPv4-mapped IPv6 targets',async()=>{
    await expect(validateRegulatorySourceUrl('https://127.0.0.1/source')).rejects.toThrow(/Private IP/);
    await expect(validateRegulatorySourceUrl('https://10.1.2.3/source')).rejects.toThrow(/Private IP/);
    await expect(validateRegulatorySourceUrl('https://[::1]/source')).rejects.toThrow(/Private IP/);
    await expect(validateRegulatorySourceUrl('https://[::ffff:127.0.0.1]/source')).rejects.toThrow(/Private IP/);
    await expect(validateRegulatorySourceUrl('https://[fe90::1]/source')).rejects.toThrow(/Private IP/);
  });
  it('rejects local hostnames before any fetch',async()=>{await expect(validateRegulatorySourceUrl('https://localhost/source')).rejects.toThrow(/Private\/local/);});
});
