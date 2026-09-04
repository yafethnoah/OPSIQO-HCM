import { FEATURE_FLAG_BY_KEY } from "./flagCatalog";
import { getLocalFeatureFlagDefault } from "./localDefaults";
import { readRemoteFeatureFlag } from "./remoteConfigAdapter";

export type FeatureFlagEvaluation = {
  key: string;
  known: boolean;
  value: boolean | string | number | null;
  source: "local_default" | "remote_config" | "unknown";
};

export async function evaluateFeatureFlag(
  key: string
): Promise<FeatureFlagEvaluation> {
  const definition = FEATURE_FLAG_BY_KEY.get(key);

  if (!definition) {
    return {
      key,
      known: false,
      value: null,
      source: "unknown",
    };
  }

  const local = getLocalFeatureFlagDefault(key);

  if (process.env.NEXT_PUBLIC_OPSIQO_REMOTE_CONFIG_ENABLED !== "true") {
    return {
      key,
      known: true,
      value: local,
      source: "local_default",
    };
  }

  const remote = await readRemoteFeatureFlag(key);

  return {
    key,
    known: true,
    value: remote ?? local,
    source: remote === null ? "local_default" : "remote_config",
  };
}
