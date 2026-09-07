import { randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type {
  AiModelProfile,
  AiPromptTemplate,
  AiProvider,
} from '@/domain/ai-intelligence';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';

const ADMIN_ROLES = new Set(['super_admin', 'org_admin', 'hr_admin']);
const SYSTEM_CREATOR = 'system:opsiqo-h50.4';

const BASELINE_PROMPT = `You are OPSIQO HR Copilot, an evidence-first assistant inside a governed HCM platform. Answer only from supplied OPSIQO evidence and cite evidence IDs for material claims. When the user asks to draft or generate content, create a ready-to-edit draft in the summary while clearly identifying assumptions, missing evidence and required human review. Never infer protected traits. Never rank or select candidates or workers for hiring, firing, promotion, succession, compensation, discipline, accommodation or protected leave. Never assign an individual performance rating. Never execute writes or represent a draft as an approved organizational decision. You may assist with non-consequential investigation, review, analysis, communication, planning and monitoring. Never declare legal compliance or non-compliance; legal applicability and conclusions require qualified human review.`;

function now() {
  return new Date().toISOString();
}

function normalizeProvider(raw: string | undefined): AiProvider {
  const value = String(raw || 'demo').trim().toLowerCase();
  if (value === 'openai' || value === 'gemini') return value;
  return 'demo';
}

export function credentialConfiguredFor(provider: AiProvider): boolean {
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY);
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  return true;
}

export function runtimeAiProviderState() {
  const provider = normalizeProvider(process.env.OPSIQO_AI_PROVIDER);
  const model =
    provider === 'gemini'
      ? process.env.GEMINI_MODEL || 'gemini-3.5-flash'
      : provider === 'openai'
        ? process.env.OPENAI_MODEL || 'gpt-5.6-terra'
        : 'opsiqo-evidence-demo-v1';

  return {
    provider,
    model,
    credentialConfigured: credentialConfiguredFor(provider),
    governedConfigRequired:
      process.env.OPSIQO_REQUIRE_GOVERNED_AI_CONFIG === 'true',
  };
}

function requireUse(actor: ActorContext) {
  if (!actor.permissions.includes('ai.use')) {
    throw new ApiError(403, 'AI Copilot permission required.', 'forbidden');
  }
}

function requireBootstrap(actor: ActorContext) {
  if (
    !ADMIN_ROLES.has(actor.role) ||
    !actor.permissions.includes('ai.manage') ||
    !actor.permissions.includes('ai.approve')
  ) {
    throw new ApiError(
      403,
      'AI initialization requires an authorized HR administrator with ai.manage and ai.approve.',
      'ai_bootstrap_forbidden',
    );
  }
}

async function activePrompt(orgId: string): Promise<AiPromptTemplate | null> {
  const snap = await adminDb()
    .collection(`organizations/${orgId}/aiPromptTemplates`)
    .where('code', '==', 'HR_COPILOT')
    .where('status', '==', 'active')
    .orderBy('version', 'desc')
    .limit(1)
    .get();

  return snap.empty ? null : (snap.docs[0]!.data() as AiPromptTemplate);
}

async function activeModel(orgId: string): Promise<AiModelProfile | null> {
  const snap = await adminDb()
    .collection(`organizations/${orgId}/aiModelProfiles`)
    .where('status', '==', 'active')
    .orderBy('version', 'desc')
    .limit(1)
    .get();

  return snap.empty ? null : (snap.docs[0]!.data() as AiModelProfile);
}

export async function getAiActivationReadiness(actor: ActorContext) {
  requireUse(actor);

  const runtime = runtimeAiProviderState();
  const [prompt, model] = await Promise.all([
    activePrompt(actor.orgId),
    activeModel(actor.orgId),
  ]);

  const selectedProvider = model?.provider || runtime.provider;
  const selectedModel = model?.model || runtime.model;
  const credentialConfigured = credentialConfiguredFor(selectedProvider);
  const blockers: string[] = [];

  if (selectedProvider === 'demo') {
    blockers.push('A live AI provider has not been selected.');
  }
  if (!credentialConfigured) {
    blockers.push(
      `${selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI'} server credential is not configured.`,
    );
  }
  if (!prompt) {
    blockers.push('No active governed HR_COPILOT prompt is configured.');
  }
  if (!model) {
    blockers.push('No active governed AI model profile is configured.');
  }

  return {
    provider: selectedProvider,
    model: selectedModel,
    credentialConfigured,
    activePrompt: Boolean(prompt),
    activeModel: Boolean(model),
    promptCode: prompt?.code || null,
    promptVersion: prompt?.version || null,
    modelProfileCode: model?.code || null,
    modelProfileVersion: model?.version || null,
    governedConfigRequired: runtime.governedConfigRequired,
    liveReady:
      selectedProvider !== 'demo' &&
      credentialConfigured &&
      Boolean(prompt) &&
      Boolean(model),
    blockers,
  };
}

export async function initializeGovernedAi(actor: ActorContext) {
  requireBootstrap(actor);

  const runtime = runtimeAiProviderState();
  if (runtime.provider === 'demo') {
    throw new ApiError(
      409,
      'A live OPSIQO_AI_PROVIDER must be configured before initialization.',
      'ai_live_provider_required',
    );
  }
  if (!runtime.credentialConfigured) {
    throw new ApiError(
      503,
      `${runtime.provider === 'gemini' ? 'Gemini' : 'OpenAI'} server credential is not configured.`,
      'ai_provider_not_configured',
    );
  }

  const db = adminDb();
  const timestamp = now();
  const [prompt, model, activeModels] = await Promise.all([
    activePrompt(actor.orgId),
    activeModel(actor.orgId),
    db
      .collection(`organizations/${actor.orgId}/aiModelProfiles`)
      .where('status', '==', 'active')
      .get(),
  ]);

  const currentModelCredentialReady =
    model && model.provider !== 'demo'
      ? credentialConfiguredFor(model.provider)
      : false;

  const needsModel =
    !model ||
    model.provider === 'demo' ||
    !currentModelCredentialReady;

  if (prompt && !needsModel) {
    return getAiActivationReadiness(actor);
  }

  const batch = db.batch();
  let promptId = prompt?.id || null;
  let modelId = needsModel ? randomUUID() : model?.id || null;

  if (!prompt) {
    promptId = randomUUID();
    const promptDoc: AiPromptTemplate = {
      id: promptId,
      code: 'HR_COPILOT',
      name: 'OPSIQO governed contextual HR Copilot',
      version: 1,
      status: 'active',
      systemInstruction: BASELINE_PROMPT,
      prohibitedUses: [
        'Autonomous hiring, rejection or candidate ranking',
        'Autonomous termination, discipline or PIP decisions',
        'Autonomous promotion or succession decisions',
        'Autonomous compensation or accommodation decisions',
        'Direct AI writes to authoritative HCM records',
      ],
      createdBy: SYSTEM_CREATOR,
      createdAt: timestamp,
      updatedAt: timestamp,
      activatedBy: actor.uid,
      activatedAt: timestamp,
    };
    batch.create(
      db.doc(
        `organizations/${actor.orgId}/aiPromptTemplates/${promptId}`,
      ),
      promptDoc,
    );
  }

  if (needsModel) {
    for (const doc of activeModels.docs) {
      batch.set(
        doc.ref,
        { status: 'retired', updatedAt: timestamp },
        { merge: true },
      );
    }

    const modelDoc: AiModelProfile = {
      id: modelId!,
      code: 'HR_COPILOT_MODEL',
      provider: runtime.provider,
      model: runtime.model,
      purpose:
        'Governed contextual AI generation, explanation and evidence-grounded HR assistance across approved OPSIQO sections.',
      dataHandlingNote:
        'Permission-scoped OPSIQO evidence only. Credentials remain server-side. No autonomous consequential employment decisions or direct authoritative writes.',
      version: 1,
      status: 'active',
      createdBy: SYSTEM_CREATOR,
      createdAt: timestamp,
      updatedAt: timestamp,
      approvedBy: actor.uid,
      approvedAt: timestamp,
    };
    batch.create(
      db.doc(`organizations/${actor.orgId}/aiModelProfiles/${modelId}`),
      modelDoc,
    );
  }

  const audit = buildAudit(actor, {
    action: 'ai.bootstrap.initialize',
    entityType: 'aiConfiguration',
    entityId: `${actor.orgId}:h50.4`,
    after: {
      provider: runtime.provider,
      model: runtime.model,
      credentialConfigured: true,
      promptId,
      modelId,
      createdBy: SYSTEM_CREATOR,
      consequentialDecisionsBlocked: true,
      directWritesBlocked: true,
    },
  });
  batch.create(
    db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),
    audit,
  );

  await batch.commit();
  return getAiActivationReadiness(actor);
}
