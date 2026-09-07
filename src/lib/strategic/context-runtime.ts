import type { ActorContext } from '@/domain/security';
import type { OrchestratorDependencies, StepReceipt } from '@/lib/orchestrator/types';
import type { OrchestratorRunResult } from '@/lib/orchestrator/engine';
import { retrieveOrganizationalMemoryEvidence } from '@/lib/opsiqo-one/organizational-memory';
import {
  StrategicGovernedOrchestratorBridge,
  type StrategicOrchestrationRunInput,
} from './orchestrator-bridge';
import {
  assertCanonicalObject,
  type EnterpriseObject,
} from './enterprise-object-graph';
import {
  validateKnowledgeAssertion,
  type KnowledgeAssertion,
} from './knowledge-graph';
import type { EvidenceRef } from './types';

export interface StrategicGraphProjection {
  objects: EnterpriseObject<Record<string, unknown>>[];
  unsupportedReferences: string[];
  sourceReceiptCount: number;
}

export interface OperationalKnowledgeEvidence {
  id: string;
  kind: string;
  title: string;
  summary: string;
  source: string;
  asOf: string;
  href?: string;
}

export type OperationalKnowledgeRetriever = (
  actor: ActorContext,
  question: string,
) => Promise<OperationalKnowledgeEvidence[]>;

const resultObjectTypes: Readonly<Record<string, string>> = {
  worker: 'worker',
  requisition: 'requisition',
  onboardingCase: 'onboarding_case',
  leaveRequest: 'leave_request',
  timeEntry: 'time_entry',
  payrollExport: 'payroll_export',
  workflowRun: 'workflow_run',
  compensationRecommendation: 'compensation_recommendation',
  performanceReview: 'performance_review',
  performancePip: 'performance_pip',
  successionNomination: 'succession_nomination',
  separationCase: 'separation_case',
  employeeRelationsFinding: 'employee_relations_finding',
  learningAssignment: 'learning_assignment',
  workforceScenario: 'workforce_scenario',
  regulatoryLegalReview: 'regulatory_legal_review',
};

export const productionOperationalKnowledgeRetriever: OperationalKnowledgeRetriever =
  async (actor, question) => {
    const evidence = await retrieveOrganizationalMemoryEvidence(actor, question);
    return evidence.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      summary: item.summary,
      source: item.source,
      asOf: item.asOf,
      href: item.href,
    }));
  };

export function projectOrchestratorResultToObjectGraph(input: {
  organizationId: string;
  actorUid: string;
  result: OrchestratorRunResult;
}): StrategicGraphProjection {
  if (input.result.plan.organizationId !== input.organizationId) {
    throw new Error('orchestration result organization does not match graph scope');
  }

  const objects: EnterpriseObject<Record<string, unknown>>[] = [];
  const unsupportedReferences: string[] = [];

  for (const receipt of input.result.receipts) {
    if (receipt.status !== 'completed' || !receipt.resultReference?.trim()) {
      continue;
    }

    const parsed = parseResultReference(receipt.resultReference);
    if (!parsed) {
      unsupportedReferences.push(receipt.resultReference);
      continue;
    }

    const objectType = resultObjectTypes[parsed.prefix];
    if (!objectType) {
      unsupportedReferences.push(receipt.resultReference);
      continue;
    }

    const evidenceRefs = receiptEvidence(receipt);
    const meta = {
      objectId: parsed.id,
      orgId: input.organizationId,
      objectType,
      lifecycleStatus: 'active' as const,
      effectiveFrom: receipt.executedAtUtc,
      effectiveTo: null,
      version: 1,
      etag:
        receipt.idempotencyKeyHash ??
        `${receipt.planId}:${receipt.stepId}:${receipt.executedAtUtc}`,
      schemaVersion: 1,
      evidenceRefs,
      createdAt: receipt.executedAtUtc,
      createdBy: {
        actorType: 'user' as const,
        actorId: input.actorUid,
      },
      updatedAt: receipt.executedAtUtc,
      updatedBy: {
        actorType: 'user' as const,
        actorId: input.actorUid,
      },
    };

    assertCanonicalObject(meta);

    objects.push({
      meta,
      data: {
        resultReference: receipt.resultReference,
        authoritativeService: receipt.serviceKey,
        orchestrationPlanId: receipt.planId,
        orchestrationStepId: receipt.stepId,
        auditReference: receipt.auditReference ?? null,
        messageCode: receipt.messageCode ?? null,
      },
    });
  }

  return {
    objects,
    unsupportedReferences,
    sourceReceiptCount: input.result.receipts.length,
  };
}

export async function queryOperationalKnowledge(
  actor: ActorContext,
  question: string,
  retriever: OperationalKnowledgeRetriever = productionOperationalKnowledgeRetriever,
): Promise<KnowledgeAssertion[]> {
  const normalized = question.trim();

  if (normalized.length < 3) {
    throw new Error('knowledge query must contain at least 3 characters');
  }

  const evidence = await retriever(actor, normalized);

  return evidence.map((item, index) => {
    const evidenceRef: EvidenceRef = {
      id: item.id,
      sourceType: item.kind || 'operational',
      sourceId: item.source,
      observedAt: item.asOf,
      uri: item.href,
    };

    const assertion: KnowledgeAssertion = {
      assertionId: `operational:${item.id}:${index + 1}`,
      orgId: actor.orgId,
      subjectObjectId: `organization:${actor.orgId}`,
      predicate: 'has_operational_evidence',
      objectValue: `${item.title}: ${item.summary}`,
      confidence: 1,
      evidenceRefs: [evidenceRef],
      validFrom: item.asOf,
      validTo: null,
      source: 'derived',
    };

    validateKnowledgeAssertion(assertion);
    return assertion;
  });
}

export class StrategicContextRuntime {
  private readonly bridge: StrategicGovernedOrchestratorBridge;

  constructor(
    dependencies: OrchestratorDependencies,
    private readonly knowledgeRetriever: OperationalKnowledgeRetriever =
      productionOperationalKnowledgeRetriever,
  ) {
    this.bridge = new StrategicGovernedOrchestratorBridge(dependencies);
  }

  async executeWithGraph(
    input: StrategicOrchestrationRunInput,
  ): Promise<{
    execution: OrchestratorRunResult;
    graph: StrategicGraphProjection;
  }> {
    const execution = await this.bridge.run(input);
    const graph = projectOrchestratorResultToObjectGraph({
      organizationId: input.plan.orgId,
      actorUid: input.actor.uid,
      result: execution,
    });

    return { execution, graph };
  }

  async queryKnowledge(
    actor: ActorContext,
    question: string,
  ): Promise<KnowledgeAssertion[]> {
    return queryOperationalKnowledge(actor, question, this.knowledgeRetriever);
  }
}

function parseResultReference(
  value: string,
): { prefix: string; id: string } | null {
  const at = value.indexOf(':');
  if (at <= 0 || at === value.length - 1) return null;

  const prefix = value.slice(0, at).trim();
  const id = value.slice(at + 1).trim();

  return prefix && id ? { prefix, id } : null;
}

function receiptEvidence(receipt: StepReceipt): EvidenceRef[] {
  const refs: EvidenceRef[] = [];

  if (receipt.auditReference?.trim()) {
    refs.push({
      id: `audit:${receipt.auditReference}`,
      sourceType: 'audit',
      sourceId: receipt.auditReference,
      observedAt: receipt.executedAtUtc,
    });
  }

  refs.push({
    id: `orchestration:${receipt.planId}:${receipt.stepId}`,
    sourceType: 'orchestration_receipt',
    sourceId: receipt.stepId,
    observedAt: receipt.executedAtUtc,
  });

  return refs;
}
