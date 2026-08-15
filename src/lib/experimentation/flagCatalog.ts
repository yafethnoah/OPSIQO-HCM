import type { FeatureFlagDefinition } from "./types";

export const OPSIQO_FEATURE_FLAGS = {
  HOME_CARD_ORDER_V2: {
    key: "opsiqo_exp_home_card_order_v2",
    description: "Alternative Home/SuperApp card ordering.",
    domain: "dashboard_layout",
    defaultValue: false,
    mode: "rollout_only",
    owner: "product",
    expiresOn: "2026-12-31",
    killSwitch: true,
  },
  AI_PROGRESS_V2: {
    key: "opsiqo_exp_ai_progress_v2",
    description: "Improved non-consequential AI progress presentation.",
    domain: "progress_visualization",
    defaultValue: false,
    mode: "rollout_only",
    owner: "product",
    expiresOn: "2026-12-31",
    killSwitch: true,
  },
  GANTT_DENSITY_V2: {
    key: "opsiqo_exp_gantt_density_v2",
    description: "Alternative Gantt visual density and default zoom.",
    domain: "gantt_presentation",
    defaultValue: false,
    mode: "rollout_only",
    owner: "product",
    expiresOn: "2026-12-31",
    killSwitch: true,
  },
  SEARCH_PRESENTATION_V2: {
    key: "opsiqo_exp_search_presentation_v2",
    description: "Alternative non-sensitive search result presentation.",
    domain: "search_presentation",
    defaultValue: false,
    mode: "rollout_only",
    owner: "product",
    expiresOn: "2026-12-31",
    killSwitch: true,
  },
} as const satisfies Record<string, FeatureFlagDefinition>;

export type OpsiQoFeatureFlagKey =
  typeof OPSIQO_FEATURE_FLAGS[keyof typeof OPSIQO_FEATURE_FLAGS]["key"];

export const FEATURE_FLAG_BY_KEY: ReadonlyMap<string, FeatureFlagDefinition> =
  new Map<string, FeatureFlagDefinition>(
    Object.values(OPSIQO_FEATURE_FLAGS).map(definition => [
      definition.key,
      definition,
    ])
  );
