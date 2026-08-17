"use client";

import {
  fetchAndActivate,
  getRemoteConfig,
  getValue,
  isSupported,
} from "firebase/remote-config";
import { firebaseClientApp } from "../firebase/client";
import { FEATURE_FLAG_BY_KEY } from "./flagCatalog";
import { getLocalFeatureFlagDefault } from "./localDefaults";

let initialized = false;

export async function initializeOpsiQoRemoteConfig(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_OPSIQO_REMOTE_CONFIG_ENABLED !== "true") return false;

  if (!(await isSupported())) return false;

  const app = firebaseClientApp();
  const remoteConfig = getRemoteConfig(app);

  remoteConfig.settings.minimumFetchIntervalMillis =
    process.env.NODE_ENV === "development" ? 60_000 : 3_600_000;
  remoteConfig.settings.fetchTimeoutMillis = 5_000;

  const defaults: Record<string, string | number | boolean> = {};
  for (const definition of FEATURE_FLAG_BY_KEY.values()) {
    defaults[definition.key] = definition.defaultValue;
  }
  remoteConfig.defaultConfig = defaults;

  try {
    await fetchAndActivate(remoteConfig);
    initialized = true;
    return true;
  } catch {
    initialized = true;
    return false;
  }
}

export async function readRemoteFeatureFlag(
  key: string
): Promise<boolean | string | number | null> {
  const definition = FEATURE_FLAG_BY_KEY.get(key);
  if (!definition) return null;

  const fallback = getLocalFeatureFlagDefault(key);
  if (typeof window === "undefined") return fallback;

  if (!initialized) {
    await initializeOpsiQoRemoteConfig();
  }

  const app = firebaseClientApp();

  try {
    const remoteConfig = getRemoteConfig(app);
    const value = getValue(remoteConfig, key);

    if (typeof definition.defaultValue === "boolean") return value.asBoolean();
    if (typeof definition.defaultValue === "number") return value.asNumber();
    return value.asString();
  } catch {
    return fallback;
  }
}
