import type { EvidenceRef, ExplainableOutput } from './types';

export interface KnowledgeAssertion {
  assertionId: string;
  orgId: string;
  subjectObjectId: string;
  predicate: string;
  objectValue: string;
  confidence: number;
  evidenceRefs: EvidenceRef[];
  validFrom: string;
  validTo?: string | null;
  source: 'authoritative' | 'derived' | 'human' | 'ai';
}

export function validateKnowledgeAssertion(
  assertion: KnowledgeAssertion,
): void {
  if (!assertion.assertionId.trim()) throw new Error('assertionId is required');
  if (!assertion.orgId.trim()) throw new Error('orgId is required');
  if (!assertion.subjectObjectId.trim()) {
    throw new Error('subjectObjectId is required');
  }
  if (!assertion.predicate.trim()) throw new Error('predicate is required');
  if (assertion.confidence < 0 || assertion.confidence > 1) {
    throw new Error('confidence must be between 0 and 1');
  }
  if (assertion.source !== 'authoritative' && assertion.evidenceRefs.length === 0) {
    throw new Error('non-authoritative assertions require evidence');
  }
}

export function materialAiOutput<T>(
  output: ExplainableOutput<T>,
  minimumEvidence = 1,
): ExplainableOutput<T> {
  if (output.confidence < 0 || output.confidence > 1) {
    throw new Error('AI confidence must be between 0 and 1');
  }
  if (output.evidenceRefs.length < minimumEvidence) {
    throw new Error('material AI output requires evidence');
  }
  if (output.assumptions.length === 0) {
    throw new Error('material AI output must declare assumptions');
  }
  if (output.limitations.length === 0) {
    throw new Error('material AI output must declare limitations');
  }
  return output;
}
