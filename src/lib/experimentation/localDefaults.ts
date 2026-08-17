import { FEATURE_FLAG_BY_KEY } from "./flagCatalog";

export function getLocalFeatureFlagDefault(key: string): boolean | string | number | null {
  return FEATURE_FLAG_BY_KEY.get(key)?.defaultValue ?? null;
}
