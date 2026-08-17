import {
  ALLOWED_EVENT_NAMES,
  ALLOWED_PARAMETER_NAMES,
  MAX_PARAM_VALUE_LENGTH,
  OpsiQoAnalyticsEvent,
  VALUE_ALLOWLISTS,
} from "./eventCatalog";

export type AnalyticsPrimitive = string | number | boolean;
export type AnalyticsParams = Record<string, AnalyticsPrimitive | null | undefined>;

export type SanitizedEvent = {
  eventName: OpsiQoAnalyticsEvent;
  params: Record<string, string | number>;
};

const FORBIDDEN_KEY_FRAGMENTS = [
  "name", "email", "phone", "address", "employee_id", "employeeid",
  "candidate_id", "candidateid", "user_id", "userid", "uid",
  "person_id", "personid", "worker_id", "workerid",
  "salary", "compensation", "payroll", "dob", "birth",
  "medical", "diagnosis", "leave_reason", "reason_text",
  "prompt", "response_text", "message", "comment", "note",
  "resume", "contract", "document_text", "content", "free_text",
  "organization_name", "company_name"
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_RE = /^\+?[0-9][0-9\s().-]{6,}$/;
const URL_RE = /^https?:\/\//i;
const LONG_DIGIT_RE = /\d{7,}/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function looksSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return FORBIDDEN_KEY_FRAGMENTS.some(fragment => normalized.includes(fragment));
}

function normalizeBoolean(value: boolean): string {
  return value ? "true" : "false";
}

function sanitizeString(key: string, value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`Analytics parameter "${key}" cannot be blank.`);
  }

  if (trimmed.length > MAX_PARAM_VALUE_LENGTH) {
    throw new Error(`Analytics parameter "${key}" exceeds ${MAX_PARAM_VALUE_LENGTH} characters.`);
  }

  if (EMAIL_RE.test(trimmed)) {
    throw new Error(`Analytics parameter "${key}" looks like an email address.`);
  }

  if (PHONE_RE.test(trimmed)) {
    throw new Error(`Analytics parameter "${key}" looks like a phone number.`);
  }

  if (URL_RE.test(trimmed)) {
    throw new Error(`Analytics parameter "${key}" must not contain URLs.`);
  }

  if (UUID_RE.test(trimmed)) {
    throw new Error(`Analytics parameter "${key}" looks like a stable identifier.`);
  }

  if (LONG_DIGIT_RE.test(trimmed)) {
    throw new Error(`Analytics parameter "${key}" looks like a stable numeric identifier.`);
  }

  const allowlist = VALUE_ALLOWLISTS[key];
  if (allowlist && !allowlist.has(trimmed)) {
    throw new Error(`Analytics parameter "${key}" contains an unapproved value "${trimmed}".`);
  }

  // For non-enumerated parameters, only permit low-entropy machine labels.
  if (!allowlist && !/^[a-z0-9_:-]{1,64}$/i.test(trimmed)) {
    throw new Error(
      `Analytics parameter "${key}" must be a bounded machine label, not free text.`
    );
  }

  return trimmed;
}

export function sanitizeProductEvent(
  eventName: string,
  params: AnalyticsParams = {}
): SanitizedEvent {
  if (!ALLOWED_EVENT_NAMES.has(eventName as OpsiQoAnalyticsEvent)) {
    throw new Error(`Unapproved OPSIQO analytics event "${eventName}".`);
  }

  const safeParams: Record<string, string | number> = {};

  for (const [key, rawValue] of Object.entries(params)) {
    if (!ALLOWED_PARAMETER_NAMES.has(key)) {
      throw new Error(`Unapproved analytics parameter "${key}".`);
    }

    if (looksSensitiveKey(key)) {
      throw new Error(`Forbidden sensitive analytics parameter "${key}".`);
    }

    if (rawValue === null || rawValue === undefined) {
      continue;
    }

    if (typeof rawValue === "boolean") {
      const normalized = normalizeBoolean(rawValue);
      const allowlist = VALUE_ALLOWLISTS[key];
      if (allowlist && !allowlist.has(normalized)) {
        throw new Error(`Analytics parameter "${key}" contains an unapproved boolean value.`);
      }
      safeParams[key] = normalized;
      continue;
    }

    if (typeof rawValue === "number") {
      if (!Number.isFinite(rawValue)) {
        throw new Error(`Analytics parameter "${key}" contains a non-finite number.`);
      }
      // Raw HR numbers should not be sent. Numeric analytics parameters are only
      // permitted when explicitly represented as bounded analytics measures later.
      throw new Error(
        `Raw numeric analytics parameter "${key}" is not permitted; use an approved bucket.`
      );
    }

    safeParams[key] = sanitizeString(key, rawValue);
  }

  return {
    eventName: eventName as OpsiQoAnalyticsEvent,
    params: safeParams,
  };
}
