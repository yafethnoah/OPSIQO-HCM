import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ApiRequestError,
  isKnownPreWriteServerError,
} from '../src/lib/http/api-request-error';

const read=(p:string)=>fs.readFileSync(p,'utf8');

describe('H50.4A governed AI UAT closure',()=>{
  it('does not label known pre-write AI configuration failures as uncertain writes',()=>{
    expect(isKnownPreWriteServerError(
      new ApiRequestError(503,'ai_prompt_not_configured','missing prompt'),
    )).toBe(true);
    expect(isKnownPreWriteServerError(
      new ApiRequestError(503,'ai_model_not_configured','missing model'),
    )).toBe(true);
    expect(isKnownPreWriteServerError(
      new ApiRequestError(503,'internal_error','unknown failure'),
    )).toBe(false);
  });

  it('keeps the AI dashboard readable when governed configuration is absent',()=>{
    const service=read('src/lib/ai-intelligence/service.ts');
    const start=service.indexOf('export async function aiDashboard');
    const end=service.indexOf('export async function createPrompt',start);
    const dashboard=service.slice(start,end);
    expect(dashboard).toContain("promptTemplates.find(p=>p.code==='HR_COPILOT'&&p.status==='active')");
    expect(dashboard).toContain("modelProfiles.find(m=>m.status==='active')");
    expect(dashboard).not.toContain('activePrompt(actor.orgId)');
    expect(dashboard).not.toContain('activeModelProfile(actor.orgId)');
  });

  it('preserves fail-closed AI query execution',()=>{
    const service=read('src/lib/ai-intelligence/service.ts');
    const start=service.indexOf('export async function askCopilot');
    const end=service.indexOf('export async function aiDashboard',start);
    const ask=service.slice(start,end);
    expect(ask).toContain('activePrompt(actor.orgId)');
    expect(ask).toContain('activeModelProfile(actor.orgId)');
    expect(service).toContain('ai_prompt_not_configured');
    expect(service).toContain('ai_model_not_configured');
  });

  it('exposes governed initialization in both AI Copilot and AI Governance',()=>{
    const card=read('src/components/governed-ai-readiness-card.tsx');
    const copilot=read('src/components/ai-copilot-workspace.tsx');
    const governance=read('src/components/ai-governance-center.tsx');
    expect(card).toContain('Initialize governed AI');
    expect(card).toContain('/ai-copilot/readiness');
    expect(card).not.toContain('GEMINI_API_KEY');
    expect(card).not.toContain('OPENAI_API_KEY');
    expect(copilot).toContain('<GovernedAiReadinessCard onReady={load}/>');
    expect(governance).toContain('<GovernedAiReadinessCard />');
  });

  it('treats AI generation as advisory while retaining command safe-execute protection',()=>{
    const copilot=read('src/components/ai-copilot-workspace.tsx');
    const contextual=read('src/components/contextual-ai-assist.tsx');
    const commandBar=read('src/components/opsiqo-command-bar.tsx');
    const commandRoute=read('src/app/api/organizations/[orgId]/opsiqo-one/command/route.ts');
    expect(copilot).toContain('reconcileOnServerError:false');
    expect(contextual).toContain('reconcileOnServerError: false');
    expect(commandBar).not.toContain('reconcileOnServerError:false');
    expect(commandBar).not.toContain('reconcileOnServerError: false');
    expect(commandRoute).toContain("if(routed.mode==='execute')");
    expect(commandRoute).toContain('executeSafeOpsiQoAction');
  });

  it('keeps H50.4 bootstrap governance and audit evidence intact',()=>{
    const activation=read('src/lib/ai-intelligence/activation.ts');
    expect(activation).toContain("action: 'ai.bootstrap.initialize'");
    expect(activation).toContain("createdBy: SYSTEM_CREATOR");
    expect(activation).toContain("actor.permissions.includes('ai.manage')");
    expect(activation).toContain("actor.permissions.includes('ai.approve')");
    expect(activation).toContain('consequentialDecisionsBlocked: true');
    expect(activation).toContain('directWritesBlocked: true');
  });
});