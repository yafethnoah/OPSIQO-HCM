"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useCallback, useRef } from "react";
import { classifyRoute } from "./routeClassifier";
import type {
  PerformanceMetricPayload,
  WebMetricRating,
} from "./performanceTypes";

const ALLOWED_METRICS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

function validRating(value: unknown): value is WebMetricRating {
  return value === "good" || value === "needs-improvement" || value === "poor";
}

export function WebVitalsClient() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const report = useCallback((metric: {
    name: string;
    value: number;
    delta: number;
    rating?: string;
    navigationType?: string;
  }) => {
    if (process.env.NEXT_PUBLIC_OPSIQO_PERFORMANCE_TELEMETRY !== "true") return;
    if (!ALLOWED_METRICS.has(metric.name)) return;
    if (!Number.isFinite(metric.value) || !Number.isFinite(metric.delta)) return;

    const rating: WebMetricRating =
      validRating(metric.rating) ? metric.rating : "needs-improvement";

    const payload: PerformanceMetricPayload = {
      metricName: metric.name,
      value: metric.value,
      delta: metric.delta,
      rating,
      routeGroup: classifyRoute(pathnameRef.current || "/"),
      navigationType:
        typeof metric.navigationType === "string"
          ? metric.navigationType.slice(0, 32)
          : undefined,
      timestampUtc: new Date().toISOString(),
    };

    void fetch("/api/telemetry/performance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {
      // Performance telemetry must never break an HR workflow.
    });
  }, []);

  useReportWebVitals(report);
  return null;
}
