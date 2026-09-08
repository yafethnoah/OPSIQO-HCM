import type { ActorContext } from '@/domain/security';
import { adminDb } from '@/lib/firebase/admin';

export type RecruitingAiReadinessStatus =
  | 'ready'
  | 'setup_required'
  | 'approval_required'
  | 'credential_required'
  | 'provider_invalid';

export interface RecruitingAiReadiness {
  status: RecruitingAiReadinessStatus;
  ready: boolean;
  modelConfigured: boolean;
  modelApproved: boolean;
  promptConfigured: boolean;
  promptActive: boolean;
  credentialAvailable: boolean;
  provider: 'openai' | 'gemini' | 'demo' | 'unknown';
  strictGovernance: boolean;
  deterministicResumeFallback: 'text_layer_only';
  deterministicInterviewFallback: 'available';
  message: string;
  adminHref: string;
}

function credentialAvailable(provider: string): boolean {
  if (provider === 'openai') return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
  if (provider === 'gemini') return Boolean(String(process.env.GEMINI_API_KEY || '').trim());
  return false;
}

export async function getRecruitingAiReadiness(actor: ActorContext): Promise<RecruitingAiReadiness> {
  const db = adminDb();
  const [modelsSnap, promptsSnap] = await Promise.all([
    db.collection(`organizations/${actor.orgId}/aiModelProfiles`).limit(50).get(),
    db.collection(`organizations/${actor.orgId}/aiPromptTemplates`).limit(50).get(),
  ]);

  const models = modelsSnap.docs.map((doc) => doc.data() as Record<string, unknown>);
  const prompts = promptsSnap.docs.map((doc) => doc.data() as Record<string, unknown>);
  const model = models.find((row) => row.code === 'RECRUITING_ATS_MODEL' && row.status === 'active') || models.find((row) => row.code === 'RECRUITING_ATS_MODEL' && row.status === 'draft');
  const prompt = prompts.find((row) => row.code === 'RECRUITING_ATS' && row.status === 'active') || prompts.find((row) => row.code === 'RECRUITING_ATS' && row.status === 'draft');
  const providerRaw = String(model?.provider || 'unknown').toLowerCase();
  const provider = (['openai', 'gemini', 'demo'].includes(providerRaw) ? providerRaw : 'unknown') as RecruitingAiReadiness['provider'];
  const modelConfigured = Boolean(model);
  const promptConfigured = Boolean(prompt);
  const modelApproved = Boolean(model?.approvedBy && model?.status === 'active');
  const promptActive = Boolean(prompt?.activatedBy && prompt?.status === 'active');
  const credential = credentialAvailable(provider);
  const strictGovernance = process.env.OPSIQO_REQUIRE_GOVERNED_AI_CONFIG === 'true';

  let status: RecruitingAiReadinessStatus = 'ready';
  let message = 'Recruiting AI configuration records are approved and a server credential is present. This is configuration readiness only; run the live Recruiting AI document test to verify provider/model/PDF execution.';

  if (!modelConfigured || !promptConfigured) {
    status = 'setup_required';
    message = 'Recruiting AI setup is incomplete. Create the Recruiting ATS model and prompt governance records, then obtain independent approval.';
  } else if (!modelApproved || !promptActive) {
    status = 'approval_required';
    message = 'Recruiting AI governance records exist but still require independent approval or activation.';
  } else if (provider === 'demo' || provider === 'unknown') {
    status = 'provider_invalid';
    message = 'Recruiting AI needs an approved OpenAI or Gemini provider profile for governed remote parsing.';
  } else if (!credential) {
    status = 'credential_required';
    message = 'Recruiting AI governance is approved, but the server-side provider credential is not available to this runtime.';
  }

  return {
    status,
    ready: status === 'ready',
    modelConfigured,
    modelApproved,
    promptConfigured,
    promptActive,
    credentialAvailable: credential,
    provider,
    strictGovernance,
    deterministicResumeFallback: 'text_layer_only',
    deterministicInterviewFallback: 'available',
    message,
    adminHref: '/ai-copilot?tab=governance',
  };
}
