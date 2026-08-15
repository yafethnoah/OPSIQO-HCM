"use client";

import type { Analytics } from "firebase/analytics";
import { firebaseClientApp } from "../firebase/client";

let analyticsPromise: Promise<Analytics | null> | null = null;

function analyticsFeatureEnabled(): boolean {
  return process.env.NEXT_PUBLIC_OPSIQO_ANALYTICS_ENABLED === "true";
}

function consentGranted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("opsiqo.analytics.consent") === "granted";
}

export function setOpsiQoAnalyticsConsent(granted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    "opsiqo.analytics.consent",
    granted ? "granted" : "denied"
  );
}

export function hasOpsiQoAnalyticsConsent(): boolean {
  return analyticsFeatureEnabled() && consentGranted();
}

export async function getOpsiQoAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (!analyticsFeatureEnabled()) return null;
  if (!consentGranted()) return null;

  if (analyticsPromise) return analyticsPromise;

  analyticsPromise = (async () => {
    const { getAnalytics, isSupported, setAnalyticsCollectionEnabled } =
      await import("firebase/analytics");

    if (!(await isSupported())) return null;

    const analytics = getAnalytics(firebaseClientApp());
    setAnalyticsCollectionEnabled(analytics, true);
    return analytics;
  })().catch(() => null);

  return analyticsPromise;
}

export async function disableOpsiQoAnalyticsCollection(): Promise<void> {
  if (typeof window === "undefined") return;
  setOpsiQoAnalyticsConsent(false);

  try {
    const analytics = await analyticsPromise;
    if (!analytics) return;
    const { setAnalyticsCollectionEnabled } = await import("firebase/analytics");
    setAnalyticsCollectionEnabled(analytics, false);
  } finally {
    analyticsPromise = null;
  }
}
