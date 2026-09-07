import type { ActorContext } from '@/domain/security';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';

export interface VoiceHrRequest {
  transcript: string;
  locale?: string;
}

export interface VoiceHrResponse {
  transcript: string;
  locale: string;
  responseText: string;
  href?: string;
  disposition:
    | 'read_only'
    | 'draft_only'
    | 'confirmation_required'
    | 'human_decision_required'
    | 'blocked';
  requiresConfirmation: boolean;
  requiresHumanDecision: boolean;
  directExecutionPerformed: false;
  retention: 'transcript_not_persisted_by_voice_runtime';
}

export function handleVoiceHrTranscript(
  actor: ActorContext,
  raw: VoiceHrRequest,
): VoiceHrResponse {
  const transcript = normalizeTranscript(raw.transcript);
  const locale = normalizeLocale(raw.locale);
  const command = routeOpsiQoCommand(actor, transcript);

  const requiresHumanDecision =
    command.requiresHumanDecision === true ||
    command.risk === 'consequential';

  let disposition: VoiceHrResponse['disposition'];

  if (command.mode === 'blocked') {
    disposition = requiresHumanDecision
      ? 'human_decision_required'
      : 'blocked';
  } else if (command.actionLevel === 'execute') {
    disposition = 'confirmation_required';
  } else if (command.actionLevel === 'prepare') {
    disposition = 'draft_only';
  } else {
    disposition = 'read_only';
  }

  return {
    transcript,
    locale,
    responseText: command.message,
    href: command.href,
    disposition,
    requiresConfirmation:
      command.actionLevel === 'execute' ||
      command.actionLevel === 'prepare' ||
      requiresHumanDecision,
    requiresHumanDecision,
    directExecutionPerformed: false,
    retention: 'transcript_not_persisted_by_voice_runtime',
  };
}

function normalizeTranscript(value: string): string {
  const transcript = value.trim().replace(/\s+/g, ' ');

  if (transcript.length < 2) {
    throw new Error('voice transcript is too short');
  }

  if (transcript.length > 2000) {
    throw new Error('voice transcript exceeds 2000 characters');
  }

  return transcript;
}

function normalizeLocale(value?: string): string {
  const locale = value?.trim() || 'en-CA';

  if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)) {
    throw new Error('voice locale is invalid');
  }

  return locale;
}
