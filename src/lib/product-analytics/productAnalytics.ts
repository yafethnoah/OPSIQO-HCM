"use client";

import { logEvent } from "firebase/analytics";
import { getOpsiQoAnalytics } from "./firebaseAdapter";
import {
  AnalyticsParams,
  sanitizeProductEvent,
} from "./privacyGuard";

export type AnalyticsDiagnostic = {
  accepted: boolean;
  eventName: string;
  reason?: string;
};

type DiagnosticListener = (diagnostic: AnalyticsDiagnostic) => void;

const listeners = new Set<DiagnosticListener>();

export function subscribeAnalyticsDiagnostics(
  listener: DiagnosticListener
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(diagnostic: AnalyticsDiagnostic): void {
  for (const listener of listeners) {
    try {
      listener(diagnostic);
    } catch {
      // Diagnostics must never break product workflows.
    }
  }
}

export async function trackProductEvent(
  eventName: string,
  params: AnalyticsParams = {}
): Promise<AnalyticsDiagnostic> {
  let sanitized;
  try {
    sanitized = sanitizeProductEvent(eventName, params);
  } catch (error) {
    const diagnostic = {
      accepted: false,
      eventName,
      reason: error instanceof Error ? error.message : "Analytics event rejected.",
    };
    publish(diagnostic);
    return diagnostic;
  }

  const analytics = await getOpsiQoAnalytics();
  if (!analytics) {
    const diagnostic = {
      accepted: false,
      eventName: sanitized.eventName,
      reason: "Analytics disabled, unsupported, uninitialized, or not consented.",
    };
    publish(diagnostic);
    return diagnostic;
  }

  try {
    logEvent(analytics, sanitized.eventName, sanitized.params);
    const diagnostic = {
      accepted: true,
      eventName: sanitized.eventName,
    };
    publish(diagnostic);
    return diagnostic;
  } catch (error) {
    const diagnostic = {
      accepted: false,
      eventName: sanitized.eventName,
      reason: error instanceof Error ? error.message : "Analytics transport failed.",
    };
    publish(diagnostic);
    return diagnostic;
  }
}
