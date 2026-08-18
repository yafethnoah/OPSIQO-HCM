import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const shared = readFileSync('apphosting.yaml','utf8');
const uat = readFileSync('apphosting.uat.yaml','utf8');
const production = readFileSync('apphosting.production.yaml','utf8');

describe('V7.9.4.2 App Hosting multi-environment closure',()=>{
  it('keeps the shared App Hosting file environment-neutral',()=>{
    expect(shared).toContain("OPSIQO_PRODUCT_RELEASE");
    expect(shared).toContain("8.5-v7.9.4.2");
    expect(shared).toContain("OPSIQO_REQUIRE_PLATFORM_ADMIN_MFA");
    expect(shared).toContain("OPSIQO_ALLOW_FIRST_ORG_BOOTSTRAP");
    expect(shared).not.toContain('opsiqo-hcm-prod-2026');
    expect(shared).not.toContain('opsiqo-hcm-uat-2026');
    expect(shared).not.toContain('OPSIQO_FIREBASE_WEB_API_KEY');
    expect(shared).not.toContain('OPSIQO_GEMINI_API_KEY');
  });

  it('binds the UAT file only to the UAT Firebase project and custom domain',()=>{
    expect(uat).toContain('opsiqo-hcm-uat-2026');
    expect(uat).toContain('https://uat.opsiqo.ca');
    expect(uat).toContain('1:68136784443:web:8c05e5e25ec2ee943e021e');
    expect(uat).not.toContain('opsiqo-hcm-prod-2026');
    expect(uat).not.toContain('opsiqo-hcm-prod-ca-2026');
  });

  it('uses UAT Secret Manager references without embedding secret values',()=>{
    expect(uat).toContain('secret: UAT_OPSIQO_GEMINI_API_KEY');
    expect(uat).toContain('secret: UAT_OPSIQO_JOB_SECRET');
    expect(uat).toContain('secret: UAT_OPSIQO_SURVEY_ANONYMITY_SECRET');
    expect(uat).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
    expect(uat).not.toContain('PRIVATE KEY');
  });

  it('preserves the prior production-specific configuration separately',()=>{
    expect(production).toContain('opsiqo-hcm-prod-2026');
    expect(production).toContain('OPSIQO_FIREBASE_WEB_API_KEY');
    expect(production).toContain('OPSIQO_GEMINI_API_KEY');
    expect(production).not.toContain('opsiqo-hcm-uat-2026');
  });

  it('retains supported App Hosting runtime settings in the shared file',()=>{
    expect(shared).toContain('minInstances: 1');
    expect(shared).toContain('maxInstances: 20');
    expect(shared).toContain('concurrency: 40');
    expect(shared).toContain('cpu: 1');
    expect(shared).toContain('memoryMiB: 1024');
  });
});
