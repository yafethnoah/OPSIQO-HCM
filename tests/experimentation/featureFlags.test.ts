import { describe, expect, it } from "vitest";
import {
  FEATURE_FLAG_BY_KEY,
  OPSIQO_FEATURE_FLAGS,
} from "../../src/lib/experimentation/flagCatalog";
import { getLocalFeatureFlagDefault } from "../../src/lib/experimentation/localDefaults";

describe("feature flags", () => {
  it("uses OPSIQO experiment namespace", () => {
    for (const flag of Object.values(OPSIQO_FEATURE_FLAGS)) {
      expect(flag.key.startsWith("opsiqo_exp_")).toBe(true);
    }
  });

  it("defaults all initial experimental features off", () => {
    for (const flag of Object.values(OPSIQO_FEATURE_FLAGS)) {
      expect(flag.defaultValue).toBe(false);
    }
  });

  it("unknown flags fail closed to null", () => {
    expect(getLocalFeatureFlagDefault("unknown_flag")).toBeNull();
  });

  it("catalog has no duplicate keys", () => {
    const keys = Object.values(OPSIQO_FEATURE_FLAGS).map(v => v.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(FEATURE_FLAG_BY_KEY.size).toBe(keys.length);
  });
});
