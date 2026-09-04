import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_METRICS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);
const ALLOWED_RATINGS = new Set(["good", "needs-improvement", "poor"]);
const ALLOWED_ROUTE_GROUPS = new Set([
  "home",
  "core_hr",
  "leave",
  "recruiting",
  "onboarding",
  "documents",
  "imports",
  "studio",
  "analytics",
  "admin",
  "other",
]);

function isSafeLabel(value: unknown, max = 32): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= max &&
    /^[a-z0-9_:-]+$/i.test(value)
  );
}

export async function POST(request: NextRequest) {
  if (process.env.OPSIQO_PERFORMANCE_TELEMETRY_ENABLED !== "true") {
    return NextResponse.json({ accepted: false }, { status: 204 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !ALLOWED_METRICS.has(body.metricName) ||
    !Number.isFinite(body.value) ||
    body.value < 0 ||
    !Number.isFinite(body.delta) ||
    !ALLOWED_RATINGS.has(body.rating) ||
    !ALLOWED_ROUTE_GROUPS.has(body.routeGroup) ||
    !isSafeLabel(body.navigationType ?? "navigate") ||
    typeof body.timestampUtc !== "string" ||
    body.timestampUtc.length > 40
  ) {
    return NextResponse.json({ error: "invalid_metric_payload" }, { status: 400 });
  }

  const record = {
    type: "opsiqo.performance.web_vital",
    metricName: body.metricName,
    value: body.value,
    delta: body.delta,
    rating: body.rating,
    routeGroup: body.routeGroup,
    navigationType: body.navigationType ?? "unknown",
    timestampUtc: body.timestampUtc,
    receivedAtUtc: new Date().toISOString(),
  };

  // Structured stdout is intended for the platform logging pipeline.
  // Never add request headers, user IDs, query strings or HR content here.
  console.info(JSON.stringify(record));

  return NextResponse.json({ accepted: true }, { status: 202 });
}
