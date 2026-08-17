import type {
  EvidenceItem,
  RetentionDecision,
  RetentionRule,
} from "./types";

export function evaluateRetention(input: {
  item: EvidenceItem;
  rule?: RetentionRule;
  now: Date;
}): RetentionDecision {
  if (input.item.legalHoldState === "active") {
    return {
      eligibleForDisposition: false,
      mustPreserve: true,
      reason: "LEGAL_HOLD_ACTIVE",
    };
  }

  if (!input.rule?.approved) {
    return {
      eligibleForDisposition: false,
      mustPreserve: true,
      reason: "RETENTION_RULE_NOT_APPROVED",
    };
  }

  const retentionUntil =
    input.item.retentionUntilUtc &&
    Date.parse(input.item.retentionUntilUtc);

  if (!retentionUntil || !Number.isFinite(retentionUntil)) {
    return {
      eligibleForDisposition: false,
      mustPreserve: true,
      reason: "RETENTION_DATE_UNKNOWN",
    };
  }

  if (input.now.getTime() < retentionUntil) {
    return {
      eligibleForDisposition: false,
      mustPreserve: true,
      reason: "RETENTION_NOT_REACHED",
    };
  }

  if (input.rule.disposition === "delete_if_permitted") {
    return {
      eligibleForDisposition: true,
      mustPreserve: false,
      reason: "RETENTION_REACHED_DELETE_IF_PERMITTED",
    };
  }

  if (input.rule.disposition === "archive") {
    return {
      eligibleForDisposition: true,
      mustPreserve: true,
      reason: "RETENTION_REACHED_ARCHIVE",
    };
  }

  return {
    eligibleForDisposition: true,
    mustPreserve: true,
    reason: "RETENTION_REACHED_REVIEW",
  };
}
