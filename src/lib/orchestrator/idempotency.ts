function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildIdempotencyKey(input: {
  organizationId: string;
  planId: string;
  stepId: string;
  planVersion: number;
}): string {
  const raw = [
    "opsiqo",
    "orchestrator",
    input.organizationId,
    input.planId,
    input.stepId,
    String(input.planVersion),
  ].join(":");

  return `opsiqo-orch-${fnv1a(raw)}`;
}

export function hashIdempotencyKey(key: string): string {
  return fnv1a(`receipt:${key}`);
}
